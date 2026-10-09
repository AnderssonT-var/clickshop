-- Non-sensitive starter content for the Lúmina Store schema.
-- No administrator is inserted here. Create the first user through the deployment setup flow.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

INSERT INTO settings (setting_key, setting_value)
VALUES
    ('store_name', 'Click S&E'),
    ('store_tagline', 'Tecnología y diseño para todos los días.'),
    ('currency', 'USD'),
    ('locale', 'es-EC'),
    ('whatsapp_number', '593000000000'),
    ('whatsapp_message', 'Hola, quiero realizar el siguiente pedido:'),
    ('shipping_notice', 'Envío sin costo en pedidos superiores a $99.'),
    ('shipping_enabled', '1'),
    ('shipping_fee', '5.00'),
    ('store_email', 'hola@clickshopse.com'),
    ('store_phone', ''),
    ('address', ''),
    ('social_instagram', ''),
    ('social_facebook', ''),
    ('social_tiktok', ''),
    ('social_x', ''),
    ('social_youtube', ''),
    ('seo_title', 'Click S&E — Tecnología para tu día'),
    ('seo_description', 'Productos de tecnología y accesorios con atención directa por WhatsApp.'),
    ('reviews_enabled', '1'),
    ('reviews_form_enabled', '1'),
    ('trust_enabled', '1'),
    ('trust_title', 'Compra con tranquilidad.'),
    ('trust_description', 'Una selección clara de productos y atención directa cuando la necesites.'),
    ('logo_media_id', ''),
    ('favicon_media_id', '')
ON DUPLICATE KEY UPDATE
    setting_value = VALUES(setting_value),
    updated_at = UTC_TIMESTAMP();

