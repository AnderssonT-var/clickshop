-- Lúmina Store database contract.
-- Target: MySQL 8.0+ or MariaDB 10.5+ with InnoDB and utf8mb4.
-- This is a fresh-install schema. Existing installations need an explicit migration;
-- this file intentionally does not drop or alter live tables.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'admin', 'editor') NOT NULL DEFAULT 'admin',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_active_role (is_active, role),
    CONSTRAINT chk_users_is_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL,
    setting_value LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    width INT UNSIGNED NOT NULL,
    height INT UNSIGNED NOT NULL,
    alt_text VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_media_path (path),
    KEY idx_media_mime_created (mime_type, created_at),
    CONSTRAINT chk_media_dimensions CHECK (width > 0 AND height > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    media_id BIGINT UNSIGNED NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'hidden', 'archived') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_slug (slug),
    KEY idx_categories_listing (status, sort_order, name),
    KEY idx_categories_media (media_id),
    CONSTRAINT fk_categories_media
        FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NULL,
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    short_description VARCHAR(360) NOT NULL DEFAULT '',
    long_description TEXT NOT NULL,
    regular_price DECIMAL(12,2) UNSIGNED NOT NULL,
    sale_price DECIMAL(12,2) UNSIGNED NULL,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 0,
    sku VARCHAR(80) NOT NULL,
    badge VARCHAR(50) NOT NULL DEFAULT '',
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'draft', 'out_of_stock', 'archived') NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_slug (slug),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_listing (category_id, status, sort_order),
    KEY idx_products_stock (stock, low_stock_threshold),
    CONSTRAINT chk_products_sale_price CHECK (
        sale_price IS NULL OR sale_price < regular_price
    ),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    alt_text VARCHAR(180) NOT NULL DEFAULT '',
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_images_product_media (product_id, media_id),
    KEY idx_product_images_order (product_id, sort_order, id),
    KEY idx_product_images_media (media_id),
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_product_images_media
        FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    option_name VARCHAR(80) NOT NULL,
    option_value VARCHAR(120) NOT NULL,
    sku VARCHAR(80) NULL,
    price_delta DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_product_variants_listing (product_id, sort_order, id),
    KEY idx_product_variants_sku (sku),
    CONSTRAINT fk_product_variants_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banners (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    eyebrow VARCHAR(80) NOT NULL DEFAULT '',
    title VARCHAR(180) NOT NULL,
    body VARCHAR(600) NOT NULL DEFAULT '',
    cta_label VARCHAR(70) NOT NULL DEFAULT '',
    cta_target VARCHAR(500) NOT NULL DEFAULT '',
    theme ENUM('light', 'dark', 'warm') NOT NULL DEFAULT 'light',
    media_id BIGINT UNSIGNED NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'draft', 'paused', 'archived') NOT NULL DEFAULT 'draft',
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_banners_public (status, starts_at, ends_at, sort_order, id),
    KEY idx_banners_media (media_id),
    CONSTRAINT chk_banners_dates CHECK (
        ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
    ),
    CONSTRAINT fk_banners_media
        FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaigns (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(160) NOT NULL,
    type ENUM('promotion', 'sale', 'campaign', 'benefit') NOT NULL DEFAULT 'promotion',
    title VARCHAR(180) NOT NULL,
    message VARCHAR(700) NOT NULL DEFAULT '',
    code VARCHAR(60) NOT NULL DEFAULT '',
    discount_percent DECIMAL(5,2) UNSIGNED NOT NULL DEFAULT 0.00,
    target_type ENUM('all', 'category', 'product') NOT NULL DEFAULT 'all',
    target_id BIGINT UNSIGNED NULL,
    cta_label VARCHAR(70) NOT NULL DEFAULT '',
    cta_target VARCHAR(500) NOT NULL DEFAULT '',
    theme ENUM('blue', 'dark', 'warm') NOT NULL DEFAULT 'blue',
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'draft', 'paused', 'archived') NOT NULL DEFAULT 'draft',
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_campaigns_public (status, starts_at, ends_at, sort_order, id),
    KEY idx_campaigns_target (target_type, target_id),
    CONSTRAINT chk_campaigns_target CHECK (
        (target_type = 'all' AND target_id IS NULL)
        OR (target_type IN ('category', 'product') AND target_id IS NOT NULL)
    ),
    CONSTRAINT chk_campaigns_dates CHECK (
        ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    type ENUM('info', 'promotion', 'warning', 'alert') NOT NULL DEFAULT 'info',
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    cta_label VARCHAR(70) NOT NULL DEFAULT '',
    cta_target VARCHAR(500) NOT NULL DEFAULT '',
    dismissible TINYINT(1) NOT NULL DEFAULT 1,
    priority INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'draft', 'paused', 'archived') NOT NULL DEFAULT 'draft',
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notices_public (status, starts_at, ends_at, priority, id),
    CONSTRAINT chk_notices_dismissible CHECK (dismissible IN (0, 1)),
    CONSTRAINT chk_notices_dates CHECK (
        ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trust_cards (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    icon_key VARCHAR(80) NOT NULL DEFAULT 'shield',
    theme ENUM('light', 'dark', 'accent') NOT NULL DEFAULT 'light',
    title VARCHAR(100) NOT NULL,
    body VARCHAR(250) NOT NULL,
    cta_label VARCHAR(50) NOT NULL DEFAULT '',
    cta_target VARCHAR(500) NOT NULL DEFAULT '',
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'hidden') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_trust_cards_public (status, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NULL,
    author_name VARCHAR(120) NOT NULL,
    author_email VARCHAR(191) NOT NULL DEFAULT '',
    rating TINYINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL DEFAULT '',
    body VARCHAR(1600) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'hidden') NOT NULL DEFAULT 'pending',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reviews_product_public (product_id, status, created_at),
    KEY idx_reviews_site_public (status, is_featured, published_at),
    KEY idx_reviews_moderation (status, created_at),
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_featured CHECK (is_featured IN (0, 1)),
    CONSTRAINT fk_reviews_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reference_code VARCHAR(40) NOT NULL,
    status ENUM('whatsapp_pending', 'confirmed', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'whatsapp_pending',
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(40) NULL,
    customer_note VARCHAR(800) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    subtotal DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    -- Shipment data deliberately lives alongside the order snapshot. The
    -- tracking timeline itself is stored in order_tracking_events below.
    tracking_number VARCHAR(100) NULL,
    shipping_carrier VARCHAR(100) NOT NULL DEFAULT '',
    carrier_tracking_number VARCHAR(100) NOT NULL DEFAULT '',
    -- pending, preparing, shipped, out_for_delivery, delivered, issue, cancelled
    shipment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    shipment_note VARCHAR(500) NOT NULL DEFAULT '',
    shipping_city VARCHAR(120) NOT NULL DEFAULT '',
    shipping_address VARCHAR(255) NOT NULL DEFAULT '',
    estimated_delivery DATE NULL,
    -- 0 stock not discounted, 1 discounted, 2 legacy order (never touched)
    stock_applied TINYINT UNSIGNED NOT NULL DEFAULT 0,
    shipped_at DATETIME NULL,
    delivered_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_reference_code (reference_code),
    UNIQUE KEY uq_orders_tracking_number (tracking_number),
    KEY idx_orders_status_created (status, created_at),
    KEY idx_orders_shipment_status_created (shipment_status, created_at),
    KEY idx_orders_customer_phone (customer_phone),
    CONSTRAINT chk_orders_totals CHECK (
        subtotal >= 0 AND discount_total >= 0 AND total >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_tracking_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL,
    note VARCHAR(500) NOT NULL DEFAULT '',
    location VARCHAR(180) NOT NULL DEFAULT '',
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_tracking_events_order (order_id, occurred_at, id),
    CONSTRAINT fk_order_tracking_events_order
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    variant_ids VARCHAR(255) NULL,
    product_name VARCHAR(180) NOT NULL,
    product_sku VARCHAR(80) NOT NULL,
    variant_label VARCHAR(255) NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) UNSIGNED NOT NULL,
    line_total DECIMAL(12,2) UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    event_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    summary VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_activity_user_created (user_id, created_at),
    KEY idx_activity_entity_created (entity_type, entity_id, created_at),
    KEY idx_activity_event_created (event_name, created_at),
    CONSTRAINT fk_activity_log_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope VARCHAR(64) NOT NULL,
    rate_key CHAR(64) NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NOT NULL,
    blocked_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rate_limits_scope_key (scope, rate_key),
    KEY idx_rate_limits_blocked_until (blocked_until),
    CONSTRAINT chk_rate_limits_attempts CHECK (attempts >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
