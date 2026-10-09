<?php
declare(strict_types=1);

/*
 * Creates a disposable SQLite database for local UI/API testing.
 * It never changes the MySQL production schema or deployment settings.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script solo se puede ejecutar por terminal.\n");
    exit(1);
}

require dirname(__DIR__) . '/app/bootstrap.php';

function local_setup_fail(string $message): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

function local_setup_usage(): void
{
    fwrite(STDOUT, <<<TXT
Uso:
  php scripts/setup-local.php --email=admin@local.test --name="Administrador" --password="una-clave-segura"
  php scripts/setup-local.php --reset --email=admin@local.test --name="Administrador" --password="una-clave-segura"

Este instalador funciona únicamente cuando DB_DRIVER=sqlite en .env.
--reset elimina solo storage/local.sqlite antes de recrearlo.
TXT . PHP_EOL);
}

$options = getopt('', ['email:', 'name:', 'password:', 'reset', 'help']);
if (array_key_exists('help', $options)) {
    local_setup_usage();
    exit(0);
}
if (lumina_db_driver() !== 'sqlite') {
    local_setup_fail('Configura DB_DRIVER=sqlite en .env antes de usar el instalador local.');
}

$email = mb_strtolower(trim((string) ($options['email'] ?? 'admin@local.test')));
$name = trim((string) ($options['name'] ?? 'Administrador local'));
$password = (string) ($options['password'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    local_setup_fail('El correo de administrador no es válido.');
}
if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
    local_setup_fail('El nombre debe tener entre 2 y 120 caracteres.');
}
if (mb_strlen($password) < 12) {
    local_setup_fail('Usa una contraseña local de al menos 12 caracteres.');
}

$path = (string) lumina_config('database.sqlite_path');
if (!str_starts_with($path, '/')) {
    $path = LUMINA_ROOT . '/' . ltrim($path, '/');
}
if (array_key_exists('reset', $options) && is_file($path) && !unlink($path)) {
    local_setup_fail('No fue posible reiniciar la base de datos local.');
}

$newDatabase = !is_file($path) || filesize($path) === 0;
$pdo = lumina_db();
if ($newDatabase) {
    $schema = file_get_contents(dirname(__DIR__) . '/database/schema.sqlite.sql');
    $seed = file_get_contents(dirname(__DIR__) . '/database/seed.sqlite.sql');
    if ($schema === false || $seed === false) {
        local_setup_fail('No se encontraron los archivos de instalación local.');
    }
    $pdo->exec($schema);
    $pdo->exec($seed);
}

$owner = $pdo->prepare('INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()) ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash, role = excluded.role, is_active = 1, updated_at = UTC_TIMESTAMP()');
$owner->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), 'owner']);

fwrite(STDOUT, "Base local preparada.\n");
fwrite(STDOUT, "Administrador: {$email}\n");
fwrite(STDOUT, "Abre la URL local mostrada por el servidor y entra en /admin.\n");
