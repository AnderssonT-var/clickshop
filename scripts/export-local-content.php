<?php
declare(strict_types=1);

/*
 * Exports the non-sensitive storefront content from a local SQLite database
 * to a MySQL/MariaDB import file. It intentionally never reads users, orders,
 * activity logs, rate limits, sessions, or review email addresses.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script solo se puede ejecutar por terminal.\n");
    exit(1);
}

const LUMINA_EXPORT_ROOT = __DIR__ . '/..';

/** @return never */
function export_fail(string $message): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

function export_usage(): void
{
    fwrite(STDOUT, <<<TXT
Uso:
  php scripts/export-local-content.php --force
  php scripts/export-local-content.php --source=storage/local.sqlite --output=database/local-content.mysql.sql --force

Genera un import MySQL/MariaDB con contenido público de tienda. Excluye
usuarios, contraseñas, pedidos, sesiones, actividad, límites y correos de reseñas.
El archivo de salida se importa después de database/schema.sql y en lugar de seed.sql.
TXT . PHP_EOL);
}

function export_root_path(string $path): string
{
    if ($path === '' || str_starts_with($path, '/')) {
        return $path;
    }
    return LUMINA_EXPORT_ROOT . '/' . ltrim($path, '/');
}

function export_sql_string(mixed $value): string
{
    if ($value === null) {
        return 'NULL';
    }
    $value = (string) $value;
    if ($value === '') {
        return "''";
    }

    // Hex literals avoid SQL injection and remain correct for quotes, emoji,
    // line breaks and backslashes regardless of the host SQL mode.
    return 'CONVERT(0x' . bin2hex($value) . ' USING utf8mb4)';
}

function export_insert(string $table, array $columns, array $row, array $updates): string
{
    $columnSql = implode(', ', array_map(static fn(string $column): string => '`' . $column . '`', $columns));
    $valueSql = implode(', ', array_map(static fn(string $column): string => export_sql_string($row[$column] ?? null), $columns));
    $sql = "INSERT INTO `{$table}` ({$columnSql})\nVALUES ({$valueSql})";
    if ($updates !== []) {
        $updateSql = implode(",\n  ", array_map(static fn(string $column): string => '`' . $column . '` = VALUES(`' . $column . '`)', $updates));
        $sql .= "\nON DUPLICATE KEY UPDATE\n  {$updateSql}";
    }
    return $sql . ";\n\n";
}

function export_nullable_id(mixed $value, string $label): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    $string = (string) $value;
    if (!ctype_digit($string) || (int) $string < 1) {
        export_fail("La referencia {$label} no es válida en la base local.");
    }
    return (int) $string;
}

function export_has_id(array $ids, ?int $id, string $label): void
{
    if ($id !== null && !isset($ids[$id])) {
        export_fail("La referencia {$label} apunta a un registro que no existe.");
    }
}

function export_require_columns(PDO $pdo, string $table, array $columns): void
{
    $statement = $pdo->query("PRAGMA table_info('{$table}')");
    $available = array_flip(array_column($statement->fetchAll(PDO::FETCH_ASSOC), 'name'));
    foreach ($columns as $column) {
        if (!isset($available[$column])) {
            export_fail("La tabla local {$table} no contiene la columna esperada {$column}.");
        }
    }
}

$options = getopt('', ['source:', 'output:', 'force', 'help']);
if (array_key_exists('help', $options)) {
    export_usage();
    exit(0);
}

$source = export_root_path((string) ($options['source'] ?? 'storage/local.sqlite'));
$output = export_root_path((string) ($options['output'] ?? 'database/local-content.mysql.sql'));
$sourceReal = realpath($source);
if ($sourceReal === false || !is_file($sourceReal) || filesize($sourceReal) === 0) {
    export_fail('No se encontró una base SQLite local válida. Usa --source para indicar el archivo.');
}
if (realpath($output) === $sourceReal) {
    export_fail('El archivo de salida no puede reemplazar la base SQLite de origen.');
}
if (is_file($output) && !array_key_exists('force', $options)) {
    export_fail('El archivo de salida ya existe. Vuelve a ejecutar con --force para regenerarlo.');
}

