-- Lúmina Store: contenido público exportado desde SQLite.
-- Importa database/schema.sql primero y este archivo después. No importes
-- database/seed.sql al usar esta exportación de una tienda existente.
-- Copia también public/uploads/ al servidor conservando las mismas rutas.
-- Excluye intencionalmente usuarios, hashes, pedidos, actividad, límites,
-- sesiones y correos de reseñas.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;
-- media: 3 registro(s).
INSERT INTO `media` (`id`, `path`, `mime_type`, `size_bytes`, `width`, `height`, `alt_text`, `created_at`)
VALUES (CONVERT(0x31 USING utf8mb4), CONVERT(0x75706c6f6164732f70726f64756374732f3465383438643062313433376236333763643262366236373932653636306162636662332e6a7067 USING utf8mb4), CONVERT(0x696d6167652f6a706567 USING utf8mb4), CONVERT(0x3338313432 USING utf8mb4), CONVERT(0x363533 USING utf8mb4), CONVERT(0x393135 USING utf8mb4), '', CONVERT(0x323032362d30392d32362030353a34363a3332 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `path` = VALUES(`path`),
  `mime_type` = VALUES(`mime_type`),
  `size_bytes` = VALUES(`size_bytes`),
  `width` = VALUES(`width`),
  `height` = VALUES(`height`),
  `alt_text` = VALUES(`alt_text`);

INSERT INTO `media` (`id`, `path`, `mime_type`, `size_bytes`, `width`, `height`, `alt_text`, `created_at`)
VALUES (CONVERT(0x32 USING utf8mb4), CONVERT(0x75706c6f6164732f6272616e64696e672d6c6f676f2f3136383161313337646561323136613133336462313662393936383831653033363463632e706e67 USING utf8mb4), CONVERT(0x696d6167652f706e67 USING utf8mb4), CONVERT(0x39383936 USING utf8mb4), CONVERT(0x343531 USING utf8mb4), CONVERT(0x343232 USING utf8mb4), '', CONVERT(0x323032362d30392d32372030313a33353a3032 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `path` = VALUES(`path`),
  `mime_type` = VALUES(`mime_type`),
  `size_bytes` = VALUES(`size_bytes`),
  `width` = VALUES(`width`),
  `height` = VALUES(`height`),
  `alt_text` = VALUES(`alt_text`);

INSERT INTO `media` (`id`, `path`, `mime_type`, `size_bytes`, `width`, `height`, `alt_text`, `created_at`)
VALUES (CONVERT(0x33 USING utf8mb4), CONVERT(0x75706c6f6164732f6272616e64696e672d66617669636f6e2f3263383463656137653162383932653165616338336533353133376634343533363265322e706e67 USING utf8mb4), CONVERT(0x696d6167652f706e67 USING utf8mb4), CONVERT(0x39383936 USING utf8mb4), CONVERT(0x343531 USING utf8mb4), CONVERT(0x343232 USING utf8mb4), '', CONVERT(0x323032362d30392d32372030313a33353a3136 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `path` = VALUES(`path`),
  `mime_type` = VALUES(`mime_type`),
  `size_bytes` = VALUES(`size_bytes`),
  `width` = VALUES(`width`),
  `height` = VALUES(`height`),
  `alt_text` = VALUES(`alt_text`);


-- categories: 4 registro(s).
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `media_id`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x31 USING utf8mb4), CONVERT(0x417564696f USING utf8mb4), CONVERT(0x617564696f USING utf8mb4), CONVERT(0x536f6e69646f20636c61726f20706172612074726162616a61722c207669616a6172207920646573636f6e656374617274652e USING utf8mb4), NULL, CONVERT(0x3130 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `description` = VALUES(`description`),
  `media_id` = VALUES(`media_id`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `media_id`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x32 USING utf8mb4), CONVERT(0x4d6f76696c69646164 USING utf8mb4), CONVERT(0x6d6f76696c69646164 USING utf8mb4), CONVERT(0x41636365736f72696f73207072c3a1637469636f732070617261206c6c65766172207475207465636e6f6c6f67c3ad6120636f6e7469676f2e USING utf8mb4), NULL, CONVERT(0x3230 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `description` = VALUES(`description`),
  `media_id` = VALUES(`media_id`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `media_id`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x33 USING utf8mb4), CONVERT(0x4573637269746f72696f USING utf8mb4), CONVERT(0x6573637269746f72696f USING utf8mb4), CONVERT(0x556e206573706163696f2064652074726162616a6f206dc3a1732063c3b36d6f646f2079206f7267616e697a61646f2e USING utf8mb4), NULL, CONVERT(0x3330 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `description` = VALUES(`description`),
  `media_id` = VALUES(`media_id`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `media_id`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x34 USING utf8mb4), CONVERT(0x486f676172 USING utf8mb4), CONVERT(0x686f676172 USING utf8mb4), CONVERT(0x5065717565c3b16f7320646574616c6c65732071756520686163656e206dc3a1732073696d706c652074752064c3ad612e USING utf8mb4), NULL, CONVERT(0x3430 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `description` = VALUES(`description`),
  `media_id` = VALUES(`media_id`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);


-- products: 4 registro(s).
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `short_description`, `long_description`, `regular_price`, `sale_price`, `stock`, `low_stock_threshold`, `sku`, `badge`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x31 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x4175726f726120536f756e64204d696e69 USING utf8mb4), CONVERT(0x6175726f72612d736f756e642d6d696e69 USING utf8mb4), CONVERT(0x5061726c616e746520636f6d706163746f20636f6e20736f6e69646f20657175696c69627261646f20792064697365c3b16f20706f7274c3a174696c2e USING utf8mb4), CONVERT(0x4175726f726120536f756e64204d696e6920636f6d62696e6120756e20666f726d61746f2066c3a163696c206465206c6c6576617220636f6e20756e6120657870657269656e63696120736f6e6f72612063c3a16c6964612070617261206dc3ba736963612c206c6c616d616461732079206d6f6d656e746f7320636f74696469616e6f732e USING utf8mb4), CONVERT(0x313239 USING utf8mb4), CONVERT(0x3939 USING utf8mb4), CONVERT(0x3234 USING utf8mb4), CONVERT(0x35 USING utf8mb4), CONVERT(0x4c554d2d4155442d303031 USING utf8mb4), CONVERT(0x4f4645525441 USING utf8mb4), CONVERT(0x3130 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `category_id` = VALUES(`category_id`),
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `short_description` = VALUES(`short_description`),
  `long_description` = VALUES(`long_description`),
  `regular_price` = VALUES(`regular_price`),
  `sale_price` = VALUES(`sale_price`),
  `stock` = VALUES(`stock`),
  `low_stock_threshold` = VALUES(`low_stock_threshold`),
  `sku` = VALUES(`sku`),
  `badge` = VALUES(`badge`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `short_description`, `long_description`, `regular_price`, `sale_price`, `stock`, `low_stock_threshold`, `sku`, `badge`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x32 USING utf8mb4), CONVERT(0x32 USING utf8mb4), CONVERT(0x4e65786f204368617267652033 USING utf8mb4), CONVERT(0x6e65786f2d6368617267652d33 USING utf8mb4), CONVERT(0x4361726761646f72206d756c746970756572746f20636f6d706163746f2070617261207475206573706163696f2064652074726162616a6f206f207669616a652e USING utf8mb4), CONVERT(0x4e65786f204368617267652033206f66726563652070756572746f732076657273c3a174696c657320656e20756e20666f726d61746f206c696d70696f2079206c696765726f2c20696465616c2070617261206d616e74656e65722074757320646973706f73697469766f73206c6973746f7320647572616e746520656c2064c3ad612e USING utf8mb4), CONVERT(0x3439 USING utf8mb4), NULL, CONVERT(0x3432 USING utf8mb4), CONVERT(0x38 USING utf8mb4), CONVERT(0x4c554d2d4d4f422d303031 USING utf8mb4), CONVERT(0x4e5545564f USING utf8mb4), CONVERT(0x3230 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `category_id` = VALUES(`category_id`),
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `short_description` = VALUES(`short_description`),
  `long_description` = VALUES(`long_description`),
  `regular_price` = VALUES(`regular_price`),
  `sale_price` = VALUES(`sale_price`),
  `stock` = VALUES(`stock`),
  `low_stock_threshold` = VALUES(`low_stock_threshold`),
  `sku` = VALUES(`sku`),
  `badge` = VALUES(`badge`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `short_description`, `long_description`, `regular_price`, `sale_price`, `stock`, `low_stock_threshold`, `sku`, `badge`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x33 USING utf8mb4), CONVERT(0x33 USING utf8mb4), CONVERT(0x4f72626974204465736b205374616e64 USING utf8mb4), CONVERT(0x6f726269742d6465736b2d7374616e64 USING utf8mb4), CONVERT(0x4261736520616a75737461626c65207061726120656c6576617220747520706f7274c3a174696c2079206d616e74656e657220756e6120706f73747572612063c3b36d6f64612e USING utf8mb4), CONVERT(0x4f72626974204465736b205374616e642061797564612061206f7267616e697a617220747520c3a17265612064652074726162616a6f20636f6e20756e6120696e636c696e616369c3b36e2065737461626c652c2073757065726669636965206c696d706961207920756e20666f726d61746f2066c3a163696c206465206d6f7665722e USING utf8mb4), CONVERT(0x3734 USING utf8mb4), CONVERT(0x3539 USING utf8mb4), CONVERT(0x3138 USING utf8mb4), CONVERT(0x34 USING utf8mb4), CONVERT(0x4c554d2d44534b2d303031 USING utf8mb4), CONVERT(0x50524543494f20455350454349414c USING utf8mb4), CONVERT(0x3330 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `category_id` = VALUES(`category_id`),
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `short_description` = VALUES(`short_description`),
  `long_description` = VALUES(`long_description`),
  `regular_price` = VALUES(`regular_price`),
  `sale_price` = VALUES(`sale_price`),
  `stock` = VALUES(`stock`),
  `low_stock_threshold` = VALUES(`low_stock_threshold`),
  `sku` = VALUES(`sku`),
  `badge` = VALUES(`badge`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `short_description`, `long_description`, `regular_price`, `sale_price`, `stock`, `low_stock_threshold`, `sku`, `badge`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x34 USING utf8mb4), CONVERT(0x34 USING utf8mb4), CONVERT(0x48616c6f204c69676874204f6e65 USING utf8mb4), CONVERT(0x68616c6f2d6c696768742d6f6e65 USING utf8mb4), CONVERT(0x4c757a20616d6269656e74616c20726567756c61626c652070617261206372656172206573706163696f73206dc3a1732063c3b36d6f646f732e USING utf8mb4), CONVERT(0x48616c6f204c69676874204f6e65206f667265636520696c756d696e616369c3b36e207375617665207920636f6e74726f6c65732073696d706c657320706172612061636f6d7061c3b1617220736573696f6e6573206465206c6563747572612c2074726162616a6f206f2064657363616e736f2e USING utf8mb4), CONVERT(0x3839 USING utf8mb4), NULL, CONVERT(0x3136 USING utf8mb4), CONVERT(0x34 USING utf8mb4), CONVERT(0x4c554d2d484f4d2d303031 USING utf8mb4), '', CONVERT(0x3430 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `category_id` = VALUES(`category_id`),
  `name` = VALUES(`name`),
  `slug` = VALUES(`slug`),
  `short_description` = VALUES(`short_description`),
  `long_description` = VALUES(`long_description`),
  `regular_price` = VALUES(`regular_price`),
  `sale_price` = VALUES(`sale_price`),
  `stock` = VALUES(`stock`),
  `low_stock_threshold` = VALUES(`low_stock_threshold`),
  `sku` = VALUES(`sku`),
  `badge` = VALUES(`badge`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);


-- product_images: 1 registro(s).
INSERT INTO `product_images` (`product_id`, `media_id`, `alt_text`, `sort_order`, `created_at`)
VALUES (CONVERT(0x31 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x4175726f726120536f756e64204d696e69 USING utf8mb4), CONVERT(0x30 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `alt_text` = VALUES(`alt_text`),
  `sort_order` = VALUES(`sort_order`);


-- product_variants: 3 registro(s).
INSERT INTO `product_variants` (`id`, `product_id`, `option_name`, `option_value`, `sku`, `price_delta`, `stock`, `sort_order`, `created_at`, `updated_at`)
VALUES (CONVERT(0x3130 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x636f6c6f72 USING utf8mb4), CONVERT(0x726f6a6f USING utf8mb4), CONVERT(0x4c554d2d4155442d303031 USING utf8mb4), CONVERT(0x3939 USING utf8mb4), CONVERT(0x3131 USING utf8mb4), CONVERT(0x30 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `product_id` = VALUES(`product_id`),
  `option_name` = VALUES(`option_name`),
  `option_value` = VALUES(`option_value`),
  `sku` = VALUES(`sku`),
  `price_delta` = VALUES(`price_delta`),
  `stock` = VALUES(`stock`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `product_variants` (`id`, `product_id`, `option_name`, `option_value`, `sku`, `price_delta`, `stock`, `sort_order`, `created_at`, `updated_at`)
VALUES (CONVERT(0x3131 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x636f6c6f72 USING utf8mb4), CONVERT(0x6e6567726f USING utf8mb4), CONVERT(0x4c554d2d4155442d303031 USING utf8mb4), CONVERT(0x3939 USING utf8mb4), CONVERT(0x3939 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `product_id` = VALUES(`product_id`),
  `option_name` = VALUES(`option_name`),
  `option_value` = VALUES(`option_value`),
  `sku` = VALUES(`sku`),
  `price_delta` = VALUES(`price_delta`),
  `stock` = VALUES(`stock`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `product_variants` (`id`, `product_id`, `option_name`, `option_value`, `sku`, `price_delta`, `stock`, `sort_order`, `created_at`, `updated_at`)
VALUES (CONVERT(0x3132 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x636f6c6f72 USING utf8mb4), CONVERT(0x726f7361 USING utf8mb4), CONVERT(0x4c554d2d4155442d303031 USING utf8mb4), CONVERT(0x313030 USING utf8mb4), CONVERT(0x34 USING utf8mb4), CONVERT(0x32 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30313a3035 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `product_id` = VALUES(`product_id`),
  `option_name` = VALUES(`option_name`),
  `option_value` = VALUES(`option_value`),
  `sku` = VALUES(`sku`),
  `price_delta` = VALUES(`price_delta`),
  `stock` = VALUES(`stock`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = VALUES(`updated_at`);


-- banners: 1 registro(s).
INSERT INTO `banners` (`id`, `eyebrow`, `title`, `body`, `cta_label`, `cta_target`, `theme`, `media_id`, `sort_order`, `status`, `starts_at`, `ends_at`, `created_at`, `updated_at`)
VALUES (CONVERT(0x31 USING utf8mb4), CONVERT(0x53656c65636369c3b36e204cc3ba6d696e61 USING utf8mb4), CONVERT(0x5465636e6f6c6f67c3ad61207175652061636f6d7061c3b1612074752064c3ad612e USING utf8mb4), CONVERT(0x556e61207469656e6461206dc3a1732073696d706c652c20636f6e2070726f647563746f7320636c61726f732079206174656e6369c3b36e2064697265637461206375616e646f206c61206e65636573697465732e USING utf8mb4), CONVERT(0x4578706c6f72617220636174c3a16c6f676f USING utf8mb4), CONVERT(0x23636174616c6f676f USING utf8mb4), CONVERT(0x6461726b USING utf8mb4), NULL, CONVERT(0x3130 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), NULL, NULL, CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `eyebrow` = VALUES(`eyebrow`),
  `title` = VALUES(`title`),
  `body` = VALUES(`body`),
  `cta_label` = VALUES(`cta_label`),
  `cta_target` = VALUES(`cta_target`),
  `theme` = VALUES(`theme`),
  `media_id` = VALUES(`media_id`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `starts_at` = VALUES(`starts_at`),
  `ends_at` = VALUES(`ends_at`),
  `updated_at` = VALUES(`updated_at`);


-- campaigns: 0 registro(s).

-- notices: 1 registro(s).
INSERT INTO `notices` (`id`, `type`, `title`, `message`, `cta_label`, `cta_target`, `dismissible`, `priority`, `status`, `starts_at`, `ends_at`, `created_at`, `updated_at`)
VALUES (CONVERT(0x32 USING utf8mb4), CONVERT(0x70726f6d6f74696f6e USING utf8mb4), CONVERT(0x656e76696f7320677261746973206120746f646f20517569746f USING utf8mb4), CONVERT(0x736f6c6f20706f7220686f79 USING utf8mb4), '', '', CONVERT(0x31 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x616374697665 USING utf8mb4), NULL, NULL, CONVERT(0x323032362d30392d32372030303a34393a3037 USING utf8mb4), CONVERT(0x323032362d30392d32372030303a34393a3037 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `type` = VALUES(`type`),
  `title` = VALUES(`title`),
  `message` = VALUES(`message`),
  `cta_label` = VALUES(`cta_label`),
  `cta_target` = VALUES(`cta_target`),
  `dismissible` = VALUES(`dismissible`),
  `priority` = VALUES(`priority`),
  `status` = VALUES(`status`),
  `starts_at` = VALUES(`starts_at`),
  `ends_at` = VALUES(`ends_at`),
  `updated_at` = VALUES(`updated_at`);


-- trust_cards: 4 registro(s).
INSERT INTO `trust_cards` (`id`, `icon_key`, `theme`, `title`, `body`, `cta_label`, `cta_target`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x31 USING utf8mb4), CONVERT(0x636c6f636b USING utf8mb4), CONVERT(0x6c69676874 USING utf8mb4), CONVERT(0x456e76c3ad6f2073656775726f USING utf8mb4), CONVERT(0x456e76c3ad6f2073696e20636f73746f20656e20636f6d7072617320646573646520243235302e USING utf8mb4), '', '', CONVERT(0x3130 USING utf8mb4), CONVERT(0x68696464656e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030313a33363a3538 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `icon_key` = VALUES(`icon_key`),
  `theme` = VALUES(`theme`),
  `title` = VALUES(`title`),
  `body` = VALUES(`body`),
  `cta_label` = VALUES(`cta_label`),
  `cta_target` = VALUES(`cta_target`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `trust_cards` (`id`, `icon_key`, `theme`, `title`, `body`, `cta_label`, `cta_target`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x32 USING utf8mb4), CONVERT(0x636865636b USING utf8mb4), CONVERT(0x616363656e74 USING utf8mb4), CONVERT(0x436174c3a16c6f676f206375696461646f USING utf8mb4), CONVERT(0x50726f647563746f7320792070726563696f73206564697461626c657320646573646520656c2070616e656c2e USING utf8mb4), '', '', CONVERT(0x3230 USING utf8mb4), CONVERT(0x68696464656e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030313a33373a3135 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `icon_key` = VALUES(`icon_key`),
  `theme` = VALUES(`theme`),
  `title` = VALUES(`title`),
  `body` = VALUES(`body`),
  `cta_label` = VALUES(`cta_label`),
  `cta_target` = VALUES(`cta_target`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `trust_cards` (`id`, `icon_key`, `theme`, `title`, `body`, `cta_label`, `cta_target`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x33 USING utf8mb4), CONVERT(0x63686174 USING utf8mb4), CONVERT(0x6c69676874 USING utf8mb4), CONVERT(0x4174656e6369c3b36e2064697265637461 USING utf8mb4), CONVERT(0x46696e616c697a612074752070656469646f20706f722057686174734170702e USING utf8mb4), '', '', CONVERT(0x3330 USING utf8mb4), CONVERT(0x68696464656e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030313a33373a3231 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `icon_key` = VALUES(`icon_key`),
  `theme` = VALUES(`theme`),
  `title` = VALUES(`title`),
  `body` = VALUES(`body`),
  `cta_label` = VALUES(`cta_label`),
  `cta_target` = VALUES(`cta_target`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `trust_cards` (`id`, `icon_key`, `theme`, `title`, `body`, `cta_label`, `cta_target`, `sort_order`, `status`, `created_at`, `updated_at`)
VALUES (CONVERT(0x34 USING utf8mb4), CONVERT(0x736869656c64 USING utf8mb4), CONVERT(0x6461726b USING utf8mb4), CONVERT(0x4765737469c3b36e2073696d706c65 USING utf8mb4), CONVERT(0x436f6e74726f6c61206c61207469656e64612064657364652041646d696e2e USING utf8mb4), '', '', CONVERT(0x3430 USING utf8mb4), CONVERT(0x68696464656e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030313a33373a3235 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `icon_key` = VALUES(`icon_key`),
  `theme` = VALUES(`theme`),
  `title` = VALUES(`title`),
  `body` = VALUES(`body`),
  `cta_label` = VALUES(`cta_label`),
  `cta_target` = VALUES(`cta_target`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);


-- reviews: 2 registro(s).
INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `status`, `is_featured`, `published_at`, `created_at`, `updated_at`)
VALUES (CONVERT(0x31 USING utf8mb4), NULL, CONVERT(0x616e64657273736f6e USING utf8mb4), CONVERT(0x35 USING utf8mb4), CONVERT(0x6275656e6120636f6d707261 USING utf8mb4), CONVERT(0x756e61206d7579206275656e61206174656e63696f207920656e7472676120726170696461 USING utf8mb4), CONVERT(0x617070726f766564 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x323032362d30392d32372030303a35343a3230 USING utf8mb4), CONVERT(0x323032362d30392d32372030303a35343a3230 USING utf8mb4), CONVERT(0x323032362d30392d32372030303a35343a3230 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `product_id` = VALUES(`product_id`),
  `author_name` = VALUES(`author_name`),
  `rating` = VALUES(`rating`),
  `title` = VALUES(`title`),
  `body` = VALUES(`body`),
  `status` = VALUES(`status`),
  `is_featured` = VALUES(`is_featured`),
  `published_at` = VALUES(`published_at`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `reviews` (`id`, `product_id`, `author_name`, `rating`, `title`, `body`, `status`, `is_featured`, `published_at`, `created_at`, `updated_at`)
VALUES (CONVERT(0x32 USING utf8mb4), NULL, CONVERT(0x65667261696e USING utf8mb4), CONVERT(0x34 USING utf8mb4), CONVERT(0x6174656e63696f6e USING utf8mb4), CONVERT(0x6d7579206275656e61 USING utf8mb4), CONVERT(0x617070726f766564 USING utf8mb4), CONVERT(0x30 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30353a3135 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3538 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30353a3135 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `product_id` = VALUES(`product_id`),
  `author_name` = VALUES(`author_name`),
  `rating` = VALUES(`rating`),
  `title` = VALUES(`title`),
  `body` = VALUES(`body`),
  `status` = VALUES(`status`),
  `is_featured` = VALUES(`is_featured`),
  `published_at` = VALUES(`published_at`),
  `updated_at` = VALUES(`updated_at`);


-- settings: 24 registro(s).
INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x61646472657373 USING utf8mb4), '', CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x63757272656e6379 USING utf8mb4), CONVERT(0x555344 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x66617669636f6e5f6d656469615f6964 USING utf8mb4), CONVERT(0x33 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x6c6f63616c65 USING utf8mb4), CONVERT(0x65732d4543 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x6c6f676f5f6d656469615f6964 USING utf8mb4), CONVERT(0x32 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x726576696577735f656e61626c6564 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x726576696577735f666f726d5f656e61626c6564 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x73656f5f6465736372697074696f6e USING utf8mb4), CONVERT(0x50726f647563746f73206465207465636e6f6c6f67c3ad6120792061636365736f72696f7320636f6e206174656e6369c3b36e206469726563746120706f722057686174734170702e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x73656f5f7469746c65 USING utf8mb4), CONVERT(0x4cc3ba6d696e612053746f726520e28094205465636e6f6c6f67c3ad6120706172612074752064c3ad61 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x7368697070696e675f6e6f74696365 USING utf8mb4), CONVERT(0x456e76c3ad6f2073696e20636f73746f20656e2070656469646f73207375706572696f7265732061202439392e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x736f6369616c5f66616365626f6f6b USING utf8mb4), '', CONVERT(0x323032362d30392d32372030313a33353a3138 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x736f6369616c5f696e7374616772616d USING utf8mb4), '', CONVERT(0x323032362d30392d32372030313a33353a3138 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x736f6369616c5f74696b746f6b USING utf8mb4), '', CONVERT(0x323032362d30392d32372030313a33353a3138 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x736f6369616c5f78 USING utf8mb4), '', CONVERT(0x323032362d30392d32372030313a33353a3138 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x736f6369616c5f796f7574756265 USING utf8mb4), '', CONVERT(0x323032362d30392d32372030313a33353a3138 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x73746f72655f656d61696c USING utf8mb4), CONVERT(0x686f6c61406c756d696e612e6578616d706c65 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x73746f72655f6e616d65 USING utf8mb4), CONVERT(0x4cc3ba6d696e612053746f7265 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x73746f72655f70686f6e65 USING utf8mb4), '', CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x73746f72655f7461676c696e65 USING utf8mb4), CONVERT(0x5465636e6f6c6f67c3ad6120792064697365c3b16f207061726120746f646f73206c6f732064c3ad61732e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x74727573745f6465736372697074696f6e USING utf8mb4), CONVERT(0x556e612073656c65636369c3b36e20636c6172612064652070726f647563746f732079206174656e6369c3b36e2064697265637461206375616e646f206c61206e65636573697465732e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x74727573745f656e61626c6564 USING utf8mb4), CONVERT(0x31 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x74727573745f7469746c65 USING utf8mb4), CONVERT(0x436f6d70726120636f6e207472616e7175696c696461642e USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x77686174736170705f6d657373616765 USING utf8mb4), CONVERT(0x486f6c612c2071756965726f207265616c697a617220656c207369677569656e74652070656469646f3a USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (CONVERT(0x77686174736170705f6e756d626572 USING utf8mb4), CONVERT(0x35393330393539313333303636 USING utf8mb4), CONVERT(0x323032362d30392d32362030353a31333a3437 USING utf8mb4), CONVERT(0x323032362d30392d32372030323a30343a3033 USING utf8mb4))
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = VALUES(`updated_at`);


COMMIT;
