<?php
declare(strict_types=1);
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Consulta el estado de tu pedido con tu código de seguimiento.">
  <meta name="theme-color" content="#f5f5f7">
  <title>Seguimiento de pedido</title>
  <link rel="stylesheet" href="assets/css/design.css?v=2">
  <link rel="stylesheet" href="assets/css/demo-polish.css?v=2">
  <link rel="stylesheet" href="assets/css/storefront-reference.css?v=10">
  <link rel="stylesheet" href="assets/css/tracking.css?v=2">
  <link rel="stylesheet" href="assets/css/store-upgrade.css?v=4">
  <link rel="stylesheet" href="assets/css/apple.css?v=4">
</head>
<body data-store-view="tracking">
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <div id="store-app" class="app-shell" aria-live="polite">
    <div class="app-loading"><span class="loading-orb"></span><p>Preparando seguimiento…</p></div>
  </div>
  <div id="modal-root"></div>
  <div id="toast-root" aria-live="polite" aria-atomic="true"></div>
  <noscript><p class="noscript">Activa JavaScript para consultar el estado de tu pedido.</p></noscript>
  <script type="module" src="assets/js/store.js?v=18"></script>
</body>
</html>
