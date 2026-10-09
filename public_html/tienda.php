<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/app/page-meta.php';
$pageMeta = lumina_page_meta('catalog', ['title' => 'Tienda', 'description' => 'Catálogo de tecnología disponible para pedidos por WhatsApp.']);
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f5f5f7">
  <?= $pageMeta . "\n" ?>
  <link rel="stylesheet" href="assets/css/design.css?v=2">
  <link rel="stylesheet" href="assets/css/demo-polish.css?v=2">
  <link rel="stylesheet" href="assets/css/storefront-reference.css?v=10">
  <link rel="stylesheet" href="assets/css/store-upgrade.css?v=4">
  <link rel="stylesheet" href="assets/css/apple.css?v=2">
</head>
<body data-store-view="catalog">
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <div id="store-app" class="app-shell" aria-live="polite">
    <div class="app-loading"><span class="loading-orb"></span><p>Cargando la tienda…</p></div>
  </div>
  <div id="modal-root"></div>
  <div id="toast-root" aria-live="polite" aria-atomic="true"></div>
  <noscript><p class="noscript">Activa JavaScript para ver el catálogo y realizar pedidos.</p></noscript>
  <script type="module" src="assets/js/store.js?v=17"></script>
</body>
</html>
