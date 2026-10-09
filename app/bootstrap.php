<?php
declare(strict_types=1);

/* Shared bootstrap. Keep this directory above public_html when deploying. */

const LUMINA_ROOT = __DIR__ . '/..';

function lumina_load_env(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (($value[0] ?? '') === '"' && str_ends_with($value, '"')) {
            $value = substr($value, 1, -1);
        }
        if ($key !== '' && getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
}

lumina_load_env(LUMINA_ROOT . '/.env');
$luminaConfig = require LUMINA_ROOT . '/config/app.php';

date_default_timezone_set($luminaConfig['timezone']);
ini_set('display_errors', $luminaConfig['debug'] ? '1' : '0');
ini_set('log_errors', '1');

if (PHP_SAPI !== 'cli' && session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ((int) ($_SERVER['SERVER_PORT'] ?? 80) === 443);
    session_name($luminaConfig['session_name']);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function lumina_config(?string $key = null): mixed
{
    global $luminaConfig;
    if ($key === null) {
        return $luminaConfig;
    }
    $value = $luminaConfig;
    foreach (explode('.', $key) as $part) {
        if (!is_array($value) || !array_key_exists($part, $value)) {
            return null;
        }
        $value = $value[$part];
    }
    return $value;
}

function lumina_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $database = lumina_config('database');
    $driver = strtolower((string) ($database['driver'] ?? 'mysql'));
    if ($driver === 'sqlite') {
        $path = (string) ($database['sqlite_path'] ?? 'storage/local.sqlite');
        if (!str_starts_with($path, '/')) {
            $path = LUMINA_ROOT . '/' . ltrim($path, '/');
        }
        $directory = dirname($path);
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new RuntimeException('No fue posible preparar el almacenamiento local.');
        }
        $pdoOptions = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];
        $pdo = class_exists('Pdo\\Sqlite')
            ? new \Pdo\Sqlite('sqlite:' . $path, null, null, $pdoOptions)
            : new PDO('sqlite:' . $path, null, null, $pdoOptions);
        $pdo->exec('PRAGMA foreign_keys = ON');
        if ($pdo instanceof \Pdo\Sqlite) {
            $pdo->createFunction('UTC_TIMESTAMP', static fn(): string => gmdate('Y-m-d H:i:s'), 0);
            $pdo->createFunction('UTC_DATE', static fn(): string => gmdate('Y-m-d'), 0);
            $pdo->createFunction('IF', static fn(mixed $condition, mixed $whenTrue, mixed $whenFalse): mixed => $condition ? $whenTrue : $whenFalse, 3);
        } else {
            $pdo->sqliteCreateFunction('UTC_TIMESTAMP', static fn(): string => gmdate('Y-m-d H:i:s'), 0);
            $pdo->sqliteCreateFunction('UTC_DATE', static fn(): string => gmdate('Y-m-d'), 0);
            $pdo->sqliteCreateFunction('IF', static fn(mixed $condition, mixed $whenTrue, mixed $whenFalse): mixed => $condition ? $whenTrue : $whenFalse, 3);
        }
        return $pdo;
    }
    if ($driver !== 'mysql') {
        throw new RuntimeException('El driver de base de datos no es compatible.');
    }
    if (empty($database['name']) || empty($database['user'])) {
        throw new RuntimeException('La base de datos no está configurada. Revisa el archivo .env.');
    }
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $database['host'], $database['port'], $database['name'], $database['charset']);
    $pdo = new PDO($dsn, $database['user'], $database['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function lumina_db_driver(): string
{
    return strtolower((string) (lumina_config('database.driver') ?: 'mysql'));
}

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/repository.php';
require_once __DIR__ . '/auth.php';
