<?php
declare(strict_types=1);

/*
 * Creates or refreshes the first owner account from a private CLI session.
 * It is intentionally not reachable through the web server.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script solo puede ejecutarse desde la línea de comandos.\n");
    exit(1);
}

require dirname(__DIR__) . '/app/bootstrap.php';

/** @return never */
function lumina_admin_setup_fail(string $message, int $exitCode = 1): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit($exitCode);
}

function lumina_admin_setup_is_interactive(): bool
{
    if (function_exists('stream_isatty')) {
        return stream_isatty(STDIN);
    }
    if (function_exists('posix_isatty')) {
        return posix_isatty(STDIN);
    }
    return true;
}

function lumina_admin_setup_prompt(string $label): string
{
    if (!lumina_admin_setup_is_interactive()) {
        lumina_admin_setup_fail('Falta un dato y no hay una terminal interactiva. Usa --help para ver las opciones.');
    }
    fwrite(STDOUT, $label);
    $value = fgets(STDIN);
    if ($value === false) {
        lumina_admin_setup_fail('No fue posible leer la entrada.');
    }
    return trim($value);
}

function lumina_admin_setup_hidden_password(): string
{
    if (!lumina_admin_setup_is_interactive()) {
        lumina_admin_setup_fail('Falta la contraseña y no hay una terminal interactiva.');
    }
    if (PHP_OS_FAMILY === 'Windows') {
        lumina_admin_setup_fail('Para no mostrar la contraseña en Windows, ejecuta este comando desde una terminal compatible con entrada oculta.');
    }

    $sttyState = trim((string) shell_exec('stty -g 2>/dev/null'));
    if ($sttyState === '') {
        lumina_admin_setup_fail('No fue posible activar la entrada oculta para la contraseña.');
    }

    fwrite(STDOUT, 'Contraseña (mínimo 12 caracteres): ');
    shell_exec('stty -echo');
    try {
        $password = fgets(STDIN);
    } finally {
        shell_exec('stty ' . escapeshellarg($sttyState));
        fwrite(STDOUT, PHP_EOL);
    }
    if ($password === false) {
        lumina_admin_setup_fail('No fue posible leer la contraseña.');
    }
    return rtrim($password, "\r\n");
}

function lumina_admin_setup_usage(): void
{
    $usage = <<<TXT
Uso:
  php scripts/create-admin.php
  php scripts/create-admin.php --email=correo@dominio.tld --name="Nombre"

El comando solicita de forma oculta cualquier dato faltante. También admite
--password para automatizaciones seguras, pero no se recomienda usar ese
argumento en una terminal compartida ni guardarlo en el historial.
TXT;
    fwrite(STDOUT, $usage . PHP_EOL);
}

$options = getopt('', ['email:', 'name:', 'password:', 'help']);
if (array_key_exists('help', $options)) {
    lumina_admin_setup_usage();
    exit(0);
}

$email = isset($options['email']) ? trim((string) $options['email']) : lumina_admin_setup_prompt('Correo del propietario: ');
$name = isset($options['name']) ? trim((string) $options['name']) : lumina_admin_setup_prompt('Nombre del propietario: ');
$password = isset($options['password']) ? (string) $options['password'] : lumina_admin_setup_hidden_password();

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    lumina_admin_setup_fail('El correo no es válido.');
}
if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
    lumina_admin_setup_fail('El nombre debe tener entre 2 y 120 caracteres.');
}
if (mb_strlen($password) < 12) {
    lumina_admin_setup_fail('La contraseña debe tener al menos 12 caracteres.');
}

try {
    $pdo = lumina_db();
    $pdo->beginTransaction();

    $existing = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE');
    $existing->execute([mb_strtolower($email)]);
    $user = $existing->fetch();
    $hash = password_hash($password, PASSWORD_DEFAULT);

    if ($user) {
        $update = $pdo->prepare('UPDATE users SET name = ?, password_hash = ?, role = ?, is_active = 1, updated_at = UTC_TIMESTAMP() WHERE id = ?');
        $update->execute([$name, $hash, 'owner', (int) $user['id']]);
        $userId = (int) $user['id'];
        $action = 'actualizada';
    } else {
        $insert = $pdo->prepare('INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
        $insert->execute([$name, mb_strtolower($email), $hash, 'owner']);
        $userId = (int) $pdo->lastInsertId();
        $action = 'creada';
    }

    $pdo->commit();
    fwrite(STDOUT, "Cuenta propietaria {$action} para {$email} (ID {$userId}).\n");
    fwrite(STDOUT, "Ya puedes iniciar sesión en /admin.\n");
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "No se pudo crear la cuenta. Revisa la conexión de base de datos, el esquema y los permisos.\n");
    exit(1);
}
