-- Order tracking migration for an existing local SQLite database.
-- SQLite cannot add all columns conditionally, so run this once only if the
-- local database was created before the tracking release.

ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN shipping_carrier TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN shipment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (shipment_status IN ('pending', 'preparing', 'shipped', 'delivered', 'cancelled'));
ALTER TABLE orders ADD COLUMN shipment_note TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN shipped_at TEXT;
ALTER TABLE orders ADD COLUMN delivered_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tracking_number
    ON orders(tracking_number)
    WHERE tracking_number IS NOT NULL AND tracking_number != '';
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status_created
    ON orders(shipment_status, created_at);

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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'shipped', 'delivered', 'cancelled')),
    note TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_order
    ON order_tracking_events(order_id, occurred_at, id);
