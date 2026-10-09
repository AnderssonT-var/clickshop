<?php
declare(strict_types=1);

function lumina_current_user(PDO $pdo): ?array
{
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) {
        return null;
    }
    $statement = $pdo->prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1');
    $statement->execute([(int) $id]);
    $user = $statement->fetch();
    if (!$user || !(int) $user['is_active']) {
        unset($_SESSION['user_id'], $_SESSION['csrf_token']);
        return null;
    }
    return $user;
}

function lumina_require_admin(PDO $pdo): array
{
    $user = lumina_current_user($pdo);
    if (!$user || !in_array($user['role'], ['owner', 'admin', 'editor'], true)) {
        lumina_error('Necesitas iniciar sesión para continuar.', 401);
    }
    return $user;
}

function lumina_throttle(PDO $pdo, string $scope, string $key, int $limit = 5, int $minutes = 15): bool
{
    $statement = $pdo->prepare('SELECT attempts, window_started_at, blocked_until FROM rate_limits WHERE scope = ? AND rate_key = ? LIMIT 1');
    $statement->execute([$scope, $key]);
    $row = $statement->fetch();
    if (!$row) {
        return true;
    }
    if ($row['blocked_until'] && strtotime($row['blocked_until']) > time()) {
        return false;
    }
    if (strtotime($row['window_started_at']) < time() - ($minutes * 60)) {
        $reset = $pdo->prepare('UPDATE rate_limits SET attempts = 0, window_started_at = UTC_TIMESTAMP(), blocked_until = NULL WHERE scope = ? AND rate_key = ?');
        $reset->execute([$scope, $key]);
        return true;
    }
    return (int) $row['attempts'] < $limit;
}

function lumina_throttle_failure(PDO $pdo, string $scope, string $key, int $limit = 5): void
{
    if (lumina_db_driver() === 'sqlite') {
        $statement = $pdo->prepare("INSERT INTO rate_limits (scope, rate_key, attempts, window_started_at, blocked_until) VALUES (?, ?, 1, UTC_TIMESTAMP(), NULL) ON CONFLICT(scope, rate_key) DO UPDATE SET blocked_until = CASE WHEN rate_limits.attempts + 1 >= ? THEN datetime('now', '+15 minutes') ELSE NULL END, attempts = rate_limits.attempts + 1, updated_at = UTC_TIMESTAMP()");
        $statement->execute([$scope, $key, $limit]);
        return;
    }
    // MySQL evaluates assignments from left to right. Check the current value first,
    // then increment, so a limit of five allows exactly five attempts.
    $statement = $pdo->prepare('INSERT INTO rate_limits (scope, rate_key, attempts, window_started_at, blocked_until) VALUES (?, ?, 1, UTC_TIMESTAMP(), NULL) ON DUPLICATE KEY UPDATE blocked_until = IF(attempts + 1 >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), NULL), attempts = attempts + 1');
    $statement->execute([$scope, $key, $limit]);
}

function lumina_throttle_clear(PDO $pdo, string $scope, string $key): void
{
    $statement = $pdo->prepare('DELETE FROM rate_limits WHERE scope = ? AND rate_key = ?');
    $statement->execute([$scope, $key]);
}

function lumina_login(PDO $pdo, string $email, string $password): array
{
    $email = mb_strtolower(lumina_clean_string($email, 190));
    $key = hash('sha256', 'login|' . lumina_client_key('login') . '|' . $email);
    if (!lumina_throttle($pdo, 'login', $key)) {
        lumina_error('Demasiados intentos. Intenta de nuevo en unos minutos.', 429);
    }
    $statement = $pdo->prepare('SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $user = $statement->fetch();
    if (!$user || !(int) $user['is_active'] || !password_verify($password, $user['password_hash'])) {
        lumina_throttle_failure($pdo, 'login', $key);
        lumina_error('El correo o la contraseña no coinciden.', 422);
    }
    lumina_throttle_clear($pdo, 'login', $key);
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $pdo->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?')->execute([(int) $user['id']]);
    unset($user['password_hash']);
    return $user;
}

/**
 * Updates only the account that owns the active session. Credentials require
 * proof of the current password; profile-name changes do not.
 */
function lumina_update_current_user(PDO $pdo, array $user, array $data): array
{
    $id = (int) ($user['id'] ?? 0);
    if ($id < 1) {
        throw new RuntimeException('No fue posible identificar la cuenta activa.');
    }

    $name = lumina_clean_string($data['name'] ?? $user['name'] ?? '', 120);
    $email = mb_strtolower(lumina_clean_string($data['email'] ?? $user['email'] ?? '', 190));
    $currentPassword = (string) ($data['current_password'] ?? '');
    $newPassword = (string) ($data['new_password'] ?? '');
    $confirmation = (string) ($data['new_password_confirmation'] ?? '');

    if (mb_strlen($name) < 2) {
        throw new InvalidArgumentException('El nombre de administrador debe tener al menos 2 caracteres.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('El correo para iniciar sesión no es válido.');
    }
    if ($newPassword === '' && $confirmation !== '') {
        throw new InvalidArgumentException('Escribe la nueva contraseña antes de confirmarla.');
    }
    if ($newPassword !== '') {
        if (mb_strlen($newPassword) < 12) {
            throw new InvalidArgumentException('La nueva contraseña debe tener al menos 12 caracteres.');
        }
        if (mb_strlen($newPassword) > 512) {
            throw new InvalidArgumentException('La nueva contraseña es demasiado larga.');
        }
        if (!hash_equals($newPassword, $confirmation)) {
            throw new InvalidArgumentException('La nueva contraseña y su confirmación no coinciden.');
        }
    }

    $emailChanged = $email !== mb_strtolower((string) ($user['email'] ?? ''));
    $credentialsChanged = $emailChanged || $newPassword !== '';
    if ($credentialsChanged) {
        if ($currentPassword === '') {
            throw new InvalidArgumentException('Escribe tu contraseña actual para modificar los datos de acceso.');
        }
        $current = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
        $current->execute([$id]);
        $hash = (string) $current->fetchColumn();
        if ($hash === '' || !password_verify($currentPassword, $hash)) {
            throw new InvalidArgumentException('La contraseña actual no coincide.');
        }
    }

    if ($emailChanged) {
        $existing = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $existing->execute([$email, $id]);
        if ($existing->fetchColumn()) {
            throw new InvalidArgumentException('Ya existe otra cuenta con ese correo.');
        }
    }

    $fields = ['name = ?', 'email = ?'];
    $values = [$name, $email];
    if ($newPassword !== '') {
        $fields[] = 'password_hash = ?';
        $values[] = password_hash($newPassword, PASSWORD_DEFAULT);
    }
    $values[] = $id;
    $statement = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = ?');
    $statement->execute($values);

    lumina_record_activity($pdo, $id, 'updated', 'user', $id, 'Cuenta de administración actualizada');
    session_regenerate_id(true);
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    $updated = lumina_current_user($pdo);
    if (!$updated) {
        throw new RuntimeException('No fue posible renovar la sesión de la cuenta.');
    }
    return $updated;
}

function lumina_logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}
