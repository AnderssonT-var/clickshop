-- Order tracking migration for existing MySQL/MariaDB installations.
-- Run once after the prior order-management release and before serving the
-- tracking UI. Fresh installations receive the same structures from schema.sql.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) NULL AFTER total,
    ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100) NOT NULL DEFAULT '' AFTER tracking_number,
    ADD COLUMN IF NOT EXISTS shipment_status ENUM('pending', 'preparing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending' AFTER shipping_carrier,
    ADD COLUMN IF NOT EXISTS shipment_note VARCHAR(500) NOT NULL DEFAULT '' AFTER shipment_status,
    ADD COLUMN IF NOT EXISTS shipped_at DATETIME NULL AFTER shipment_note,
    ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL AFTER shipped_at;

ALTER TABLE orders
    ADD UNIQUE KEY uq_orders_tracking_number (tracking_number),
    ADD KEY idx_orders_shipment_status_created (shipment_status, created_at);

UPDATE orders
SET shipment_status = CASE status
    WHEN 'confirmed' THEN 'preparing'
    WHEN 'processing' THEN 'shipped'
    WHEN 'completed' THEN 'delivered'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'pending'
END
WHERE shipment_status = 'pending';

CREATE TABLE IF NOT EXISTS order_tracking_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'preparing', 'shipped', 'delivered', 'cancelled') NOT NULL,
    note VARCHAR(500) NOT NULL DEFAULT '',
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_tracking_events_order (order_id, occurred_at, id),
    CONSTRAINT fk_order_tracking_events_order
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
