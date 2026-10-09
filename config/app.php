<?php
declare(strict_types=1);

// Hostinger uses public_html as the document root. Keep /public for local
// development so the same project works in both environments.
$root = dirname(__DIR__);
$publicPath = is_dir($root . '/public_html') ? $root . '/public_html' : $root . '/public';

return [
    'env' => getenv('APP_ENV') ?: 'production',
    'debug' => filter_var(getenv('APP_DEBUG') ?: false, FILTER_VALIDATE_BOOLEAN),
    'url' => rtrim((string) (getenv('APP_URL') ?: ''), '/'),
    'timezone' => getenv('APP_TIMEZONE') ?: 'America/Guayaquil',
    'session_name' => getenv('SESSION_NAME') ?: 'clickshopse_session',
    'upload_max_bytes' => (int) (getenv('UPLOAD_MAX_BYTES') ?: 5242880),
    'paths' => [
        'root' => $root,
        'public' => $publicPath,
        'uploads' => $publicPath . '/uploads',
        'logs' => $root . '/storage/logs',
    ],
    'database' => [
        'driver' => getenv('DB_DRIVER') ?: 'mysql',
        'host' => getenv('DB_HOST') ?: 'localhost',
        'port' => getenv('DB_PORT') ?: '3306',
        'name' => getenv('DB_NAME') ?: '',
        'user' => getenv('DB_USER') ?: '',
        'pass' => getenv('DB_PASS') ?: '',
        'charset' => 'utf8mb4',
        'sqlite_path' => getenv('SQLITE_PATH') ?: 'storage/local.sqlite',
    ],
];
