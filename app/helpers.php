<?php
declare(strict_types=1);

function lumina_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function lumina_error(string $message, int $status = 400, array $details = []): never
{
    lumina_json(['ok' => false, 'error' => $message, 'details' => $details], $status);
}

function lumina_request_data(): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_contains($contentType, 'application/json')) {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($data)) {
            lumina_error('El cuerpo de la solicitud debe ser un objeto JSON.', 422);
        }
        return $data;
    }
    return $_POST;
}

function lumina_require_method(string ...$methods): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        lumina_error('Método no permitido.', 405);
    }
}

function lumina_clean_string(mixed $value, int $maxLength = 255): string
{
    $value = trim((string) $value);
    return mb_substr($value, 0, $maxLength);
}

function lumina_slug(string $value): string
{
    // iconv transliteration can vary with the host locale. Normalize the
    // common Spanish characters first so product and category URLs stay stable.
    $value = strtr($value, [
        'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a',
        'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e',
        'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o',
        'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u',
        'ñ' => 'n', 'ç' => 'c',
        'Á' => 'A', 'À' => 'A', 'Ä' => 'A', 'Â' => 'A',
        'É' => 'E', 'È' => 'E', 'Ë' => 'E', 'Ê' => 'E',
        'Í' => 'I', 'Ì' => 'I', 'Ï' => 'I', 'Î' => 'I',
        'Ó' => 'O', 'Ò' => 'O', 'Ö' => 'O', 'Ô' => 'O',
        'Ú' => 'U', 'Ù' => 'U', 'Ü' => 'U', 'Û' => 'U',
        'Ñ' => 'N', 'Ç' => 'C',
    ]);
    $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?: '';
    return trim($value, '-');
}

function lumina_bool(mixed $value): int
{
    return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
}

function lumina_decimal(mixed $value, float $min = 0): float
{
    if (!is_numeric($value) || (float) $value < $min) {
        throw new InvalidArgumentException('Valor numérico inválido.');
    }
    return round((float) $value, 2);
}

function lumina_int(mixed $value, int $min = 0): int
{
    if (filter_var($value, FILTER_VALIDATE_INT) === false || (int) $value < $min) {
        throw new InvalidArgumentException('Valor entero inválido.');
    }
    return (int) $value;
}

function lumina_optional_date(mixed $value, bool $endOfDay = false): ?string
{
    $value = lumina_clean_string($value, 20);
    if ($value === '') {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) || $date->format('Y-m-d') !== $value) {
        throw new InvalidArgumentException('La fecha indicada no es válida.');
    }
    return $date->format('Y-m-d') . ($endOfDay ? ' 23:59:59' : ' 00:00:00');
}

function lumina_url_or_anchor(mixed $value): string
{
    $value = lumina_clean_string($value, 500);
    if ($value === '') {
        return '';
    }
    if (str_starts_with($value, '#')) {
        return $value;
    }
    if (!filter_var($value, FILTER_VALIDATE_URL) || !str_starts_with(strtolower($value), 'https://')) {
        throw new InvalidArgumentException('El enlace debe ser interno o usar HTTPS.');
    }
    return $value;
}

function lumina_public_path(?string $relativePath): string
{
    if (!$relativePath) {
        return '';
    }
    $base = (string) lumina_config('url');
    $relativePath = ltrim($relativePath, '/');
    // Uploaded images carry their modification time so browsers fetch a replaced file right away.
    if (str_starts_with($relativePath, 'uploads/') && !str_contains($relativePath, '?')) {
        $file = dirname(__DIR__) . '/public_html/' . $relativePath;
        $mtime = is_file($file) ? @filemtime($file) : false;
        if ($mtime) {
            $relativePath .= '?v=' . $mtime;
        }
    }
    return ($base !== '' ? $base . '/' : '') . $relativePath;
}

function lumina_csrf_token(): string
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf_token'];
}

function lumina_require_csrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        lumina_error('La sesión de seguridad expiró. Actualiza la página e inténtalo de nuevo.', 419);
    }
}

function lumina_client_key(string $scope): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $agent = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    return hash('sha256', $scope . '|' . $ip . '|' . mb_substr($agent, 0, 180));
}

function lumina_handle_upload(PDO $pdo, array $file, string $kind = 'media'): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('No se recibió una imagen válida.');
    }
    $maxBytes = (int) lumina_config('upload_max_bytes');
    if (($file['size'] ?? 0) <= 0 || (int) $file['size'] > $maxBytes) {
        throw new RuntimeException('La imagen debe pesar menos de ' . (int) ($maxBytes / 1024 / 1024) . ' MB.');
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) {
        throw new RuntimeException('Solo se permiten imágenes JPG, PNG o WebP.');
    }
    $dimensions = @getimagesize($file['tmp_name']);
    if (!$dimensions || $dimensions[0] < 32 || $dimensions[1] < 32 || $dimensions[0] > 8000 || $dimensions[1] > 8000 || ($dimensions[0] * $dimensions[1]) > 40000000) {
        throw new RuntimeException('La imagen debe tener dimensiones válidas y no superar los 40 megapíxeles.');
    }
    $folder = trim(preg_replace('/[^a-z0-9_-]/i', '', $kind) ?: 'media', '/');
    $directory = rtrim((string) lumina_config('paths.uploads'), '/') . '/' . $folder;
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('No fue posible preparar el almacenamiento de imágenes.');
    }
    $filename = bin2hex(random_bytes(18)) . '.' . $extensions[$mime];
    $target = $directory . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        throw new RuntimeException('No fue posible guardar la imagen.');
    }
    $path = 'uploads/' . $folder . '/' . $filename;
    $statement = $pdo->prepare('INSERT INTO media (path, mime_type, size_bytes, width, height, alt_text, created_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())');
    $statement->execute([$path, $mime, (int) $file['size'], (int) $dimensions[0], (int) $dimensions[1], '']);
    return ['id' => (int) $pdo->lastInsertId(), 'path' => $path, 'url' => lumina_public_path($path), 'mime_type' => $mime];
}