$plans = [
    'media' => [
        'columns' => ['id', 'path', 'mime_type', 'size_bytes', 'width', 'height', 'alt_text', 'created_at'],
        'order' => 'id ASC',
        'updates' => ['path', 'mime_type', 'size_bytes', 'width', 'height', 'alt_text'],
    ],
    'categories' => [
        'columns' => ['id', 'name', 'slug', 'description', 'media_id', 'sort_order', 'status', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['name', 'slug', 'description', 'media_id', 'sort_order', 'status', 'updated_at'],
    ],
    'products' => [
        'columns' => ['id', 'category_id', 'name', 'slug', 'short_description', 'long_description', 'regular_price', 'sale_price', 'stock', 'low_stock_threshold', 'sku', 'badge', 'sort_order', 'status', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['category_id', 'name', 'slug', 'short_description', 'long_description', 'regular_price', 'sale_price', 'stock', 'low_stock_threshold', 'sku', 'badge', 'sort_order', 'status', 'updated_at'],
    ],
    'product_images' => [
        // The link has its own natural unique key; its local row id is not needed.
        'columns' => ['product_id', 'media_id', 'alt_text', 'sort_order', 'created_at'],
        'order' => 'product_id ASC, sort_order ASC, id ASC',
        'updates' => ['alt_text', 'sort_order'],
    ],
    'product_variants' => [
        'columns' => ['id', 'product_id', 'option_name', 'option_value', 'sku', 'price_delta', 'stock', 'sort_order', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['product_id', 'option_name', 'option_value', 'sku', 'price_delta', 'stock', 'sort_order', 'updated_at'],
    ],
    'banners' => [
        'columns' => ['id', 'eyebrow', 'title', 'body', 'cta_label', 'cta_target', 'theme', 'media_id', 'sort_order', 'status', 'starts_at', 'ends_at', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['eyebrow', 'title', 'body', 'cta_label', 'cta_target', 'theme', 'media_id', 'sort_order', 'status', 'starts_at', 'ends_at', 'updated_at'],
    ],
    'campaigns' => [
        'columns' => ['id', 'name', 'type', 'title', 'message', 'code', 'discount_percent', 'target_type', 'target_id', 'cta_label', 'cta_target', 'theme', 'sort_order', 'status', 'starts_at', 'ends_at', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['name', 'type', 'title', 'message', 'code', 'discount_percent', 'target_type', 'target_id', 'cta_label', 'cta_target', 'theme', 'sort_order', 'status', 'starts_at', 'ends_at', 'updated_at'],
    ],
    'notices' => [
        'columns' => ['id', 'type', 'title', 'message', 'cta_label', 'cta_target', 'dismissible', 'priority', 'status', 'starts_at', 'ends_at', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['type', 'title', 'message', 'cta_label', 'cta_target', 'dismissible', 'priority', 'status', 'starts_at', 'ends_at', 'updated_at'],
    ],
    'trust_cards' => [
        'columns' => ['id', 'icon_key', 'theme', 'title', 'body', 'cta_label', 'cta_target', 'sort_order', 'status', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['icon_key', 'theme', 'title', 'body', 'cta_label', 'cta_target', 'sort_order', 'status', 'updated_at'],
    ],
    'reviews' => [
        // author_email is intentionally not selected or exported.
        'columns' => ['id', 'product_id', 'author_name', 'rating', 'title', 'body', 'status', 'is_featured', 'published_at', 'created_at', 'updated_at'],
        'order' => 'id ASC',
        'updates' => ['product_id', 'author_name', 'rating', 'title', 'body', 'status', 'is_featured', 'published_at', 'updated_at'],
    ],
    'settings' => [
        'columns' => ['setting_key', 'setting_value', 'created_at', 'updated_at'],
        'order' => 'setting_key ASC',
        'updates' => ['setting_value', 'updated_at'],
    ],
];

$publicSettingKeys = array_flip([
    'store_name', 'store_tagline', 'currency', 'locale', 'whatsapp_number', 'whatsapp_message', 'shipping_notice',
    'store_email', 'store_phone', 'address', 'social_instagram', 'social_facebook', 'social_tiktok', 'social_x',
    'social_youtube', 'seo_title', 'seo_description', 'reviews_enabled', 'reviews_form_enabled', 'trust_enabled',
    'trust_title', 'trust_description', 'logo_media_id', 'favicon_media_id',
]);

try {
    $pdo = new PDO('sqlite:' . $sourceReal, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');

    $rowsByTable = [];
    foreach ($plans as $table => $plan) {
        export_require_columns($pdo, $table, $plan['columns']);
        $columns = implode(', ', array_map(static fn(string $column): string => '"' . $column . '"', $plan['columns']));
        $rowsByTable[$table] = $pdo->query("SELECT {$columns} FROM \"{$table}\" ORDER BY {$plan['order']}")->fetchAll();
    }
} catch (PDOException $exception) {
    export_fail('No se pudo leer la base SQLite local. Verifica el archivo y la extensión pdo_sqlite.');
}

$mediaIds = array_flip(array_map(static fn(array $row): int => (int) $row['id'], $rowsByTable['media']));
$categoryIds = array_flip(array_map(static fn(array $row): int => (int) $row['id'], $rowsByTable['categories']));
$productIds = array_flip(array_map(static fn(array $row): int => (int) $row['id'], $rowsByTable['products']));

foreach ($rowsByTable['media'] as $row) {
    $path = (string) $row['path'];
    if (!preg_match('#^uploads/[A-Za-z0-9_-]+/[A-Za-z0-9._-]+$#', $path) || str_contains($path, '..')) {
        export_fail('Se encontró una ruta de imagen local no segura. Corrígela antes de exportar.');
    }
    if (!in_array((string) $row['mime_type'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
        export_fail('Se encontró un tipo de archivo que no es una imagen permitida.');
    }
    if (!is_file(LUMINA_EXPORT_ROOT . '/public/' . $path)) {
        export_fail('Falta un archivo de imagen registrado en la base local. Restáuralo antes de exportar.');
    }
}
foreach ($rowsByTable['categories'] as $row) {
    export_has_id($mediaIds, export_nullable_id($row['media_id'], 'categoría → imagen'), 'categoría → imagen');
}
foreach ($rowsByTable['products'] as $row) {
    export_has_id($categoryIds, export_nullable_id($row['category_id'], 'producto → categoría'), 'producto → categoría');
}
foreach ($rowsByTable['product_images'] as $row) {
    export_has_id($productIds, export_nullable_id($row['product_id'], 'imagen → producto'), 'imagen → producto');
    export_has_id($mediaIds, export_nullable_id($row['media_id'], 'imagen → archivo'), 'imagen → archivo');
}
foreach ($rowsByTable['product_variants'] as $row) {
    export_has_id($productIds, export_nullable_id($row['product_id'], 'variante → producto'), 'variante → producto');
}
foreach ($rowsByTable['banners'] as $row) {
    export_has_id($mediaIds, export_nullable_id($row['media_id'], 'banner → imagen'), 'banner → imagen');
}
foreach ($rowsByTable['campaigns'] as $row) {
    $targetType = (string) $row['target_type'];
    $targetId = export_nullable_id($row['target_id'], 'campaña → destino');
    if ($targetType === 'all') {
        if ($targetId !== null) export_fail('Una campaña para todo el catálogo no puede tener un destino específico.');
        continue;
    }
    if ($targetType === 'category') {
        export_has_id($categoryIds, $targetId, 'campaña → categoría');
    } elseif ($targetType === 'product') {
        export_has_id($productIds, $targetId, 'campaña → producto');
    } else {
        export_fail('Se encontró un tipo de destino de campaña no válido.');
    }
}
foreach ($rowsByTable['reviews'] as $row) {
    export_has_id($productIds, export_nullable_id($row['product_id'], 'reseña → producto'), 'reseña → producto');
}

$safeSettings = [];
$ignoredSettings = 0;
foreach ($rowsByTable['settings'] as $row) {
    $key = (string) $row['setting_key'];
    if (!isset($publicSettingKeys[$key])) {
        $ignoredSettings++;
        continue;
    }
    if (in_array($key, ['logo_media_id', 'favicon_media_id'], true) && (string) $row['setting_value'] !== '') {
        export_has_id($mediaIds, export_nullable_id($row['setting_value'], "configuración de marca {$key}"), "configuración de marca {$key}");
    }
    $safeSettings[] = $row;
}
$rowsByTable['settings'] = $safeSettings;

$counts = array_map('count', $rowsByTable);
$sql = <<<'SQL'
-- Lúmina Store: contenido público exportado desde SQLite.
-- Importa database/schema.sql primero y este archivo después. No importes
-- database/seed.sql al usar esta exportación de una tienda existente.
-- Copia también public/uploads/ al servidor conservando las mismas rutas.
-- Excluye intencionalmente usuarios, hashes, pedidos, actividad, límites,
-- sesiones y correos de reseñas.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

SQL;

foreach ($plans as $table => $plan) {
    $sql .= "-- {$table}: " . $counts[$table] . " registro(s).\n";
    foreach ($rowsByTable[$table] as $row) {
        $sql .= export_insert($table, $plan['columns'], $row, $plan['updates']);
    }
    $sql .= "\n";
}
$sql .= "COMMIT;\n";

$directory = dirname($output);
if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
    export_fail('No fue posible crear el directorio del archivo de salida.');
}
$temporary = tempnam($directory, '.lumina-content-export-');
if ($temporary === false || file_put_contents($temporary, $sql, LOCK_EX) === false || !rename($temporary, $output)) {
    if ($temporary !== false && is_file($temporary)) {
        unlink($temporary);
    }
    export_fail('No fue posible escribir el archivo SQL de contenido.');
}
@chmod($output, 0644);

$relativeOutput = str_starts_with($output, LUMINA_EXPORT_ROOT . '/')
    ? substr($output, strlen(LUMINA_EXPORT_ROOT) + 1)
    : $output;
fwrite(STDOUT, "Exportación creada: {$relativeOutput}\n");
fwrite(STDOUT, 'Registros exportados: ' . implode(', ', array_map(static fn(string $table, int $count): string => "{$table}={$count}", array_keys($counts), $counts)) . ".\n");
if ($ignoredSettings > 0) {
    fwrite(STDOUT, "Se omitieron {$ignoredSettings} configuraciones fuera de la lista pública permitida.\n");
}
fwrite(STDOUT, "No se exportaron usuarios, contraseñas, pedidos, actividad, límites ni correos de reseñas.\n");
