<?php
// Temporary one-off importer for the October 2026 supplier catalogues.
// Creates the new categories and products only; existing records are never changed.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$root = dirname(__DIR__); // this file lives in <site>/storage
$mode = $argv[1] ?? 'dry';
echo 'php ' . PHP_VERSION . ' root ' . $root . ' app ' . (is_file($root . '/app/bootstrap.php') ? 'ok' : 'MISSING') . "\n";
if (!is_file($root . '/app/bootstrap.php')) exit(1);
require $root . '/app/bootstrap.php';
$_GET = ['mode' => $mode, 'offset' => $argv[2] ?? 0, 'limit' => $argv[3] ?? 600];
if (($_GET['mode'] ?? '') === 'fetch') {
    // Pull the photos and data from the temporary GitHub branch and unpack only the expected files.
    $zipUrl = 'https://codeload.github.com/AnderssonT-var/clickshop/zip/refs/heads/catalog-import-2026-10-30';
    $tmp = tempnam(sys_get_temp_dir(), 'csz');
    $ctx = stream_context_create(['http' => ['timeout' => 120, 'header' => "User-Agent: clickshop-import\r\n"]]);
    $bytes = @file_get_contents($zipUrl, false, $ctx);
    if (($bytes === false || strlen($bytes) < 1000) && function_exists('curl_init')) {
        $ch = curl_init($zipUrl);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 180, CURLOPT_USERAGENT => 'clickshop-import']);
        $bytes = curl_exec($ch);
        curl_close($ch);
    }
    if ($bytes === false || strlen($bytes) < 1000) { echo json_encode(['ok' => false, 'error' => 'download failed']); exit; }
    file_put_contents($tmp, $bytes);
    $zip = new ZipArchive();
    if ($zip->open($tmp) !== true) { echo json_encode(['ok' => false, 'error' => 'zip open failed']); exit; }
    $written = 0; $rejected = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (!preg_match('#^[^/]+/catalog-import/(uploads/(?:catalog|categories)/[a-z0-9-]+\.jpg|storage/catalog-import-2026-10-30\.json)$#', $name, $m)) continue;
        $rel = $m[1];
        $content = $zip->getFromIndex($i);
        if (str_ends_with($rel, '.jpg') && !@getimagesizefromstring($content)) { $rejected[] = $rel; continue; }
        $target = str_starts_with($rel, 'uploads/') ? $root . '/public_html/' . $rel : $root . '/' . $rel;
        if (!is_dir(dirname($target))) mkdir(dirname($target), 0755, true);
        if (str_starts_with($rel, 'uploads/') && is_file($target)) continue; // never overwrite an existing upload
        file_put_contents($target, $content);
        $written++;
    }
    $zip->close(); unlink($tmp);
    echo json_encode(['ok' => true, 'written' => $written, 'rejected' => $rejected, 'zip_bytes' => strlen($bytes)]);
    exit;
}
$run = ($_GET['mode'] ?? 'dry') === 'run';
$offset = max(0, (int) ($_GET['offset'] ?? 0));
$limit = min(600, max(1, (int) ($_GET['limit'] ?? 600)));
$data = json_decode((string) file_get_contents($root . '/storage/catalog-import-2026-10-30.json'), true, 512, JSON_THROW_ON_ERROR);
$pdo = lumina_db();
$report = ['mode' => $run ? 'run' : 'dry', 'categories' => [], 'created' => 0, 'skipped' => [], 'errors' => [], 'missing_images' => []];

function cs_media(PDO $pdo, string $path, string $alt, bool $run): ?int {
    $file = dirname(__DIR__) . '/public_html/' . $path; // __DIR__ = <site>/storage
    if (!is_file($file)) return null;
    $q = $pdo->prepare('SELECT id FROM media WHERE path = ? LIMIT 1');
    $q->execute([$path]);
    if ($id = $q->fetchColumn()) return (int) $id;
    if (!$run) return -1;
    [$w, $h] = getimagesize($file) ?: [0, 0];
    if ($w < 1 || $h < 1) return null;
    $pdo->prepare('INSERT INTO media (path, mime_type, size_bytes, width, height, alt_text, created_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())')
        ->execute([$path, 'image/jpeg', filesize($file), $w, $h, mb_substr($alt, 0, 255)]);
    return (int) $pdo->lastInsertId();
}

$categoryIds = [];
foreach ($data['categories'] as $cat) {
    $q = $pdo->prepare('SELECT id FROM categories WHERE slug = ? LIMIT 1');
    $q->execute([$cat['slug']]);
    $id = $q->fetchColumn();
    if ($id) { $categoryIds[$cat['slug']] = (int) $id; $report['categories'][$cat['slug']] = 'exists #' . $id; continue; }
    $media = cs_media($pdo, 'uploads/categories/' . $cat['slug'] . '-cover.jpg', $cat['name'], $run);
    if ($media === null) $report['missing_images'][] = 'cover ' . $cat['slug'];
    if (!$run) { $report['categories'][$cat['slug']] = 'would create'; $categoryIds[$cat['slug']] = 0; continue; }
    $saved = lumina_save_category($pdo, ['name' => $cat['name'], 'slug' => $cat['slug'], 'description' => $cat['description'], 'media_id' => $media > 0 ? $media : null, 'sort_order' => $cat['sort_order'], 'status' => 'active'], null, null);
    $categoryIds[$cat['slug']] = (int) $saved['id'];
    $report['categories'][$cat['slug']] = 'created #' . $saved['id'];
}

$products = array_slice($data['products'], $offset, $limit);
$skuCheck = $pdo->prepare('SELECT id FROM products WHERE sku = ? OR slug = ? LIMIT 1');
foreach ($products as $p) {
    $skuCheck->execute([strtoupper($p['sku']), $p['slug']]);
    if ($skuCheck->fetchColumn()) { $report['skipped'][] = $p['sku']; continue; }
    $media = cs_media($pdo, $p['image'], $p['name'], $run);
    if ($media === null) { $report['missing_images'][] = $p['sku']; continue; }
    if (!$run) { $report['created']++; continue; }
    try {
        $saved = lumina_save_product($pdo, [
            'category_id' => $categoryIds[$p['category']], 'name' => $p['name'], 'slug' => $p['slug'],
            'short_description' => $p['short_description'], 'long_description' => $p['long_description'],
            'regular_price' => $p['price'], 'sale_price' => '', 'stock' => 10, 'low_stock_threshold' => 2,
            'sku' => $p['sku'], 'badge' => '', 'sort_order' => $p['sort_order'], 'status' => 'active',
            'image_alt' => $p['name'], 'media_ids' => [$media], 'variants' => [],
        ], null, null);
        $report['created']++;
        $report['created_ids'][] = (int) $saved['id'];
    } catch (Throwable $e) {
        $report['errors'][] = $p['sku'] . ': ' . $e->getMessage();
    }
}
$report['range'] = [$offset, $offset + count($products), count($data['products'])];
if ($run) file_put_contents($root . '/storage/catalog-import-log-' . date('Ymd-His') . '.json', json_encode($report, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
unset($report['created_ids']);
echo json_encode($report, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