INSERT INTO categories (name, slug, description, media_id, sort_order, status)
VALUES
    (
        'Audio',
        'audio',
        'Sonido claro para trabajar, viajar y desconectarte.',
        NULL, 10, 'active'
    ),
    (
        'Movilidad',
        'movilidad',
        'Accesorios prácticos para llevar tu tecnología contigo.',
        NULL, 20, 'active'
    ),
    (
        'Escritorio',
        'escritorio',
        'Un espacio de trabajo más cómodo y organizado.',
        NULL, 30, 'active'
    ),
    (
        'Hogar',
        'hogar',
        'Pequeños detalles que hacen más simple tu día.',
        NULL, 40, 'active'
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    media_id = VALUES(media_id),
    sort_order = VALUES(sort_order),
    status = VALUES(status),
    updated_at = UTC_TIMESTAMP();

INSERT INTO trust_cards (
    icon_key, theme, title, body, cta_label, cta_target, sort_order, status
)
VALUES
    (
        'shield', 'light', 'Compra con confianza',
        'Información clara y acompañamiento antes de confirmar tu pedido.',
        '', '', 10, 'active'
    ),
    (
        'chat', 'accent', 'Atención por WhatsApp',
        'Resuelve dudas sobre productos y disponibilidad directamente con nuestro equipo.',
        'Escríbenos', 'https://wa.me/593000000000', 20, 'active'
    ),
    (
        'box', 'light', 'Envíos cuidadosamente preparados',
        'Cada pedido se revisa y se prepara con atención antes de ser despachado.',
        '', '', 30, 'active'
    ),
    (
        'check', 'dark', 'Productos seleccionados',
        'Un catálogo compacto, funcional y pensado para el uso cotidiano.',
        '', '', 40, 'active'
    )
ON DUPLICATE KEY UPDATE
    theme = VALUES(theme),
    title = VALUES(title),
    body = VALUES(body),
    cta_label = VALUES(cta_label),
    cta_target = VALUES(cta_target),
    sort_order = VALUES(sort_order),
    status = VALUES(status),
    updated_at = UTC_TIMESTAMP();

INSERT INTO products (
    category_id, name, slug, short_description, long_description,
    regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status
)
SELECT
    c.id,
    'Aurora Sound Mini',
    'aurora-sound-mini',
    'Parlante compacto con sonido equilibrado y diseño portátil.',
    'Aurora Sound Mini combina un formato fácil de llevar con una experiencia sonora cálida para música, llamadas y momentos cotidianos.',
    129.00, 99.00, 24, 5, 'LUM-AUD-001', 'OFERTA', 10, 'active'
FROM categories AS c
WHERE c.slug = 'audio'
ON DUPLICATE KEY UPDATE
    category_id = VALUES(category_id),
    name = VALUES(name),
    short_description = VALUES(short_description),
    long_description = VALUES(long_description),
    regular_price = VALUES(regular_price),
    sale_price = VALUES(sale_price),
    stock = VALUES(stock),
    low_stock_threshold = VALUES(low_stock_threshold),
    sku = VALUES(sku),
    badge = VALUES(badge),
    sort_order = VALUES(sort_order),
    status = VALUES(status),
    updated_at = UTC_TIMESTAMP();

INSERT INTO products (
    category_id, name, slug, short_description, long_description,
    regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status
)
SELECT
    c.id,
    'Nexo Charge 3',
    'nexo-charge-3',
    'Cargador multipuerto compacto para tu espacio de trabajo o viaje.',
    'Nexo Charge 3 ofrece puertos versátiles en un formato limpio y ligero, ideal para mantener tus dispositivos listos durante el día.',
    49.00, NULL, 42, 8, 'LUM-MOB-001', 'NUEVO', 20, 'active'
FROM categories AS c
WHERE c.slug = 'movilidad'
ON DUPLICATE KEY UPDATE
    category_id = VALUES(category_id),
    name = VALUES(name),
    short_description = VALUES(short_description),
    long_description = VALUES(long_description),
    regular_price = VALUES(regular_price),
    sale_price = VALUES(sale_price),
    stock = VALUES(stock),
    low_stock_threshold = VALUES(low_stock_threshold),
    sku = VALUES(sku),
    badge = VALUES(badge),
    sort_order = VALUES(sort_order),
    status = VALUES(status),
    updated_at = UTC_TIMESTAMP();

INSERT INTO products (
    category_id, name, slug, short_description, long_description,
    regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status
)
SELECT
    c.id,
    'Orbit Desk Stand',
    'orbit-desk-stand',
    'Base ajustable para elevar tu portátil y mantener una postura cómoda.',
    'Orbit Desk Stand ayuda a organizar tu área de trabajo con una inclinación estable, superficie limpia y un formato fácil de mover.',
    74.00, 59.00, 18, 4, 'LUM-DSK-001', 'PRECIO ESPECIAL', 30, 'active'
FROM categories AS c
WHERE c.slug = 'escritorio'
ON DUPLICATE KEY UPDATE
    category_id = VALUES(category_id),
    name = VALUES(name),
    short_description = VALUES(short_description),
    long_description = VALUES(long_description),
    regular_price = VALUES(regular_price),
    sale_price = VALUES(sale_price),
    stock = VALUES(stock),
    low_stock_threshold = VALUES(low_stock_threshold),
    sku = VALUES(sku),
    badge = VALUES(badge),
    sort_order = VALUES(sort_order),
    status = VALUES(status),
    updated_at = UTC_TIMESTAMP();

INSERT INTO products (
    category_id, name, slug, short_description, long_description,
    regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status
)
SELECT
    c.id,
    'Halo Light One',
    'halo-light-one',
    'Luz ambiental regulable para crear espacios más cómodos.',
    'Halo Light One ofrece iluminación suave y controles simples para acompañar sesiones de lectura, trabajo o descanso.',
    89.00, NULL, 16, 4, 'LUM-HOM-001', '', 40, 'active'
FROM categories AS c
WHERE c.slug = 'hogar'
ON DUPLICATE KEY UPDATE
    category_id = VALUES(category_id),
    name = VALUES(name),
    short_description = VALUES(short_description),
    long_description = VALUES(long_description),
    regular_price = VALUES(regular_price),
    sale_price = VALUES(sale_price),
    stock = VALUES(stock),
    low_stock_threshold = VALUES(low_stock_threshold),
    sku = VALUES(sku),
    badge = VALUES(badge),
    sort_order = VALUES(sort_order),
    status = VALUES(status),
    updated_at = UTC_TIMESTAMP();

COMMIT;
