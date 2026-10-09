<?php
declare(strict_types=1);

function lumina_settings(PDO $pdo): array
{
    $rows = $pdo->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    return $settings;
}

function lumina_media_url(PDO $pdo, mixed $mediaId): string
{
    $id = filter_var($mediaId, FILTER_VALIDATE_INT);
    if (!$id) {
        return '';
    }
    $statement = $pdo->prepare('SELECT path FROM media WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    return lumina_public_path($statement->fetchColumn() ?: '');
}

function lumina_shipping_fee(array $settings, ?float $subtotal = null): float
{
    // Stores created before this setting exists should use the requested
    // production default. Turning the option off always wins over its value.
    if (($settings['shipping_enabled'] ?? '1') === '0') {
        return 0.0;
    }
    // Free shipping from a minimum order value (0 or empty = never free).
    $freeFrom = lumina_free_shipping_min($settings);
    if ($subtotal !== null && $freeFrom > 0 && $subtotal >= $freeFrom) {
        return 0.0;
    }
    $raw = $settings['shipping_fee'] ?? '5';
    if (!is_numeric($raw)) {
        return 5.0;
    }
    return round(max(0, min(9999.99, (float) $raw)), 2);
}

function lumina_free_shipping_min(array $settings): float
{
    $raw = $settings['free_shipping_min'] ?? '';
    return is_numeric($raw) ? round(max(0, min(999999, (float) $raw)), 2) : 0.0;
}

/**
 * WhatsApp (wa.me) needs the international number without the national
 * trunk "0". Ecuador numbers are often typed as 0991234567 or 5930991234567;
 * both become 593991234567 so every order link opens the right chat.
 */
function lumina_normalize_whatsapp(string $value): string
{
    $digits = preg_replace('/\D+/', '', $value) ?: '';
    if (str_starts_with($digits, '00')) {
        $digits = substr($digits, 2);
    }
    if (preg_match('/^5930(\d{8,9})$/', $digits, $match)) {
        return '593' . $match[1];
    }
    if (preg_match('/^0(\d{8,9})$/', $digits, $match)) {
        return '593' . $match[1];
    }
    return $digits;
}

function lumina_public_settings(PDO $pdo): array
{
    $settings = lumina_settings($pdo);
    return [
        'store_name' => $settings['store_name'] ?? 'Lúmina',
        'store_tagline' => $settings['store_tagline'] ?? '',
        'currency' => $settings['currency'] ?? 'USD',
        'locale' => $settings['locale'] ?? 'es-EC',
        'whatsapp_number' => lumina_normalize_whatsapp((string) ($settings['whatsapp_number'] ?? '')),
        'whatsapp_message' => $settings['whatsapp_message'] ?? 'Hola, quiero realizar el siguiente pedido:',
        'shipping_notice' => $settings['shipping_notice'] ?? '',
        'shipping_enabled' => ($settings['shipping_enabled'] ?? '1') !== '0',
        'shipping_fee' => lumina_shipping_fee($settings),
        'free_shipping_min' => lumina_free_shipping_min($settings),
        'store_email' => $settings['store_email'] ?? '',
        'store_phone' => $settings['store_phone'] ?? '',
        'address' => $settings['address'] ?? '',
        'social_instagram' => $settings['social_instagram'] ?? '',
        'social_facebook' => $settings['social_facebook'] ?? '',
        'social_tiktok' => $settings['social_tiktok'] ?? '',
        'social_x' => $settings['social_x'] ?? '',
        'social_youtube' => $settings['social_youtube'] ?? '',
        'seo_title' => $settings['seo_title'] ?? '',
        'seo_description' => $settings['seo_description'] ?? '',
        'reviews_enabled' => ($settings['reviews_enabled'] ?? '1') === '1',
        'reviews_form_enabled' => ($settings['reviews_form_enabled'] ?? '1') === '1',
        'trust_enabled' => ($settings['trust_enabled'] ?? '1') === '1',
        'trust_title' => $settings['trust_title'] ?? 'Compra con tranquilidad.',
        'trust_description' => $settings['trust_description'] ?? '',
        'logo_url' => lumina_media_url($pdo, $settings['logo_media_id'] ?? null),
        'favicon_url' => lumina_media_url($pdo, $settings['favicon_media_id'] ?? null),
    ];
}

function lumina_active_date_condition(string $alias = ''): string
{
    $prefix = $alias === '' ? '' : $alias . '.';
    return "{$prefix}status = 'active' AND ({$prefix}starts_at IS NULL OR {$prefix}starts_at <= UTC_DATE()) AND ({$prefix}ends_at IS NULL OR {$prefix}ends_at >= UTC_DATE())";
}

function lumina_public_products(PDO $pdo): array
{
    $sql = "SELECT p.id, p.name, p.slug, p.short_description, p.long_description, p.regular_price, p.sale_price, p.stock, p.sku, p.badge, p.sort_order,
                   c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
                   (SELECT m.path FROM product_images pi INNER JOIN media m ON m.id = pi.media_id WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_path,
                   COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'), 0) AS rating_average,
                   (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS review_count
            FROM products p INNER JOIN categories c ON c.id = p.category_id
            WHERE p.status = 'active' AND c.status = 'active'
            ORDER BY p.sort_order ASC, p.id DESC";
    $products = $pdo->query($sql)->fetchAll();
    if (!$products) {
        return [];
    }
    $ids = array_column($products, 'id');
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $variants = $pdo->prepare("SELECT id, product_id, option_name, option_value, sku, price_delta, stock, sort_order FROM product_variants WHERE product_id IN ({$marks}) ORDER BY sort_order ASC, id ASC");
    $variants->execute($ids);
    $variantsByProduct = [];
    foreach ($variants->fetchAll() as $variant) {
        $variantsByProduct[$variant['product_id']][] = $variant;
    }
    $images = $pdo->prepare("SELECT pi.product_id, pi.media_id, pi.alt_text, pi.sort_order, m.path FROM product_images pi INNER JOIN media m ON m.id = pi.media_id WHERE pi.product_id IN ({$marks}) ORDER BY pi.product_id ASC, pi.sort_order ASC, pi.id ASC");
    $images->execute($ids);
    $imagesByProduct = [];
    foreach ($images->fetchAll() as $image) {
        $imagesByProduct[$image['product_id']][] = [
            'id' => (int) $image['media_id'],
            'url' => lumina_public_path($image['path'] ?: ''),
            'alt' => $image['alt_text'] ?? '',
        ];
    }
    foreach ($products as &$product) {
        $product['image_url'] = lumina_public_path($product['image_path'] ?: '');
        unset($product['image_path']);
        $product['variants'] = $variantsByProduct[$product['id']] ?? [];
        $product['images'] = $imagesByProduct[$product['id']] ?? [];
        $product['regular_price'] = (float) $product['regular_price'];
        $product['sale_price'] = $product['sale_price'] !== null ? (float) $product['sale_price'] : null;
        $product['rating_average'] = (float) $product['rating_average'];
        $product['review_count'] = (int) $product['review_count'];
    }
    unset($product);
    return $products;
}

/**
 * Early demo content shipped two trust cards written for the store owner
 * ("editable from the panel", "manage the store from Admin"). Replace them
 * once with customer-facing copy; cards the owner already edited never match.
 */
function lumina_refresh_customer_copy(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $replacements = [
        'Productos y precios editables desde el panel.' => ['truck', 'Rastreo en línea', 'Sigue tu pedido con tu guía, paso a paso.'],
        'Controla la tienda desde Admin.' => ['card', 'Pago y entrega coordinados', 'Acordamos contigo el pago y la entrega por WhatsApp.'],
    ];
    $statement = $pdo->prepare('UPDATE trust_cards SET icon_key = ?, title = ?, body = ?, updated_at = UTC_TIMESTAMP() WHERE body = ?');
    foreach ($replacements as $oldBody => [$icon, $title, $body]) {
        $statement->execute([$icon, $title, $body, $oldBody]);
    }
}

function lumina_public_payload(PDO $pdo): array
{
    lumina_refresh_customer_copy($pdo);
    $settings = lumina_public_settings($pdo);
    $categories = $pdo->query("SELECT c.id, c.name, c.slug, c.description, c.sort_order, m.path AS image_path FROM categories c LEFT JOIN media m ON m.id = c.media_id WHERE c.status = 'active' ORDER BY c.sort_order ASC, c.name ASC")->fetchAll();
    foreach ($categories as &$category) {
        $category['image_url'] = lumina_public_path($category['image_path'] ?: '');
        unset($category['image_path']);
    }
    unset($category);

    $banners = $pdo->query("SELECT b.id, b.eyebrow, b.title, b.body, b.cta_label, b.cta_target, b.theme, b.sort_order, m.path AS image_path FROM banners b LEFT JOIN media m ON m.id = b.media_id WHERE " . lumina_active_date_condition('b') . " ORDER BY b.sort_order ASC, b.id DESC")->fetchAll();
    foreach ($banners as &$banner) {
        $banner['image_url'] = lumina_public_path($banner['image_path'] ?: '');
        unset($banner['image_path']);
    }
    unset($banner);

    $campaigns = $pdo->query("SELECT id, name, type, title, message, code, discount_percent, target_type, target_id, cta_label, cta_target, theme, sort_order, ends_at FROM campaigns WHERE " . lumina_active_date_condition() . " ORDER BY sort_order ASC, id DESC LIMIT 6")->fetchAll();
    foreach ($campaigns as &$campaign) {
        $campaign['discount_percent'] = (float) $campaign['discount_percent'];
    }
    unset($campaign);

    $notices = $pdo->query("SELECT id, type, title, message, cta_label, cta_target, dismissible, priority FROM notices WHERE " . lumina_active_date_condition() . " ORDER BY priority DESC, id DESC LIMIT 3")->fetchAll();
    foreach ($notices as &$notice) {
        $notice['dismissible'] = (bool) $notice['dismissible'];
    }
    unset($notice);

    $trustCards = $pdo->query("SELECT id, icon_key, theme, title, body, cta_label, cta_target, sort_order FROM trust_cards WHERE status = 'active' ORDER BY sort_order ASC, id ASC")->fetchAll();
    $reviews = [];
    $reviewSummary = ['average' => 0, 'count' => 0, 'store' => 0, 'products' => 0, 'distribution' => ['5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0]];
    if ($settings['reviews_enabled']) {
        // Every approved review is public: general store reviews and product reviews alike.
        $reviews = $pdo->query(
            "SELECT r.id, r.product_id, r.author_name, r.rating, r.title, r.body, r.is_featured, r.published_at,
                    p.name AS product_name, p.slug AS product_slug
             FROM reviews r LEFT JOIN products p ON p.id = r.product_id AND p.status = 'active'
             WHERE r.status = 'approved'
             ORDER BY r.is_featured DESC, r.published_at DESC, r.id DESC LIMIT 60"
        )->fetchAll();
        foreach ($reviews as &$review) {
            $review['rating'] = (int) $review['rating'];
            $review['product_id'] = $review['product_name'] === null ? null : (int) $review['product_id'];
        }
        unset($review);
        $summary = $pdo->query("SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS average, COUNT(*) AS count, COALESCE(SUM(CASE WHEN product_id IS NULL THEN 1 ELSE 0 END), 0) AS store_count FROM reviews WHERE status = 'approved'")->fetch();
        $reviewSummary['average'] = (float) $summary['average'];
        $reviewSummary['count'] = (int) $summary['count'];
        $reviewSummary['store'] = (int) $summary['store_count'];
        $reviewSummary['products'] = $reviewSummary['count'] - $reviewSummary['store'];
        foreach ($pdo->query("SELECT rating, COUNT(*) AS total FROM reviews WHERE status = 'approved' GROUP BY rating")->fetchAll() as $row) {
            $key = (string) max(1, min(5, (int) $row['rating']));
            $reviewSummary['distribution'][$key] += (int) $row['total'];
        }
    }
    return compact('settings', 'categories', 'banners', 'campaigns', 'notices', 'trustCards', 'reviews', 'reviewSummary') + ['products' => lumina_public_products($pdo)];
}

function lumina_admin_categories(PDO $pdo): array
{
    $rows = $pdo->query("SELECT c.*, m.path AS image_path, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status != 'archived') AS product_count FROM categories c LEFT JOIN media m ON m.id = c.media_id ORDER BY c.sort_order ASC, c.id DESC")->fetchAll();
    foreach ($rows as &$row) {
        $row['image_url'] = lumina_public_path($row['image_path'] ?: '');
        unset($row['image_path']);
        $row['is_active'] = $row['status'] === 'active';
    }
    unset($row);
    return $rows;
}

function lumina_admin_products(PDO $pdo): array
{
    $rows = $pdo->query("SELECT p.*, c.name AS category_name, (SELECT m.path FROM product_images pi INNER JOIN media m ON m.id = pi.media_id WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_path FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.sort_order ASC, p.id DESC")->fetchAll();
    foreach ($rows as &$row) {
        $row['image_url'] = lumina_public_path($row['image_path'] ?: '');
        unset($row['image_path']);
        $row['variants'] = lumina_product_variants($pdo, (int) $row['id']);
        $row['media_ids'] = lumina_product_media_ids($pdo, (int) $row['id']);
    }
    unset($row);
    return $rows;
}

/*
 * Shipment tracking --------------------------------------------------------
 *
 * One pipeline drives both the back office and the customer tracker:
 *
 *   pending → preparing → shipped → out_for_delivery → delivered
 *                              ↘ issue (novedad) ↗          cancelled
 *
 * - `tracking_number` is the store guide (CS-…). It is created with the order,
 *   sent to the customer by WhatsApp and NEVER changes, so shared links keep
 *   working.
 * - `carrier_tracking_number` is the courier's own guide (Servientrega, Laar…).
 *   Customers can look up their order with either of them.
 * - `orders.status` is the legacy commercial status and is derived from the
 *   shipment status, so older screens and reports stay consistent.
 * - Stock is discounted once, when the order leaves "pending", and returned
 *   if a discounted order is cancelled (`stock_applied`: 0 no, 1 yes,
 *   2 legacy order created before this logic existed — never touched).
 *
 * The production database predates several of these columns. They are added
 * lazily and idempotently so a normal deploy needs no phpMyAdmin step.
 */
const LUMINA_SHIPMENT_FLOW = ['pending', 'preparing', 'shipped', 'out_for_delivery', 'delivered'];
const LUMINA_SHIPMENT_STATUSES = ['pending', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'issue', 'cancelled'];

function lumina_table_columns(PDO $pdo, string $table): array
{
    $columns = [];
    if (lumina_db_driver() === 'mysql') {
        foreach ($pdo->query("SHOW COLUMNS FROM {$table}")->fetchAll() as $column) {
            $columns[strtolower((string) $column['Field'])] = strtolower((string) $column['Type']);
        }
    } else {
        foreach ($pdo->query("PRAGMA table_info({$table})")->fetchAll() as $column) {
            $columns[strtolower((string) $column['name'])] = strtolower((string) $column['type']);
        }
    }
    return $columns;
}

function lumina_ensure_tracking_schema(PDO $pdo): void
{
    static $ready = [];
    $key = spl_object_id($pdo);
    if (!empty($ready[$key])) {
        return;
    }

    $mysql = lumina_db_driver() === 'mysql';
    $columns = lumina_table_columns($pdo, 'orders');
    $hadStockColumn = isset($columns['stock_applied']);

    $definitions = $mysql
        ? [
            'tracking_number' => 'tracking_number VARCHAR(100) NULL',
            'shipping_carrier' => "shipping_carrier VARCHAR(100) NOT NULL DEFAULT ''",
            'shipment_status' => "shipment_status VARCHAR(30) NOT NULL DEFAULT 'pending'",
            'shipment_note' => "shipment_note VARCHAR(500) NOT NULL DEFAULT ''",
            'shipped_at' => 'shipped_at DATETIME NULL',
            'delivered_at' => 'delivered_at DATETIME NULL',
            'carrier_tracking_number' => "carrier_tracking_number VARCHAR(100) NOT NULL DEFAULT ''",
            'shipping_city' => "shipping_city VARCHAR(120) NOT NULL DEFAULT ''",
            'shipping_address' => "shipping_address VARCHAR(255) NOT NULL DEFAULT ''",
            'estimated_delivery' => 'estimated_delivery DATE NULL',
            'stock_applied' => 'stock_applied TINYINT UNSIGNED NOT NULL DEFAULT 0',
        ]
        : [
            'tracking_number' => 'tracking_number TEXT',
            'shipping_carrier' => "shipping_carrier TEXT NOT NULL DEFAULT ''",
            'shipment_status' => "shipment_status TEXT NOT NULL DEFAULT 'pending'",
            'shipment_note' => "shipment_note TEXT NOT NULL DEFAULT ''",
            'shipped_at' => 'shipped_at TEXT',
            'delivered_at' => 'delivered_at TEXT',
            'carrier_tracking_number' => "carrier_tracking_number TEXT NOT NULL DEFAULT ''",
            'shipping_city' => "shipping_city TEXT NOT NULL DEFAULT ''",
            'shipping_address' => "shipping_address TEXT NOT NULL DEFAULT ''",
            'estimated_delivery' => 'estimated_delivery TEXT',
            'stock_applied' => 'stock_applied INTEGER NOT NULL DEFAULT 0',
        ];
    foreach ($definitions as $name => $definition) {
        if (!isset($columns[$name])) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN {$definition}");
        }
    }
    // Orders that existed before stock handling must never be discounted or
    // restocked retroactively.
    if (!$hadStockColumn) {
        $pdo->exec('UPDATE orders SET stock_applied = 2');
    }
    // The first release stored the status as a closed ENUM; new statuses need
    // a plain string column.
    if ($mysql && str_starts_with($columns['shipment_status'] ?? '', 'enum')) {
        $pdo->exec("ALTER TABLE orders MODIFY shipment_status VARCHAR(30) NOT NULL DEFAULT 'pending'");
    }

    $itemColumns = lumina_table_columns($pdo, 'order_items');
    if (!isset($itemColumns['variant_ids'])) {
        $pdo->exec($mysql ? 'ALTER TABLE order_items ADD COLUMN variant_ids VARCHAR(255) NULL' : 'ALTER TABLE order_items ADD COLUMN variant_ids TEXT');
    }

    if ($mysql) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS order_tracking_events (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id BIGINT UNSIGNED NOT NULL,
            status VARCHAR(30) NOT NULL,
            note VARCHAR(500) NOT NULL DEFAULT '',
            location VARCHAR(180) NOT NULL DEFAULT '',
            occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_order_tracking_events_order (order_id, occurred_at, id),
            CONSTRAINT fk_order_tracking_events_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $eventColumns = lumina_table_columns($pdo, 'order_tracking_events');
        if (str_starts_with($eventColumns['status'] ?? '', 'enum')) {
            $pdo->exec('ALTER TABLE order_tracking_events MODIFY status VARCHAR(30) NOT NULL');
        }
        if (!isset($eventColumns['location'])) {
            $pdo->exec("ALTER TABLE order_tracking_events ADD COLUMN location VARCHAR(180) NOT NULL DEFAULT '' AFTER note");
        }
        $indexes = array_column($pdo->query('SHOW INDEX FROM orders')->fetchAll(), 'Key_name');
        if (!in_array('uq_orders_tracking_number', $indexes, true)) {
            $pdo->exec('ALTER TABLE orders ADD UNIQUE KEY uq_orders_tracking_number (tracking_number)');
        }
        if (!in_array('idx_orders_shipment_status_created', $indexes, true)) {
            $pdo->exec('ALTER TABLE orders ADD KEY idx_orders_shipment_status_created (shipment_status, created_at)');
        }
        if (!in_array('idx_orders_carrier_tracking', $indexes, true)) {
            $pdo->exec('ALTER TABLE orders ADD KEY idx_orders_carrier_tracking (carrier_tracking_number)');
        }
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS order_tracking_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            location TEXT NOT NULL DEFAULT '',
            occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )");
        $eventColumns = lumina_table_columns($pdo, 'order_tracking_events');
        if (!isset($eventColumns['location'])) {
            $pdo->exec("ALTER TABLE order_tracking_events ADD COLUMN location TEXT NOT NULL DEFAULT ''");
        }
        $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tracking_number ON orders(tracking_number)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_orders_shipment_status_created ON orders(shipment_status, created_at)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_orders_carrier_tracking ON orders(carrier_tracking_number)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_order_tracking_events_order ON order_tracking_events(order_id, occurred_at, id)');
    }

    $ready[$key] = true;
}

function lumina_tracking_status_meta(string $status): array
{
    return match ($status) {
        'pending' => ['label' => 'Pedido recibido', 'title' => 'Pedido recibido', 'detail' => 'Recibimos tu pedido. Te escribiremos por WhatsApp para confirmarlo.'],
        'preparing' => ['label' => 'En preparación', 'title' => 'Pedido confirmado', 'detail' => 'Tu pedido fue confirmado y lo estamos preparando para el despacho.'],
        'shipped' => ['label' => 'Enviado', 'title' => 'Pedido enviado', 'detail' => 'Tu pedido fue entregado a la transportadora y está en camino.'],
        'out_for_delivery' => ['label' => 'En reparto', 'title' => 'En reparto', 'detail' => 'Tu pedido salió a reparto y llegará pronto a tu dirección.'],
        'delivered' => ['label' => 'Entregado', 'title' => 'Pedido entregado', 'detail' => 'Tu pedido fue entregado. ¡Gracias por tu compra!'],
        'issue' => ['label' => 'Novedad', 'title' => 'Novedad en la entrega', 'detail' => 'Hubo una novedad con la entrega. Te contactaremos para resolverla.'],
        'cancelled' => ['label' => 'Cancelado', 'title' => 'Pedido cancelado', 'detail' => 'Este pedido fue cancelado.'],
        default => throw new InvalidArgumentException('El estado de envío no es válido.'),
    };
}

/** Statuses an order may move to from its current one. */
function lumina_shipment_next_statuses(string $current): array
{
    return match ($current) {
        'pending' => ['preparing', 'shipped', 'cancelled'],
        'preparing' => ['pending', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
        'shipped' => ['preparing', 'out_for_delivery', 'delivered', 'issue', 'cancelled'],
        'out_for_delivery' => ['shipped', 'delivered', 'issue', 'cancelled'],
        'issue' => ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
        default => [], // delivered and cancelled are final
    };
}

function lumina_tracking_status_from_order(string $orderStatus): string
{
    return match ($orderStatus) {
        'cancelled' => 'cancelled',
        'completed' => 'delivered',
        'processing', 'confirmed' => 'preparing',
        default => 'pending',
    };
}

function lumina_order_status_for_shipment(string $shipmentStatus): string
{
    return match ($shipmentStatus) {
        'pending' => 'whatsapp_pending',
        'preparing' => 'confirmed',
        'shipped', 'out_for_delivery', 'issue' => 'processing',
        'delivered' => 'completed',
        'cancelled' => 'cancelled',
        default => throw new InvalidArgumentException('El estado de envío no es válido.'),
    };
}

function lumina_clean_tracking_code(mixed $value): string
{
    $value = strtoupper(lumina_clean_string($value, 80));
    $value = preg_replace('/[^A-Z0-9-]+/', '', $value) ?: '';
    $value = trim($value, '-');
    if (strlen($value) < 6 || strlen($value) > 60) {
        throw new InvalidArgumentException('El código de seguimiento debe tener entre 6 y 60 caracteres.');
    }
    return $value;
}

function lumina_new_tracking_code(): string
{
    return 'CS-' . gmdate('ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
}

/** Known Ecuadorian couriers: public tracking page and display name. */
function lumina_carrier_info(string $carrier): array
{
    $key = strtolower(preg_replace('/[^a-z]/i', '', $carrier) ?: '');
    $known = [
        'servientrega' => ['Servientrega', 'https://www.servientrega.com.ec/Tracking/BusquedaMultiplesGuias'],
        'laar' => ['Laar Courier', 'https://www.laarcourier.com/'],
        'tramaco' => ['Tramaco Express', 'https://www.tramaco.com.ec/'],
        'urbano' => ['Urbano Express', 'https://www.urbano.com.ec/'],
    ];
    foreach ($known as $needle => [$name, $url]) {
        if ($key !== '' && str_contains($key, $needle)) {
            return ['name' => $carrier, 'url' => $url, 'is_courier' => true];
        }
    }
    return ['name' => $carrier, 'url' => '', 'is_courier' => false];
}

function lumina_shipment_row(PDO $pdo, int $orderId): ?array
{
    $statement = $pdo->prepare('SELECT id, id AS order_id, status AS order_status, tracking_number AS tracking_code, carrier_tracking_number, shipping_carrier AS carrier_name, shipment_status AS status, shipment_note AS note, shipped_at AS dispatched_at, delivered_at, estimated_delivery, stock_applied, created_at, updated_at FROM orders WHERE id = ? LIMIT 1');
    $statement->execute([$orderId]);
    return $statement->fetch() ?: null;
}

function lumina_add_shipment_event(PDO $pdo, int $orderId, string $status, ?string $detail = null, ?string $location = null): void
{
    $meta = lumina_tracking_status_meta($status);
    $statement = $pdo->prepare('INSERT INTO order_tracking_events (order_id, status, note, location, occurred_at, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
    $statement->execute([
        $orderId,
        $status,
        $detail !== null && $detail !== '' ? $detail : $meta['detail'],
        (string) ($location ?? ''),
    ]);
}

function lumina_create_order_shipment(PDO $pdo, int $orderId, string $orderStatus = 'whatsapp_pending', ?string $trackingCode = null): array
{
    lumina_ensure_tracking_schema($pdo);
    $existing = lumina_shipment_row($pdo, $orderId);
    if ($existing && !empty($existing['tracking_code'])) {
        return $existing;
    }

    $status = $existing && in_array((string) $existing['status'], LUMINA_SHIPMENT_STATUSES, true)
        ? (string) $existing['status']
        : lumina_tracking_status_from_order($orderStatus);
    $attempts = 0;
    do {
        $code = $trackingCode !== null ? lumina_clean_tracking_code($trackingCode) : lumina_new_tracking_code();
        try {
            $statement = $pdo->prepare('UPDATE orders SET tracking_number = ?, shipment_status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
            $statement->execute([$code, $status, $orderId]);
            lumina_add_shipment_event($pdo, $orderId, $status);
            $created = lumina_shipment_row($pdo, $orderId);
            if (!$created) {
                throw new RuntimeException('No fue posible preparar el seguimiento del pedido.');
            }
            return $created;
        } catch (PDOException $exception) {
            if ($trackingCode !== null || ++$attempts >= 5) {
                throw new InvalidArgumentException('El código de seguimiento ya está en uso.');
            }
        }
    } while ($attempts < 5);

    throw new RuntimeException('No fue posible generar un código de seguimiento.');
}

/**
 * Discounts (direction -1) or returns (+1) the stock of every order line.
 * Fails with a clear message when a product no longer has enough units.
 */
function lumina_apply_order_stock(PDO $pdo, int $orderId, int $direction): void
{
    $items = $pdo->prepare('SELECT product_id, product_name, variant_ids, quantity FROM order_items WHERE order_id = ?');
    $items->execute([$orderId]);
    $productUpdate = $direction < 0
        ? $pdo->prepare('UPDATE products SET stock = stock - ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND stock >= ?')
        : $pdo->prepare('UPDATE products SET stock = stock + ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
    $variantUpdate = $direction < 0
        ? $pdo->prepare('UPDATE product_variants SET stock = stock - ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND product_id = ? AND stock >= ?')
        : $pdo->prepare('UPDATE product_variants SET stock = stock + ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND product_id = ?');
    $remaining = $pdo->prepare('SELECT stock FROM products WHERE id = ?');

    foreach ($items->fetchAll() as $item) {
        if ($item['product_id'] === null) {
            continue; // Product was deleted; nothing to discount or return.
        }
        $productId = (int) $item['product_id'];
        $quantity = (int) $item['quantity'];
        if ($direction < 0) {
            $productUpdate->execute([$quantity, $productId, $quantity]);
            if ($productUpdate->rowCount() === 0) {
                $remaining->execute([$productId]);
                $left = $remaining->fetchColumn();
                throw new InvalidArgumentException(sprintf(
                    'No hay stock suficiente de "%s" (quedan %d). Ajusta el stock del producto antes de confirmar.',
                    $item['product_name'],
                    $left === false ? 0 : (int) $left
                ));
            }
        } else {
            $productUpdate->execute([$quantity, $productId]);
        }
        $variantIds = array_filter(array_map('intval', explode(',', (string) ($item['variant_ids'] ?? ''))));
        foreach ($variantIds as $variantId) {
            if ($direction < 0) {
                $variantUpdate->execute([$quantity, $variantId, $productId, $quantity]);
                if ($variantUpdate->rowCount() === 0) {
                    throw new InvalidArgumentException(sprintf('No hay stock suficiente de la variante elegida para "%s".', $item['product_name']));
                }
            } else {
                $variantUpdate->execute([$quantity, $variantId, $productId]);
            }
        }
    }
}

function lumina_shipment_events(PDO $pdo, array $orderIds): array
{
    if (!$orderIds) {
        return [];
    }
    $marks = implode(',', array_fill(0, count($orderIds), '?'));
    $statement = $pdo->prepare("SELECT id, order_id, status, note AS detail, location, occurred_at FROM order_tracking_events WHERE order_id IN ({$marks}) ORDER BY occurred_at DESC, id DESC");
    $statement->execute($orderIds);
    $byOrder = [];
    foreach ($statement->fetchAll() as $event) {
        $orderId = (int) $event['order_id'];
        $status = in_array((string) $event['status'], LUMINA_SHIPMENT_STATUSES, true) ? (string) $event['status'] : 'pending';
        $meta = lumina_tracking_status_meta($status);
        $byOrder[$orderId][] = [
            'id' => (int) $event['id'],
            'shipment_id' => $orderId,
            'status' => $status,
            'status_label' => $meta['label'],
            'title' => $meta['title'],
            'detail' => (string) $event['detail'],
            'location' => (string) ($event['location'] ?? ''),
            'occurred_at' => $event['occurred_at'],
        ];
    }
    return $byOrder;
}

function lumina_hydrate_order_shipments(PDO $pdo, array &$orders): void
{
    if (!$orders) {
        return;
    }
    lumina_ensure_tracking_schema($pdo);
    $shipments = [];
    foreach ($orders as $order) {
        $shipment = lumina_create_order_shipment($pdo, (int) $order['id'], (string) ($order['status'] ?? 'whatsapp_pending'));
        $shipments[(int) $order['id']] = $shipment;
    }
    $events = lumina_shipment_events($pdo, array_keys($shipments));
    foreach ($orders as &$order) {
        $shipment = $shipments[(int) $order['id']] ?? null;
        if (!$shipment) {
            continue;
        }
        $status = in_array((string) $shipment['status'], LUMINA_SHIPMENT_STATUSES, true) ? (string) $shipment['status'] : 'pending';
        $carrier = lumina_carrier_info((string) $shipment['carrier_name']);
        $history = $events[(int) $order['id']] ?? [];
        $order['tracking_code'] = $shipment['tracking_code'];
        $order['tracking_number'] = $shipment['tracking_code'];
        $order['carrier_tracking_number'] = (string) ($shipment['carrier_tracking_number'] ?? '');
        $order['shipping_carrier'] = (string) $shipment['carrier_name'];
        $order['carrier_tracking_url'] = $carrier['url'];
        $order['shipment_note'] = (string) $shipment['note'];
        $order['shipped_at'] = $shipment['dispatched_at'];
        $order['delivered_at'] = $shipment['delivered_at'];
        $order['estimated_delivery'] = $shipment['estimated_delivery'] ?: null;
        $order['shipment_status'] = $status;
        $order['shipment_status_label'] = lumina_tracking_status_meta($status)['label'];
        $order['next_statuses'] = lumina_shipment_next_statuses($status);
        $order['stock_applied'] = (int) $shipment['stock_applied'];
        $order['tracking_history'] = $history;
        $order['tracking_events'] = $history;
        $order['shipment'] = [
            'status' => $status,
            'status_label' => $order['shipment_status_label'],
            'tracking_code' => $shipment['tracking_code'],
            'carrier_name' => $order['shipping_carrier'],
            'carrier_tracking_number' => $order['carrier_tracking_number'],
            'events' => $history,
        ];
    }
    unset($order);
}

/**
 * Moves an order through the shipment pipeline. Every change validates the
 * transition, keeps the commercial status in sync, moves stock exactly once,
 * and adds an entry to the customer-visible history.
 */
function lumina_save_order_shipment(PDO $pdo, int $orderId, array $data, ?int $userId): array
{
    lumina_ensure_tracking_schema($pdo);
    $pdo->beginTransaction();
    try {
        $lock = lumina_db_driver() === 'mysql' ? ' FOR UPDATE' : '';
        $orderStatement = $pdo->prepare("SELECT id, reference_code, status FROM orders WHERE id = ? LIMIT 1{$lock}");
        $orderStatement->execute([$orderId]);
        $order = $orderStatement->fetch();
        if (!$order) {
            throw new InvalidArgumentException('El pedido ya no existe.');
        }
        $shipment = lumina_create_order_shipment($pdo, $orderId, (string) $order['status']);
        $current = in_array((string) $shipment['status'], LUMINA_SHIPMENT_STATUSES, true) ? (string) $shipment['status'] : 'pending';
        $status = strtolower(lumina_clean_string($data['status'] ?? $data['shipment_status'] ?? $current, 30));
        $meta = lumina_tracking_status_meta($status);
        $changing = $status !== $current;

        if ($changing && !in_array($status, lumina_shipment_next_statuses($current), true)) {
            $currentLabel = lumina_tracking_status_meta($current)['label'];
            throw new InvalidArgumentException(in_array($current, ['delivered', 'cancelled'], true)
                ? "El pedido ya está «{$currentLabel}» y no puede cambiar de estado."
                : "No se puede pasar de «{$currentLabel}» a «{$meta['label']}».");
        }

        $carrierName = lumina_clean_string($data['carrier_name'] ?? $data['shipping_carrier'] ?? $shipment['carrier_name'] ?? '', 100);
        $carrierGuideRaw = trim((string) ($data['carrier_tracking_number'] ?? $shipment['carrier_tracking_number'] ?? ''));
        $carrierGuide = $carrierGuideRaw === '' ? '' : lumina_clean_tracking_code($carrierGuideRaw);
        $note = lumina_clean_string($data['event_note'] ?? '', 500);
        $location = lumina_clean_string($data['event_location'] ?? '', 180);
        $estimatedRaw = trim((string) ($data['estimated_delivery'] ?? ($shipment['estimated_delivery'] ?? '')));
        $estimated = null;
        if ($estimatedRaw !== '') {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', substr($estimatedRaw, 0, 10));
            if (!$date) {
                throw new InvalidArgumentException('La fecha estimada de entrega no es válida.');
            }
            $estimated = $date->format('Y-m-d');
        }

        if (in_array($status, ['shipped', 'out_for_delivery'], true) && $carrierName === '') {
            throw new InvalidArgumentException('Indica la transportadora o el método de entrega antes de marcar el pedido como enviado.');
        }
        if ($carrierGuide !== '') {
            $duplicate = $pdo->prepare('SELECT reference_code FROM orders WHERE carrier_tracking_number = ? AND id <> ? LIMIT 1');
            $duplicate->execute([$carrierGuide, $orderId]);
            $other = $duplicate->fetchColumn();
            if ($other) {
                throw new InvalidArgumentException("La guía {$carrierGuide} ya está asignada al pedido {$other}.");
            }
        }
        if ($status === 'issue' && $changing && $note === '') {
            throw new InvalidArgumentException('Describe la novedad para que el cliente sepa qué ocurrió (por ejemplo: "No había nadie en la dirección").');
        }

        // Stock moves exactly once in each direction.
        $stockApplied = (int) $shipment['stock_applied'];
        if ($stockApplied === 0 && !in_array($status, ['pending', 'cancelled'], true)) {
            lumina_apply_order_stock($pdo, $orderId, -1);
            $stockApplied = 1;
        } elseif ($stockApplied === 1 && in_array($status, ['pending', 'cancelled'], true)) {
            lumina_apply_order_stock($pdo, $orderId, +1);
            $stockApplied = 0;
        }

        $dispatchedAt = $shipment['dispatched_at'] ?? null;
        $deliveredAt = $shipment['delivered_at'] ?? null;
        if (in_array($status, ['shipped', 'out_for_delivery', 'delivered'], true) && !$dispatchedAt) {
            $dispatchedAt = gmdate('Y-m-d H:i:s');
        }
        if ($status === 'delivered' && !$deliveredAt) {
            $deliveredAt = gmdate('Y-m-d H:i:s');
        }
        if (in_array($status, ['pending', 'preparing'], true)) {
            $dispatchedAt = null;
        }

        $update = $pdo->prepare('UPDATE orders SET shipping_carrier = ?, carrier_tracking_number = ?, shipment_status = ?, shipment_note = ?, estimated_delivery = ?, shipped_at = ?, delivered_at = ?, stock_applied = ?, status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
        $update->execute([
            $carrierName,
            $carrierGuide,
            $status,
            $note !== '' ? $note : (string) ($shipment['note'] ?? ''),
            $estimated,
            $dispatchedAt,
            $deliveredAt,
            $stockApplied,
            lumina_order_status_for_shipment($status),
            $orderId,
        ]);

        if ($changing || $note !== '' || $location !== '') {
            $detail = $note;
            if ($changing && $status === 'shipped' && $note === '') {
                $detail = $meta['detail'] . ($carrierName !== '' ? " Transportadora: {$carrierName}." : '') . ($carrierGuide !== '' ? " Guía: {$carrierGuide}." : '');
            }
            lumina_add_shipment_event($pdo, $orderId, $status, $detail !== '' ? $detail : null, $location);
        }
        lumina_record_activity($pdo, $userId, 'shipment_updated', 'order', $orderId, "Pedido {$order['reference_code']}: {$meta['label']}");
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $exception;
    }

    $updated = lumina_admin_order($pdo, $orderId);
    if (!$updated) {
        throw new RuntimeException('No fue posible recuperar el pedido actualizado.');
    }
    return $updated;
}

/**
 * Public tracking by store guide (CS-…) or courier guide. The response never
 * contains the customer's name, phone, address, note or purchased items.
 */
function lumina_public_order_tracking(PDO $pdo, string $trackingCode): ?array
{
    lumina_ensure_tracking_schema($pdo);
    $trackingCode = lumina_clean_tracking_code($trackingCode);
    $statement = $pdo->prepare("SELECT id, reference_code, tracking_number, carrier_tracking_number, shipping_carrier, shipment_status, shipping_city, estimated_delivery, shipped_at, delivered_at, created_at, updated_at FROM orders WHERE tracking_number = ? OR (carrier_tracking_number <> '' AND carrier_tracking_number = ?) ORDER BY id DESC LIMIT 1");
    $statement->execute([$trackingCode, $trackingCode]);
    $shipment = $statement->fetch();
    if (!$shipment) {
        return null;
    }
    $status = in_array((string) $shipment['shipment_status'], LUMINA_SHIPMENT_STATUSES, true) ? (string) $shipment['shipment_status'] : 'pending';
    $meta = lumina_tracking_status_meta($status);
    $events = lumina_shipment_events($pdo, [(int) $shipment['id']]);
    $carrier = lumina_carrier_info((string) ($shipment['shipping_carrier'] ?? ''));

    // Progress for the 5-step bar. A delivery issue keeps the last reached step.
    $reached = $status;
    if ($status === 'issue') {
        $reached = 'shipped';
        foreach ($events[(int) $shipment['id']] ?? [] as $event) {
            if (in_array($event['status'], LUMINA_SHIPMENT_FLOW, true)) {
                $reached = $event['status'];
                break;
            }
        }
    }
    $stepIndex = array_search($reached, LUMINA_SHIPMENT_FLOW, true);
    $steps = array_map(static fn(string $step): array => ['status' => $step, 'label' => lumina_tracking_status_meta($step)['label']], LUMINA_SHIPMENT_FLOW);

    return [
        'tracking_code' => (string) $shipment['tracking_number'],
        'order_reference' => (string) $shipment['reference_code'],
        'status' => $status,
        'status_label' => $meta['label'],
        'status_detail' => $meta['detail'],
        'steps' => $steps,
        'step_index' => $stepIndex === false ? 0 : (int) $stepIndex,
        'carrier_name' => $carrier['name'],
        'carrier_tracking_code' => (string) ($shipment['carrier_tracking_number'] ?? ''),
        'carrier_tracking_url' => $carrier['url'],
        'destination_city' => (string) ($shipment['shipping_city'] ?? ''),
        'estimated_delivery' => $shipment['estimated_delivery'] ?: null,
        'ordered_at' => $shipment['created_at'],
        'dispatched_at' => $shipment['shipped_at'] ?: null,
        'delivered_at' => $shipment['delivered_at'] ?: null,
        'updated_at' => $shipment['updated_at'],
        'events' => $events[(int) $shipment['id']] ?? [],
    ];
}

/**
 * Returns order records in the shape used by the administration panel.
 *
 * Order item details are stored as a historical snapshot, so the customer
 * service view remains useful even when a product has later been edited or
 * permanently deleted. The optional product data and image are only used to
 * enrich the display while that product still exists.
 */
function lumina_admin_orders(PDO $pdo, int $limit = 250): array
{
    $limit = max(1, min(500, $limit));
    lumina_ensure_tracking_schema($pdo);
    $orders = $pdo->query("SELECT id, reference_code, status, customer_name, customer_phone, customer_note, currency, subtotal, discount_total, total, tracking_number, carrier_tracking_number, shipping_carrier, shipment_status, shipment_note, shipping_city, shipping_address, estimated_delivery, shipped_at, delivered_at, created_at, updated_at FROM orders ORDER BY created_at DESC, id DESC LIMIT {$limit}")->fetchAll();
    return lumina_hydrate_admin_orders($pdo, $orders ?: []);
}

function lumina_admin_order(PDO $pdo, int $id): ?array
{
    lumina_ensure_tracking_schema($pdo);
    $statement = $pdo->prepare('SELECT id, reference_code, status, customer_name, customer_phone, customer_note, currency, subtotal, discount_total, total, tracking_number, carrier_tracking_number, shipping_carrier, shipment_status, shipment_note, shipping_city, shipping_address, estimated_delivery, shipped_at, delivered_at, created_at, updated_at FROM orders WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $orders = lumina_hydrate_admin_orders($pdo, $statement->fetchAll());
    return $orders[0] ?? null;
}

function lumina_hydrate_admin_orders(PDO $pdo, array $orders): array
{
    if (!$orders) {
        return [];
    }

    $ids = array_values(array_unique(array_map(static fn(array $order): int => (int) $order['id'], $orders)));
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $itemsStatement = $pdo->prepare("SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.product_sku, oi.variant_label, oi.quantity, oi.unit_price, oi.line_total, oi.created_at,
                p.slug AS product_slug, p.status AS product_status,
                (SELECT m.path FROM product_images pi INNER JOIN media m ON m.id = pi.media_id WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image_path
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id IN ({$marks})
            ORDER BY oi.order_id ASC, oi.id ASC");
    $itemsStatement->execute($ids);

    $itemsByOrder = [];
    foreach ($itemsStatement->fetchAll() as $item) {
        $orderId = (int) $item['order_id'];
        $item['id'] = (int) $item['id'];
        $item['order_id'] = $orderId;
        $item['product_id'] = $item['product_id'] !== null ? (int) $item['product_id'] : null;
        $item['quantity'] = (int) $item['quantity'];
        $item['unit_price'] = (float) $item['unit_price'];
        $item['line_total'] = (float) $item['line_total'];
        $item['image_url'] = lumina_public_path($item['image_path'] ?: '');
        unset($item['image_path']);
        $itemsByOrder[$orderId][] = $item;
    }

    foreach ($orders as &$order) {
        $orderId = (int) $order['id'];
        $order['id'] = $orderId;
        $order['subtotal'] = (float) $order['subtotal'];
        $order['discount_total'] = (float) $order['discount_total'];
        $order['total'] = (float) $order['total'];
        // The first production schema stores shipping inside the final total.
        // Keep it explicit for the admin UI without changing historic records.
        $shipping = round(max(0, $order['total'] - $order['subtotal'] + $order['discount_total']), 2);
        $order['shipping'] = $shipping;
        $order['shipping_total'] = $shipping;
        $order['items'] = $itemsByOrder[$orderId] ?? [];
        $order['item_count'] = count($order['items']);
        $order['total_quantity'] = array_sum(array_map(static fn(array $item): int => (int) $item['quantity'], $order['items']));
    }
    unset($order);

    lumina_hydrate_order_shipments($pdo, $orders);

    return $orders;
}

/**
 * Confirm / cancel shortcuts used by the orders view. They run through the
 * same shipment pipeline, so stock and history stay consistent.
 */
function lumina_change_order_status(PDO $pdo, int $id, string $nextStatus, ?int $userId): array
{
    $shipmentStatus = match ($nextStatus) {
        'confirmed' => 'preparing',
        'cancelled' => 'cancelled',
        default => throw new InvalidArgumentException('El estado de pedido no es válido.'),
    };
    return lumina_save_order_shipment($pdo, $id, ['status' => $shipmentStatus], $userId);
}

function lumina_delete_order(PDO $pdo, int $id, ?int $userId): void
{
    lumina_ensure_tracking_schema($pdo);
    $pdo->beginTransaction();
    try {
        $lock = lumina_db_driver() === 'mysql' ? ' FOR UPDATE' : '';
        $statement = $pdo->prepare("SELECT reference_code, shipment_status, stock_applied FROM orders WHERE id = ? LIMIT 1{$lock}");
        $statement->execute([$id]);
        $order = $statement->fetch();
        if (!$order) {
            throw new InvalidArgumentException('El pedido ya no existe.');
        }
        // Deleting an active order that already took stock gives the units back;
        // a delivered order's units really left the store, so they stay out.
        if ((int) $order['stock_applied'] === 1 && $order['shipment_status'] !== 'delivered') {
            lumina_apply_order_stock($pdo, $id, +1);
        }
        // The foreign key removes associated lines; this is intentionally a
        // permanent back-office action and is protected by UI confirmation.
        $pdo->prepare('DELETE FROM orders WHERE id = ?')->execute([$id]);
        lumina_record_activity($pdo, $userId, 'deleted', 'order', $id, "Pedido {$order['reference_code']} eliminado permanentemente");
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $exception;
    }
}

function lumina_product_variants(PDO $pdo, int $productId): array
{
    $statement = $pdo->prepare('SELECT id, option_name, option_value, sku, price_delta, stock, sort_order FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, id ASC');
    $statement->execute([$productId]);
    return $statement->fetchAll();
}

function lumina_product_media_ids(PDO $pdo, int $productId): array
{
    $statement = $pdo->prepare('SELECT media_id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC');
    $statement->execute([$productId]);
    return array_map('intval', array_column($statement->fetchAll(), 'media_id'));
}

function lumina_admin_records(PDO $pdo, string $resource): array
{
    $records = match ($resource) {
        'categories' => lumina_admin_categories($pdo),
        'products' => lumina_admin_products($pdo),
        'banners' => $pdo->query("SELECT b.*, m.path AS image_path FROM banners b LEFT JOIN media m ON m.id = b.media_id ORDER BY b.sort_order ASC, b.id DESC")->fetchAll(),
        'campaigns' => $pdo->query('SELECT * FROM campaigns ORDER BY sort_order ASC, id DESC')->fetchAll(),
        'notices' => $pdo->query('SELECT * FROM notices ORDER BY priority DESC, id DESC')->fetchAll(),
        'trust-cards' => $pdo->query('SELECT * FROM trust_cards ORDER BY sort_order ASC, id ASC')->fetchAll(),
        'reviews' => $pdo->query(lumina_db_driver() === 'sqlite'
            ? "SELECT r.*, p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id ORDER BY CASE r.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 WHEN 'rejected' THEN 3 WHEN 'hidden' THEN 4 ELSE 5 END, r.created_at DESC"
            : "SELECT r.*, p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id ORDER BY FIELD(r.status, 'pending', 'approved', 'rejected', 'hidden'), r.created_at DESC"
        )->fetchAll(),
        default => throw new InvalidArgumentException('Recurso no disponible.'),
    };
    if ($resource === 'banners') {
        foreach ($records as &$record) {
            $record['image_url'] = lumina_public_path($record['image_path'] ?: '');
            unset($record['image_path']);
        }
        unset($record);
    }
    return $records;
}

function lumina_admin_bootstrap(PDO $pdo): array
{
    $settings = lumina_settings($pdo);
    $settings['logo_url'] = lumina_media_url($pdo, $settings['logo_media_id'] ?? null);
    $settings['favicon_url'] = lumina_media_url($pdo, $settings['favicon_media_id'] ?? null);
    return [
        'settings' => $settings,
        'categories' => lumina_admin_categories($pdo),
        'products' => lumina_admin_products($pdo),
        'banners' => lumina_admin_records($pdo, 'banners'),
        'campaigns' => lumina_admin_records($pdo, 'campaigns'),
        'notices' => lumina_admin_records($pdo, 'notices'),
        'trustCards' => lumina_admin_records($pdo, 'trust-cards'),
        'reviews' => lumina_admin_records($pdo, 'reviews'),
        'orders' => lumina_admin_orders($pdo),
        'activity' => lumina_admin_activity($pdo),
    ];
}

function lumina_admin_activity(PDO $pdo): array
{
    $rows = $pdo->query('SELECT a.event_name, a.entity_type, a.entity_id, a.summary, a.created_at, u.name AS user_name FROM activity_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC, a.id DESC LIMIT 12')->fetchAll();
    return $rows ?: [];
}

function lumina_record_activity(PDO $pdo, ?int $userId, string $event, string $entityType, ?int $entityId, string $summary): void
{
    $statement = $pdo->prepare('INSERT INTO activity_log (user_id, event_name, entity_type, entity_id, summary, created_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())');
    $statement->execute([$userId, $event, $entityType, $entityId, mb_substr($summary, 0, 255)]);
}

function lumina_exists(PDO $pdo, string $table, int $id): bool
{
    $allowed = ['categories', 'products', 'media'];
    if (!in_array($table, $allowed, true)) {
        return false;
    }
    $statement = $pdo->prepare("SELECT 1 FROM {$table} WHERE id = ? LIMIT 1");
    $statement->execute([$id]);
    return (bool) $statement->fetchColumn();
}

function lumina_unique_slug(PDO $pdo, string $table, string $slug, ?int $exceptId = null): void
{
    $allowed = ['categories', 'products'];
    if (!in_array($table, $allowed, true)) {
        throw new InvalidArgumentException('Tabla no permitida.');
    }
    $sql = "SELECT id FROM {$table} WHERE slug = ?" . ($exceptId ? ' AND id != ?' : '') . ' LIMIT 1';
    $statement = $pdo->prepare($sql);
    $statement->execute($exceptId ? [$slug, $exceptId] : [$slug]);
    if ($statement->fetch()) {
        throw new InvalidArgumentException('Ese slug ya está en uso.');
    }
}

function lumina_save_category(PDO $pdo, array $data, ?int $id, ?int $userId): array
{
    $name = lumina_clean_string($data['name'] ?? '', 120);
    $slug = lumina_slug($data['slug'] ?? $name);
    if ($name === '' || $slug === '') {
        throw new InvalidArgumentException('Nombre y slug de categoría son obligatorios.');
    }
    lumina_unique_slug($pdo, 'categories', $slug, $id);
    $status = in_array($data['status'] ?? 'active', ['active', 'hidden', 'archived'], true) ? $data['status'] : 'active';
    $mediaId = !empty($data['media_id']) ? lumina_int($data['media_id'], 1) : null;
    if ($mediaId && !lumina_exists($pdo, 'media', $mediaId)) {
        throw new InvalidArgumentException('La imagen seleccionada no existe.');
    }
    $values = [$name, $slug, lumina_clean_string($data['description'] ?? '', 500), $mediaId, lumina_int($data['sort_order'] ?? 0), $status];
    if ($id) {
        $statement = $pdo->prepare('UPDATE categories SET name = ?, slug = ?, description = ?, media_id = ?, sort_order = ?, status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
        $statement->execute([...$values, $id]);
    } else {
        $statement = $pdo->prepare('INSERT INTO categories (name, slug, description, media_id, sort_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
        $statement->execute($values);
        $id = (int) $pdo->lastInsertId();
    }
    lumina_record_activity($pdo, $userId, 'saved', 'category', $id, "Categoría {$name} guardada");
    return ['id' => $id];
}

function lumina_save_product(PDO $pdo, array $data, ?int $id, ?int $userId): array
{
    $name = lumina_clean_string($data['name'] ?? '', 180);
    $slug = lumina_slug($data['slug'] ?? $name);
    $sku = strtoupper(lumina_clean_string($data['sku'] ?? '', 80));
    $categoryId = lumina_int($data['category_id'] ?? 0, 1);
    $regular = lumina_decimal($data['regular_price'] ?? null, 0.01);
    $sale = ($data['sale_price'] ?? '') === '' || $data['sale_price'] === null ? null : lumina_decimal($data['sale_price'], 0.01);
    if ($name === '' || $slug === '' || $sku === '') {
        throw new InvalidArgumentException('Nombre, slug y SKU son obligatorios.');
    }
    if ($sale !== null && $sale >= $regular) {
        throw new InvalidArgumentException('El precio promocional debe ser menor al precio regular.');
    }
    if (!lumina_exists($pdo, 'categories', $categoryId)) {
        throw new InvalidArgumentException('Selecciona una categoría válida.');
    }
    lumina_unique_slug($pdo, 'products', $slug, $id);
    $skuCheck = $pdo->prepare('SELECT id FROM products WHERE sku = ?' . ($id ? ' AND id != ?' : '') . ' LIMIT 1');
    $skuCheck->execute($id ? [$sku, $id] : [$sku]);
    if ($skuCheck->fetch()) {
        throw new InvalidArgumentException('Ese SKU ya está en uso.');
    }
    $status = in_array($data['status'] ?? 'draft', ['active', 'draft', 'out_of_stock', 'archived'], true) ? $data['status'] : 'draft';
    $values = [
        $categoryId, $name, $slug, lumina_clean_string($data['short_description'] ?? '', 360), lumina_clean_string($data['long_description'] ?? '', 4000),
        $regular, $sale, lumina_int($data['stock'] ?? 0), lumina_int($data['low_stock_threshold'] ?? 0), $sku,
        lumina_clean_string($data['badge'] ?? '', 50), lumina_int($data['sort_order'] ?? 0), $status,
    ];
    $pdo->beginTransaction();
    try {
        if ($id) {
            $statement = $pdo->prepare('UPDATE products SET category_id = ?, name = ?, slug = ?, short_description = ?, long_description = ?, regular_price = ?, sale_price = ?, stock = ?, low_stock_threshold = ?, sku = ?, badge = ?, sort_order = ?, status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
            $statement->execute([...$values, $id]);
        } else {
            $statement = $pdo->prepare('INSERT INTO products (category_id, name, slug, short_description, long_description, regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
            $statement->execute($values);
            $id = (int) $pdo->lastInsertId();
        }
        $pdo->prepare('DELETE FROM product_variants WHERE product_id = ?')->execute([$id]);
        foreach (($data['variants'] ?? []) as $order => $variant) {
            if (!is_array($variant)) continue;
            $optionName = lumina_clean_string($variant['option_name'] ?? '', 80);
            $optionValue = lumina_clean_string($variant['option_value'] ?? '', 120);
            if ($optionName === '' || $optionValue === '') continue;
            $variantSku = strtoupper(lumina_clean_string($variant['sku'] ?? '', 80));
            $insert = $pdo->prepare('INSERT INTO product_variants (product_id, option_name, option_value, sku, price_delta, stock, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
            $insert->execute([$id, $optionName, $optionValue, $variantSku ?: null, lumina_decimal($variant['price_delta'] ?? 0), lumina_int($variant['stock'] ?? 0), (int) $order]);
        }
        $mediaIds = array_values(array_unique(array_filter(array_map(fn($item) => filter_var($item, FILTER_VALIDATE_INT) ?: null, $data['media_ids'] ?? []))));
        $pdo->prepare('DELETE FROM product_images WHERE product_id = ?')->execute([$id]);
        foreach ($mediaIds as $order => $mediaId) {
            if (!lumina_exists($pdo, 'media', (int) $mediaId)) continue;
            $insert = $pdo->prepare('INSERT INTO product_images (product_id, media_id, alt_text, sort_order, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())');
            $insert->execute([$id, $mediaId, lumina_clean_string($data['image_alt'] ?? $name, 180), $order]);
        }
        lumina_record_activity($pdo, $userId, 'saved', 'product', $id, "Producto {$name} guardado");
        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
    return ['id' => $id];
}

function lumina_save_banner(PDO $pdo, array $data, ?int $id, ?int $userId): array
{
    $title = lumina_clean_string($data['title'] ?? '', 180);
    if ($title === '') throw new InvalidArgumentException('El título es obligatorio.');
    $status = in_array($data['status'] ?? 'draft', ['active', 'draft', 'paused', 'archived'], true) ? $data['status'] : 'draft';
    $mediaId = !empty($data['media_id']) ? lumina_int($data['media_id'], 1) : null;
    if ($mediaId && !lumina_exists($pdo, 'media', $mediaId)) {
        throw new InvalidArgumentException('La imagen seleccionada no existe.');
    }
    $startsAt = lumina_optional_date($data['starts_at'] ?? '');
    $endsAt = lumina_optional_date($data['ends_at'] ?? '', true);
    if ($startsAt && $endsAt && $endsAt < $startsAt) {
        throw new InvalidArgumentException('La fecha de finalización debe ser posterior a la de inicio.');
    }
    $values = [lumina_clean_string($data['eyebrow'] ?? '', 80), $title, lumina_clean_string($data['body'] ?? '', 600), lumina_clean_string($data['cta_label'] ?? '', 70), lumina_url_or_anchor($data['cta_target'] ?? ''), in_array($data['theme'] ?? 'light', ['light', 'dark', 'warm'], true) ? $data['theme'] : 'light', $mediaId, lumina_int($data['sort_order'] ?? 0), $status, $startsAt, $endsAt];
    if ($id) {
        $pdo->prepare('UPDATE banners SET eyebrow=?, title=?, body=?, cta_label=?, cta_target=?, theme=?, media_id=?, sort_order=?, status=?, starts_at=?, ends_at=?, updated_at=UTC_TIMESTAMP() WHERE id=?')->execute([...$values, $id]);
    } else {
        $pdo->prepare('INSERT INTO banners (eyebrow,title,body,cta_label,cta_target,theme,media_id,sort_order,status,starts_at,ends_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())')->execute($values);
        $id = (int) $pdo->lastInsertId();
    }
    lumina_record_activity($pdo, $userId, 'saved', 'banner', $id, "Banner {$title} guardado");
    return ['id' => $id];
}

function lumina_save_campaign(PDO $pdo, array $data, ?int $id, ?int $userId): array
{
    $name = lumina_clean_string($data['name'] ?? '', 160);
    $title = lumina_clean_string($data['title'] ?? '', 180);
    if ($name === '' || $title === '') throw new InvalidArgumentException('Nombre y título son obligatorios.');
    $targetType = in_array($data['target_type'] ?? 'all', ['all', 'category', 'product'], true) ? $data['target_type'] : 'all';
    $status = in_array($data['status'] ?? 'draft', ['active', 'draft', 'paused', 'archived'], true) ? $data['status'] : 'draft';
    $targetId = $targetType === 'all' ? null : lumina_int($data['target_id'] ?? 0, 1);
    if ($targetId && !lumina_exists($pdo, $targetType === 'category' ? 'categories' : 'products', $targetId)) {
        throw new InvalidArgumentException('El destino de la campaña ya no existe.');
    }
    $startsAt = lumina_optional_date($data['starts_at'] ?? '');
    $endsAt = lumina_optional_date($data['ends_at'] ?? '', true);
    if ($startsAt && $endsAt && $endsAt < $startsAt) {
        throw new InvalidArgumentException('La fecha de finalización debe ser posterior a la de inicio.');
    }
    $values = [$name, in_array($data['type'] ?? 'promotion', ['promotion', 'sale', 'campaign', 'benefit'], true) ? $data['type'] : 'promotion', $title, lumina_clean_string($data['message'] ?? '', 700), lumina_clean_string($data['code'] ?? '', 60), lumina_decimal($data['discount_percent'] ?? 0), $targetType, $targetId, lumina_clean_string($data['cta_label'] ?? '', 70), lumina_url_or_anchor($data['cta_target'] ?? ''), in_array($data['theme'] ?? 'blue', ['blue', 'dark', 'warm'], true) ? $data['theme'] : 'blue', lumina_int($data['sort_order'] ?? 0), $status, $startsAt, $endsAt];
    if ($id) {
        $pdo->prepare('UPDATE campaigns SET name=?, type=?, title=?, message=?, code=?, discount_percent=?, target_type=?, target_id=?, cta_label=?, cta_target=?, theme=?, sort_order=?, status=?, starts_at=?, ends_at=?, updated_at=UTC_TIMESTAMP() WHERE id=?')->execute([...$values, $id]);
    } else {
        $pdo->prepare('INSERT INTO campaigns (name,type,title,message,code,discount_percent,target_type,target_id,cta_label,cta_target,theme,sort_order,status,starts_at,ends_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())')->execute($values);
        $id = (int) $pdo->lastInsertId();
    }
    lumina_record_activity($pdo, $userId, 'saved', 'campaign', $id, "Campaña {$name} guardada");
    return ['id' => $id];
}

function lumina_save_notice(PDO $pdo, array $data, ?int $id, ?int $userId): array
{
    $title = lumina_clean_string($data['title'] ?? '', 160);
    $message = lumina_clean_string($data['message'] ?? '', 500);
    if ($title === '' || $message === '') throw new InvalidArgumentException('Título y mensaje son obligatorios.');
    $startsAt = lumina_optional_date($data['starts_at'] ?? '');
    $endsAt = lumina_optional_date($data['ends_at'] ?? '', true);
    if ($startsAt && $endsAt && $endsAt < $startsAt) {
        throw new InvalidArgumentException('La fecha de finalización debe ser posterior a la de inicio.');
    }
    $values = [in_array($data['type'] ?? 'info', ['info', 'promotion', 'warning', 'alert'], true) ? $data['type'] : 'info', $title, $message, lumina_clean_string($data['cta_label'] ?? '', 70), lumina_url_or_anchor($data['cta_target'] ?? ''), lumina_bool($data['dismissible'] ?? true), lumina_int($data['priority'] ?? 0), in_array($data['status'] ?? 'draft', ['active', 'draft', 'paused', 'archived'], true) ? $data['status'] : 'draft', $startsAt, $endsAt];
    if ($id) {
        $pdo->prepare('UPDATE notices SET type=?, title=?, message=?, cta_label=?, cta_target=?, dismissible=?, priority=?, status=?, starts_at=?, ends_at=?, updated_at=UTC_TIMESTAMP() WHERE id=?')->execute([...$values, $id]);
    } else {
        $pdo->prepare('INSERT INTO notices (type,title,message,cta_label,cta_target,dismissible,priority,status,starts_at,ends_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())')->execute($values);
        $id = (int) $pdo->lastInsertId();
    }
    lumina_record_activity($pdo, $userId, 'saved', 'notice', $id, "Aviso {$title} guardado");
    return ['id' => $id];
}

function lumina_save_trust_card(PDO $pdo, array $data, ?int $id, ?int $userId): array
{
    $title = lumina_clean_string($data['title'] ?? '', 100);
    $body = lumina_clean_string($data['body'] ?? '', 250);
    if ($title === '' || $body === '') throw new InvalidArgumentException('Título y texto de la tarjeta son obligatorios.');
    $icons = ['truck', 'shield', 'card', 'chat', 'gift', 'location', 'clock', 'box', 'check', 'headset'];
    $icon = in_array($data['icon_key'] ?? 'shield', $icons, true) ? $data['icon_key'] : 'shield';
    $values = [$icon, in_array($data['theme'] ?? 'light', ['light', 'dark', 'accent'], true) ? $data['theme'] : 'light', $title, $body, lumina_clean_string($data['cta_label'] ?? '', 50), lumina_url_or_anchor($data['cta_target'] ?? ''), lumina_int($data['sort_order'] ?? 0), in_array($data['status'] ?? 'active', ['active', 'hidden'], true) ? $data['status'] : 'active'];
    if ($id) {
        $pdo->prepare('UPDATE trust_cards SET icon_key=?, theme=?, title=?, body=?, cta_label=?, cta_target=?, sort_order=?, status=?, updated_at=UTC_TIMESTAMP() WHERE id=?')->execute([...$values, $id]);
    } else {
        $pdo->prepare('INSERT INTO trust_cards (icon_key,theme,title,body,cta_label,cta_target,sort_order,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())')->execute($values);
        $id = (int) $pdo->lastInsertId();
    }
    lumina_record_activity($pdo, $userId, 'saved', 'trust_card', $id, "Tarjeta de confianza {$title} guardada");
    return ['id' => $id];
}

function lumina_save_review(PDO $pdo, array $data, ?int $id, ?int $userId): array
{
    $author = lumina_clean_string($data['author_name'] ?? '', 120);
    $title = lumina_clean_string($data['title'] ?? '', 150);
    $body = lumina_clean_string($data['body'] ?? '', 1600);
    $rating = lumina_int($data['rating'] ?? 0, 1);
    if ($rating > 5 || $author === '' || $body === '') throw new InvalidArgumentException('La reseña requiere nombre, texto y una calificación de 1 a 5.');
    $status = in_array($data['status'] ?? 'pending', ['pending', 'approved', 'rejected', 'hidden'], true) ? $data['status'] : 'pending';
    $productId = !empty($data['product_id']) ? lumina_int($data['product_id'], 1) : null;
    if ($productId && !lumina_exists($pdo, 'products', $productId)) throw new InvalidArgumentException('El producto seleccionado no existe.');
    $publishedAt = $status === 'approved' ? gmdate('Y-m-d H:i:s') : null;
    $values = [$productId, $author, lumina_clean_string($data['author_email'] ?? '', 190), $rating, $title, $body, $status, lumina_bool($data['is_featured'] ?? false), $publishedAt];
    if ($id) {
        $pdo->prepare('UPDATE reviews SET product_id=?, author_name=?, author_email=?, rating=?, title=?, body=?, status=?, is_featured=?, published_at=COALESCE(?, published_at), updated_at=UTC_TIMESTAMP() WHERE id=?')->execute([...$values, $id]);
    } else {
        $pdo->prepare('INSERT INTO reviews (product_id,author_name,author_email,rating,title,body,status,is_featured,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())')->execute($values);
        $id = (int) $pdo->lastInsertId();
    }
    lumina_record_activity($pdo, $userId, 'saved', 'review', $id, "Reseña de {$author} guardada");
    return ['id' => $id];
}

function lumina_save_settings(PDO $pdo, array $data, ?int $userId): void
{
    $allowed = [
        'store_name' => 120, 'store_tagline' => 220, 'currency' => 4, 'locale' => 12, 'whatsapp_number' => 30, 'whatsapp_message' => 600,
        'shipping_notice' => 220, 'shipping_enabled' => 1, 'shipping_fee' => 12, 'free_shipping_min' => 12, 'store_email' => 190, 'store_phone' => 60, 'address' => 220, 'seo_title' => 180, 'seo_description' => 360,
        'social_instagram' => 500, 'social_facebook' => 500, 'social_tiktok' => 500, 'social_x' => 500, 'social_youtube' => 500,
        'reviews_enabled' => 1, 'reviews_form_enabled' => 1, 'trust_enabled' => 1, 'trust_title' => 160, 'trust_description' => 360,
        'logo_media_id' => 20, 'favicon_media_id' => 20,
    ];
    $statement = $pdo->prepare(lumina_db_driver() === 'sqlite'
        ? 'INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, UTC_TIMESTAMP()) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = UTC_TIMESTAMP()'
        : 'INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = UTC_TIMESTAMP()'
    );
    foreach ($allowed as $key => $max) {
        if (!array_key_exists($key, $data)) continue;
        if (in_array($key, ['reviews_enabled', 'reviews_form_enabled', 'trust_enabled', 'shipping_enabled'], true)) {
            $value = (string) lumina_bool($data[$key]);
        } elseif ($key === 'free_shipping_min') {
            $raw = str_replace(',', '.', lumina_clean_string($data[$key], $max));
            if ($raw !== '' && (!is_numeric($raw) || (float) $raw < 0 || (float) $raw > 999999)) {
                throw new InvalidArgumentException('El mínimo para envío gratis debe ser un valor positivo (o vacío para desactivarlo).');
            }
            $value = $raw === '' ? '' : number_format((float) $raw, 2, '.', '');
        } elseif ($key === 'shipping_fee') {
            $raw = str_replace(',', '.', lumina_clean_string($data[$key], $max));
            if ($raw === '' || !is_numeric($raw) || (float) $raw < 0 || (float) $raw > 9999.99) {
                throw new InvalidArgumentException('El costo de envío debe ser un valor entre 0 y 9999.99.');
            }
            $value = number_format((float) $raw, 2, '.', '');
        } else {
            $value = lumina_clean_string($data[$key], $max);
        }
        if ($key === 'store_name' && $value === '') {
            throw new InvalidArgumentException('El nombre de la tienda es obligatorio.');
        }
        if ($key === 'whatsapp_number' && $value !== '') {
            $value = lumina_normalize_whatsapp($value);
            if (strlen($value) < 7 || strlen($value) > 20) {
                throw new InvalidArgumentException('El número de WhatsApp debe incluir entre 7 y 20 dígitos.');
            }
        }
        if ($key === 'currency' && $value !== '') {
            $value = strtoupper($value);
            if (!preg_match('/^[A-Z]{3}$/', $value)) {
                throw new InvalidArgumentException('La moneda debe ser un código ISO de tres letras, por ejemplo USD.');
            }
        }
        if ($key === 'locale' && $value !== '' && !preg_match('/^[a-z]{2,3}-[A-Z]{2}$/', $value)) {
            throw new InvalidArgumentException('La localización debe tener un formato como es-EC.');
        }
        if (str_starts_with($key, 'social_') && $value !== '') {
            $value = lumina_url_or_anchor($value);
        }
        if (in_array($key, ['logo_media_id', 'favicon_media_id'], true) && $value !== '' && !lumina_exists($pdo, 'media', (int) $value)) {
            throw new InvalidArgumentException('El archivo de marca seleccionado no existe.');
        }
        $statement->execute([$key, $value]);
    }
    lumina_record_activity($pdo, $userId, 'saved', 'settings', null, 'Configuración general actualizada');
}

function lumina_delete_resource(PDO $pdo, string $resource, int $id, ?int $userId): void
{
    if ($resource === 'products') {
        // Product deletion is intentionally permanent from the administration panel.
        // The schema cascades product images and variants, while preserving historic
        // orders and reviews by setting their optional product reference to NULL.
        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare('SELECT name FROM products WHERE id = ? LIMIT 1');
            $statement->execute([$id]);
            $product = $statement->fetch();
            if (!$product) {
                throw new InvalidArgumentException('El producto ya no existe.');
            }
            $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
            lumina_record_activity($pdo, $userId, 'deleted', 'product', $id, 'Producto ' . $product['name'] . ' eliminado permanentemente');
            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $exception;
        }
        return;
    }
    if ($resource === 'categories') {
        $count = $pdo->prepare("SELECT COUNT(*) FROM products WHERE category_id = ? AND status != 'archived'");
        $count->execute([$id]);
        if ((int) $count->fetchColumn() > 0) throw new InvalidArgumentException('No puedes eliminar una categoría que todavía tiene productos. Reasígnalos primero.');
        $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
        lumina_record_activity($pdo, $userId, 'deleted', 'category', $id, 'Categoría eliminada');
        return;
    }
    $tables = ['banners' => 'banner', 'campaigns' => 'campaign', 'notices' => 'notice', 'trust-cards' => 'trust_card', 'reviews' => 'review'];
    if (!isset($tables[$resource])) throw new InvalidArgumentException('Recurso no disponible.');
    $pdo->prepare("DELETE FROM {$tables[$resource]}s WHERE id = ?")->execute([$id]);
    lumina_record_activity($pdo, $userId, 'deleted', $tables[$resource], $id, ucfirst($tables[$resource]) . ' eliminado');
}

function lumina_submit_public_review(PDO $pdo, array $data): int
{
    $settings = lumina_settings($pdo);
    if (($settings['reviews_enabled'] ?? '1') !== '1' || ($settings['reviews_form_enabled'] ?? '1') !== '1') {
        throw new RuntimeException('Las reseñas no están disponibles en este momento.');
    }
    if (!empty($data['website'])) {
        throw new RuntimeException('No fue posible enviar la reseña.');
    }
    $key = lumina_client_key('review');
    if (!lumina_throttle($pdo, 'review', $key, 3, 60)) {
        throw new RuntimeException('Espera un momento antes de enviar otra reseña.');
    }
    $review = lumina_save_review($pdo, [...$data, 'status' => 'pending', 'is_featured' => false], null, null);
    lumina_throttle_failure($pdo, 'review', $key, 3);
    return (int) $review['id'];
}

function lumina_product_live_price(PDO $pdo, array $product): array
{
    $regular = (float) $product['regular_price'];
    $current = $product['sale_price'] !== null && (float) $product['sale_price'] > 0 && (float) $product['sale_price'] < $regular
        ? (float) $product['sale_price']
        : $regular;
    $statement = $pdo->prepare("SELECT name, discount_percent FROM campaigns WHERE " . lumina_active_date_condition() . " AND discount_percent > 0 AND (target_type = 'all' OR (target_type = 'product' AND target_id = ?) OR (target_type = 'category' AND target_id = ?)) ORDER BY discount_percent DESC");
    $statement->execute([(int) $product['id'], (int) $product['category_id']]);
    foreach ($statement->fetchAll() as $campaign) {
        $candidate = round($regular * (1 - ((float) $campaign['discount_percent'] / 100)), 2);
        $current = min($current, $candidate);
    }
    return ['regular' => $regular, 'current' => $current];
}

function lumina_create_whatsapp_order(PDO $pdo, array $data): array
{
    $customerName = lumina_clean_string($data['customer_name'] ?? '', 120);
    $customerPhone = lumina_clean_string($data['customer_phone'] ?? '', 40);
    $customerNote = lumina_clean_string($data['note'] ?? '', 800);
    $shippingCity = lumina_clean_string($data['shipping_city'] ?? '', 120);
    $shippingAddress = lumina_clean_string($data['shipping_address'] ?? '', 255);
    $lines = $data['lines'] ?? [];
    if ($customerName === '' || !is_array($lines) || count($lines) === 0 || count($lines) > 30) {
        throw new InvalidArgumentException('El pedido necesita tu nombre y al menos un producto.');
    }
    $phoneDigits = preg_replace('/\D+/', '', $customerPhone) ?: '';
    if (strlen($phoneDigits) < 7 || strlen($phoneDigits) > 15) {
        throw new InvalidArgumentException('Ingresa un número de teléfono válido para coordinar la entrega.');
    }
    if ($shippingCity === '') {
        throw new InvalidArgumentException('Indica la ciudad de entrega.');
    }
    lumina_ensure_tracking_schema($pdo);
    $settings = lumina_settings($pdo);
    $pdo->beginTransaction();
    try {
        $items = [];
        $subtotal = 0.0;
        foreach ($lines as $line) {
            if (!is_array($line)) continue;
            $productId = lumina_int($line['product_id'] ?? 0, 1);
            $quantity = lumina_int($line['quantity'] ?? 0, 1);
            if ($quantity > 99) throw new InvalidArgumentException('La cantidad máxima por producto es 99.');
            $productStatement = $pdo->prepare("SELECT id, category_id, name, sku, regular_price, sale_price, stock, status FROM products WHERE id = ?" . (lumina_db_driver() === 'mysql' ? ' FOR UPDATE' : ''));
            $productStatement->execute([$productId]);
            $product = $productStatement->fetch();
            if (!$product || $product['status'] !== 'active' || (int) $product['stock'] < $quantity) {
                throw new InvalidArgumentException('Uno de los productos ya no tiene stock suficiente.');
            }
            $variantIds = array_values(array_unique(array_filter(array_map(fn($id) => filter_var($id, FILTER_VALIDATE_INT) ?: null, $line['variant_ids'] ?? []))));
            $variantLabel = '';
            $variantDelta = 0.0;
            if ($variantIds) {
                $marks = implode(',', array_fill(0, count($variantIds), '?'));
                $variantStatement = $pdo->prepare("SELECT id, option_name, option_value, price_delta, stock FROM product_variants WHERE product_id = ? AND id IN ({$marks})");
                $variantStatement->execute([$productId, ...$variantIds]);
                $variants = $variantStatement->fetchAll();
                if (count($variants) !== count($variantIds)) throw new InvalidArgumentException('La variante seleccionada ya no es válida.');
                $selectedOptions = [];
                foreach ($variants as $variant) {
                    if (isset($selectedOptions[$variant['option_name']])) {
                        throw new InvalidArgumentException('Selecciona solo una opción por cada variante del producto.');
                    }
                    $selectedOptions[$variant['option_name']] = true;
                    if ((int) $variant['stock'] < $quantity) throw new InvalidArgumentException('Una variante seleccionada no tiene stock suficiente.');
                    $variantLabel .= ($variantLabel ? ' · ' : '') . $variant['option_value'];
                    $variantDelta += (float) $variant['price_delta'];
                }
            }
            $price = lumina_product_live_price($pdo, $product);
            $unitPrice = round($price['current'] + $variantDelta, 2);
            $lineTotal = round($unitPrice * $quantity, 2);
            $subtotal += $lineTotal;
            $items[] = ['product_id' => $productId, 'variant_ids' => implode(',', $variantIds), 'name' => $product['name'], 'sku' => $product['sku'], 'variant_label' => $variantLabel, 'quantity' => $quantity, 'unit_price' => $unitPrice, 'line_total' => $lineTotal];
        }
        if (!$items) throw new InvalidArgumentException('No se pudo preparar el pedido.');
        $subtotal = round($subtotal, 2);
        $shipping = lumina_shipping_fee($settings, $subtotal);
        $total = round($subtotal + $shipping, 2);
        $reference = 'WA-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $order = $pdo->prepare("INSERT INTO orders (reference_code, status, customer_name, customer_phone, customer_note, shipping_city, shipping_address, stock_applied, currency, subtotal, discount_total, total, created_at, updated_at) VALUES (?, 'whatsapp_pending', ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())");
        $order->execute([$reference, $customerName, $customerPhone, $customerNote ?: null, $shippingCity, $shippingAddress, $settings['currency'] ?? 'USD', $subtotal, $total]);
        $orderId = (int) $pdo->lastInsertId();
        $itemStatement = $pdo->prepare('INSERT INTO order_items (order_id, product_id, variant_ids, product_name, product_sku, variant_label, quantity, unit_price, line_total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())');
        foreach ($items as $item) {
            $itemStatement->execute([$orderId, $item['product_id'], $item['variant_ids'] ?: null, $item['name'], $item['sku'], $item['variant_label'] ?: null, $item['quantity'], $item['unit_price'], $item['line_total']]);
        }
        $shipment = lumina_create_order_shipment($pdo, $orderId, 'whatsapp_pending');
        lumina_record_activity($pdo, null, 'whatsapp_started', 'order', $orderId, "Pedido {$reference} iniciado por WhatsApp");
        $pdo->commit();
        return [
            'id' => $orderId,
            'reference' => $reference,
            'tracking_code' => $shipment['tracking_code'],
            'tracking_url' => lumina_public_path('seguimiento.php?guia=' . rawurlencode((string) $shipment['tracking_code'])),
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'total' => $total,
            'currency' => $settings['currency'] ?? 'USD',
        ];
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}
