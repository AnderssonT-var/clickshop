<?php
declare(strict_types=1);

// Loaded at file scope so the bootstrap's globals (configuration) stay global.
require_once __DIR__ . '/bootstrap.php';

/*
 * Server-rendered <head> tags for public pages. WhatsApp, Facebook and Google
 * read these without running JavaScript, so shared links show the store (or
 * the shared product) with its real name, description and image.
 * Any failure falls back to the static defaults — the page always renders.
 */
function lumina_page_meta(string $view, array $defaults): string
{
    $title = $defaults['title'];
    $description = $defaults['description'];
    $image = '';
    $type = 'website';

    try {
        $pdo = lumina_db();
        $settings = lumina_public_settings($pdo);
        $store = trim((string) ($settings['store_name'] ?? '')) ?: $title;
        $title = $view === 'catalog'
            ? "{$store} — Tienda"
            : (trim((string) ($settings['seo_title'] ?? '')) ?: $store);
        $description = trim((string) ($settings['seo_description'] ?? '')) ?: $description;
        $image = (string) ($settings['logo_url'] ?? '');

        $slug = trim((string) ($_GET['producto'] ?? ''));
        if ($slug !== '' && strlen($slug) <= 190) {
            $statement = $pdo->prepare(
                "SELECT p.name, p.short_description, p.regular_price, p.sale_price,
                        (SELECT m.path FROM product_images pi INNER JOIN media m ON m.id = pi.media_id
                         WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_path
                 FROM products p WHERE (p.slug = ? OR p.id = ?) AND p.status = 'active' LIMIT 1"
            );
            $statement->execute([$slug, ctype_digit($slug) ? (int) $slug : 0]);
            $product = $statement->fetch();
            if ($product) {
                $price = $product['sale_price'] !== null && (float) $product['sale_price'] < (float) $product['regular_price']
                    ? (float) $product['sale_price'] : (float) $product['regular_price'];
                $title = "{$product['name']} — {$store}";
                $description = trim((string) $product['short_description']) . ' · $' . number_format($price, 2);
                $image = lumina_public_path((string) ($product['image_path'] ?? '')) ?: $image;
                $type = 'product';
            }
        }
    } catch (Throwable $exception) {
        error_log('page-meta: ' . $exception->getMessage());
    }

    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $tags = [
        "<title>{$e($title)}</title>",
        "<meta name=\"description\" content=\"{$e($description)}\">",
        "<meta property=\"og:type\" content=\"{$e($type)}\">",
        "<meta property=\"og:title\" content=\"{$e($title)}\">",
        "<meta property=\"og:description\" content=\"{$e($description)}\">",
        '<meta property="og:locale" content="es_EC">',
        '<meta name="twitter:card" content="summary_large_image">',
    ];
    if ($image !== '' && !preg_match('#^https?://#i', $image) && !empty($_SERVER['HTTP_HOST'])) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $image = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/' . ltrim($image, '/');
    }
    if ($image !== '' && preg_match('#^https?://#i', $image)) {
        $tags[] = "<meta property=\"og:image\" content=\"{$e($image)}\">";
    }
    return implode("\n  ", $tags);
}
