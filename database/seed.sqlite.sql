-- Local starter content. It is applied only when setup-local.php creates a new database.

INSERT INTO settings (setting_key, setting_value) VALUES
  ('store_name', 'Lúmina Store'),
  ('store_tagline', 'Tecnología y diseño para todos los días.'),
  ('currency', 'USD'),
  ('locale', 'es-EC'),
  ('whatsapp_number', '593000000000'),
  ('whatsapp_message', 'Hola, quiero realizar el siguiente pedido:'),
  ('shipping_notice', 'Envío sin costo en pedidos superiores a $99.'),
  ('shipping_enabled', '1'),
  ('shipping_fee', '5.00'),
  ('store_email', 'hola@lumina.example'),
  ('store_phone', ''),
  ('address', ''),
  ('social_instagram', ''),
  ('social_facebook', ''),
  ('social_tiktok', ''),
  ('social_x', ''),
  ('social_youtube', ''),
  ('seo_title', 'Lúmina Store — Tecnología para tu día'),
  ('seo_description', 'Productos de tecnología y accesorios con atención directa por WhatsApp.'),
  ('reviews_enabled', '1'),
  ('reviews_form_enabled', '1'),
  ('trust_enabled', '1'),
  ('trust_title', 'Compra con tranquilidad.'),
  ('trust_description', 'Una selección clara de productos y atención directa cuando la necesites.'),
  ('logo_media_id', ''),
  ('favicon_media_id', '');

INSERT INTO categories (name, slug, description, sort_order, status) VALUES
  ('Audio', 'audio', 'Sonido claro para trabajar, viajar y desconectarte.', 10, 'active'),
  ('Movilidad', 'movilidad', 'Accesorios prácticos para llevar tu tecnología contigo.', 20, 'active'),
  ('Escritorio', 'escritorio', 'Un espacio de trabajo más cómodo y organizado.', 30, 'active'),
  ('Hogar', 'hogar', 'Pequeños detalles que hacen más simple tu día.', 40, 'active');

INSERT INTO trust_cards (icon_key, theme, title, body, cta_label, cta_target, sort_order, status) VALUES
  ('box', 'light', 'Envío seguro', 'Envío sin costo en compras desde $250.', '', '', 10, 'active'),
  ('truck', 'accent', 'Rastreo en línea', 'Sigue tu pedido con tu guía, paso a paso.', '', '', 20, 'active'),
  ('chat', 'light', 'Atención directa', 'Finaliza tu pedido por WhatsApp.', '', '', 30, 'active'),
  ('card', 'dark', 'Pago y entrega coordinados', 'Acordamos contigo el pago y la entrega por WhatsApp.', '', '', 40, 'active');

INSERT INTO banners (eyebrow, title, body, cta_label, cta_target, theme, sort_order, status) VALUES
  ('Selección Lúmina', 'Tecnología que acompaña tu día.', 'Una tienda más simple, con productos claros y atención directa cuando la necesites.', 'Explorar catálogo', '#catalogo', 'dark', 10, 'active');

INSERT INTO notices (type, title, message, cta_label, cta_target, dismissible, priority, status) VALUES
  ('info', 'Compra a tu ritmo', 'Guarda tus productos, revisa el total y confirma el pedido por WhatsApp.', '', '', 1, 10, 'active');

INSERT INTO products (category_id, name, slug, short_description, long_description, regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status)
SELECT id, 'Aurora Sound Mini', 'aurora-sound-mini', 'Parlante compacto con sonido equilibrado y diseño portátil.', 'Aurora Sound Mini combina un formato fácil de llevar con una experiencia sonora cálida para música, llamadas y momentos cotidianos.', 129.00, 99.00, 24, 5, 'LUM-AUD-001', 'OFERTA', 10, 'active' FROM categories WHERE slug = 'audio';

INSERT INTO products (category_id, name, slug, short_description, long_description, regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status)
SELECT id, 'Nexo Charge 3', 'nexo-charge-3', 'Cargador multipuerto compacto para tu espacio de trabajo o viaje.', 'Nexo Charge 3 ofrece puertos versátiles en un formato limpio y ligero, ideal para mantener tus dispositivos listos durante el día.', 49.00, NULL, 42, 8, 'LUM-MOB-001', 'NUEVO', 20, 'active' FROM categories WHERE slug = 'movilidad';

INSERT INTO products (category_id, name, slug, short_description, long_description, regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status)
SELECT id, 'Orbit Desk Stand', 'orbit-desk-stand', 'Base ajustable para elevar tu portátil y mantener una postura cómoda.', 'Orbit Desk Stand ayuda a organizar tu área de trabajo con una inclinación estable, superficie limpia y un formato fácil de mover.', 74.00, 59.00, 18, 4, 'LUM-DSK-001', 'PRECIO ESPECIAL', 30, 'active' FROM categories WHERE slug = 'escritorio';

INSERT INTO products (category_id, name, slug, short_description, long_description, regular_price, sale_price, stock, low_stock_threshold, sku, badge, sort_order, status)
SELECT id, 'Halo Light One', 'halo-light-one', 'Luz ambiental regulable para crear espacios más cómodos.', 'Halo Light One ofrece iluminación suave y controles simples para acompañar sesiones de lectura, trabajo o descanso.', 89.00, NULL, 16, 4, 'LUM-HOM-001', '', 40, 'active' FROM categories WHERE slug = 'hogar';
