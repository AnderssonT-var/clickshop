-- Local-development schema for SQLite 3.
-- Production continues to use schema.sql (MySQL/MariaDB).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'editor')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (width > 0 AND height > 0)
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    media_id INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT NOT NULL DEFAULT '',
    long_description TEXT NOT NULL,
    regular_price NUMERIC NOT NULL,
    sale_price NUMERIC,
    stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 0,
    sku TEXT NOT NULL UNIQUE,
    badge TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'out_of_stock', 'archived')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (regular_price > 0),
    CHECK (sale_price IS NULL OR (sale_price > 0 AND sale_price < regular_price)),
    CHECK (stock >= 0 AND low_stock_threshold >= 0),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    media_id INTEGER NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, media_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    option_name TEXT NOT NULL,
    option_value TEXT NOT NULL,
    sku TEXT,
    price_delta NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (price_delta >= 0 AND stock >= 0),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eyebrow TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    cta_label TEXT NOT NULL DEFAULT '',
    cta_target TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'warm')),
    media_id INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'paused', 'archived')),
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'promotion' CHECK (type IN ('promotion', 'sale', 'campaign', 'benefit')),
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    code TEXT NOT NULL DEFAULT '',
    discount_percent NUMERIC NOT NULL DEFAULT 0,
    target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'category', 'product')),
    target_id INTEGER,
    cta_label TEXT NOT NULL DEFAULT '',
    cta_target TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'blue' CHECK (theme IN ('blue', 'dark', 'warm')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'paused', 'archived')),
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
    CHECK ((target_type = 'all' AND target_id IS NULL) OR (target_type <> 'all' AND target_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'promotion', 'warning', 'alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    cta_label TEXT NOT NULL DEFAULT '',
    cta_target TEXT NOT NULL DEFAULT '',
    dismissible INTEGER NOT NULL DEFAULT 1 CHECK (dismissible IN (0, 1)),
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'paused', 'archived')),
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trust_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icon_key TEXT NOT NULL DEFAULT 'shield',
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'accent')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    cta_label TEXT NOT NULL DEFAULT '',
    cta_target TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL DEFAULT '',
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
    is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'whatsapp_pending' CHECK (status IN ('whatsapp_pending', 'confirmed', 'processing', 'completed', 'cancelled')),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_note TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_total NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    tracking_number TEXT,
    shipping_carrier TEXT NOT NULL DEFAULT '',
    carrier_tracking_number TEXT NOT NULL DEFAULT '',
    shipment_status TEXT NOT NULL DEFAULT 'pending' CHECK (shipment_status IN ('pending', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'issue', 'cancelled')),
    shipment_note TEXT NOT NULL DEFAULT '',
    shipping_city TEXT NOT NULL DEFAULT '',
    shipping_address TEXT NOT NULL DEFAULT '',
    estimated_delivery TEXT,
    stock_applied INTEGER NOT NULL DEFAULT 0,
    shipped_at TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_tracking_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'issue', 'cancelled')),
    note TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    variant_ids TEXT,
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    variant_label TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL,
    line_total NUMERIC NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL,
    rate_key TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started_at TEXT NOT NULL,
    blocked_until TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (scope, rate_key)
);

CREATE INDEX IF NOT EXISTS idx_categories_listing ON categories(status, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_products_listing ON products(category_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_product_variants_listing ON product_variants(product_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_banners_public ON banners(status, starts_at, ends_at, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_campaigns_public ON campaigns(status, starts_at, ends_at, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_notices_public ON notices(status, starts_at, ends_at, priority, id);
CREATE INDEX IF NOT EXISTS idx_trust_cards_public ON trust_cards(status, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_public ON reviews(product_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_site_public ON reviews(status, is_featured, published_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tracking_number ON orders(tracking_number)
    WHERE tracking_number IS NOT NULL AND tracking_number != '';
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status_created ON orders(shipment_status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_order ON order_tracking_events(order_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at, id);
