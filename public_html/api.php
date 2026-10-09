<?php
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: SAMEORIGIN');

try {
    $pdo = lumina_db();
    $resource = strtolower((string) ($_GET['resource'] ?? 'public'));
    $action = strtolower((string) ($_GET['action'] ?? 'get'));

    if ($resource === 'public' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        lumina_json(['ok' => true, 'data' => lumina_public_payload($pdo)]);
    }

    if ($resource === 'auth') {
        if ($action === 'session' && $_SERVER['REQUEST_METHOD'] === 'GET') {
            $user = lumina_current_user($pdo);
            lumina_json(['ok' => true, 'data' => ['user' => $user, 'csrf_token' => $user ? lumina_csrf_token() : null]]);
        }
        if ($action === 'login') {
            lumina_require_method('POST');
            $data = lumina_request_data();
            $user = lumina_login($pdo, (string) ($data['email'] ?? ''), (string) ($data['password'] ?? ''));
            lumina_record_activity($pdo, (int) $user['id'], 'login', 'user', (int) $user['id'], 'Sesión iniciada');
            lumina_json(['ok' => true, 'data' => ['user' => $user, 'csrf_token' => lumina_csrf_token()]]);
        }
        if ($action === 'update-profile') {
            lumina_require_method('POST');
            $user = lumina_require_admin($pdo);
            lumina_require_csrf();
            $updated = lumina_update_current_user($pdo, $user, lumina_request_data());
            lumina_json(['ok' => true, 'data' => ['user' => $updated, 'csrf_token' => lumina_csrf_token()]]);
        }
        if ($action === 'logout') {
            lumina_require_method('POST');
            $user = lumina_require_admin($pdo);
            lumina_require_csrf();
            lumina_record_activity($pdo, (int) $user['id'], 'logout', 'user', (int) $user['id'], 'Sesión cerrada');
            lumina_logout();
            lumina_json(['ok' => true]);
        }
        lumina_error('Acción de autenticación no encontrada.', 404);
    }

    if ($resource === 'reviews' && $action === 'submit') {
        lumina_require_method('POST');
        $data = lumina_request_data();
        $id = lumina_submit_public_review($pdo, $data);
        lumina_json(['ok' => true, 'data' => ['id' => $id, 'message' => 'Gracias. Tu reseña será publicada después de la moderación.']], 201);
    }

    if ($resource === 'orders' && $action === 'whatsapp') {
        lumina_require_method('POST');
        $data = lumina_request_data();
        $order = lumina_create_whatsapp_order($pdo, $data);
        lumina_json(['ok' => true, 'data' => $order], 201);
    }

    // A guide (store or courier) is intentionally sufficient to look up a
    // shipment. The response never contains the customer's name, phone,
    // address, note or items. Failed lookups are rate limited per client so
    // guides cannot be guessed by brute force.
    if ($resource === 'tracking' && in_array($action, ['lookup', 'get', 'mine'], true)) {
        lumina_require_method('GET');
        $throttleKey = lumina_client_key('tracking');
        if (!lumina_throttle($pdo, 'tracking', $throttleKey, 25)) {
            lumina_error('Hiciste demasiadas consultas seguidas. Espera unos minutos e inténtalo de nuevo.', 429);
        }
        if ($action === 'mine') {
            // "Mis pedidos": guides remembered on the customer's device.
            $guides = array_slice(array_filter(array_map('trim', explode(',', (string) ($_GET['guides'] ?? '')))), 0, 12);
            $found = [];
            foreach ($guides as $guide) {
                try {
                    $tracking = lumina_public_order_tracking($pdo, $guide);
                } catch (InvalidArgumentException) {
                    $tracking = null;
                }
                if ($tracking) {
                    unset($tracking['events']);
                    $found[] = $tracking;
                }
            }
            lumina_json(['ok' => true, 'data' => $found]);
        }
        $guide = (string) ($_GET['guide'] ?? $_GET['tracking_code'] ?? '');
        try {
            $tracking = lumina_public_order_tracking($pdo, $guide);
        } catch (InvalidArgumentException) {
            $tracking = null;
        }
        if (!$tracking) {
            lumina_throttle_failure($pdo, 'tracking', $throttleKey, 25);
            lumina_error('No encontramos un pedido con esa guía. Revisa que esté completa (por ejemplo CS-261008-AB12CD34) o usa la guía de la transportadora.', 404);
        }
        lumina_json(['ok' => true, 'data' => $tracking]);
    }

    if ($resource === 'admin' && $action === 'bootstrap') {
        lumina_require_method('GET');
        $user = lumina_require_admin($pdo);
        lumina_json(['ok' => true, 'data' => lumina_admin_bootstrap($pdo) + ['user' => $user, 'csrf_token' => lumina_csrf_token()]]);
    }

    $user = lumina_require_admin($pdo);
    if ($resource === 'orders') {
        if (in_array($action, ['list', 'get'], true)) {
            lumina_require_method('GET');
            lumina_json(['ok' => true, 'data' => lumina_admin_orders($pdo)]);
        }

        lumina_require_method('POST');
        lumina_require_csrf();
        $payload = lumina_request_data();
        $data = is_array($payload['data'] ?? null) ? $payload['data'] : $payload;
        $rawId = $payload['id'] ?? ($data['id'] ?? null);
        $id = lumina_int($rawId, 1);

        // `status` is kept as a narrow alias for integrations while the
        // admin UI uses the explicit confirm and cancel actions.
        if ($action === 'status') {
            $requested = strtolower((string) ($data['status'] ?? ''));
            $action = match ($requested) {
                'confirmed' => 'confirm',
                'cancelled' => 'cancel',
                default => throw new InvalidArgumentException('El estado de pedido no es válido.'),
            };
        }

        if ($action === 'confirm') {
            $order = lumina_change_order_status($pdo, $id, 'confirmed', (int) $user['id']);
            lumina_json(['ok' => true, 'data' => $order]);
        }
        if ($action === 'cancel') {
            $order = lumina_change_order_status($pdo, $id, 'cancelled', (int) $user['id']);
            lumina_json(['ok' => true, 'data' => $order]);
        }
        if (in_array($action, ['shipment', 'shipment-save', 'update-shipment'], true)) {
            $order = lumina_save_order_shipment($pdo, $id, $data, (int) $user['id']);
            lumina_json(['ok' => true, 'data' => $order]);
        }
        if ($action === 'delete') {
            lumina_delete_order($pdo, $id, (int) $user['id']);
            lumina_json(['ok' => true, 'data' => ['id' => $id, 'deleted' => true]]);
        }
        lumina_error('Acción de pedido no encontrada.', 404);
    }

    if ($resource === 'upload') {
        lumina_require_method('POST');
        lumina_require_csrf();
        $file = $_FILES['file'] ?? null;
        if (!is_array($file)) {
            lumina_error('Selecciona una imagen para subir.', 422);
        }
        $kind = lumina_clean_string($_POST['kind'] ?? 'media', 30);
        $media = lumina_handle_upload($pdo, $file, $kind);
        lumina_record_activity($pdo, (int) $user['id'], 'uploaded', 'media', $media['id'], 'Imagen subida');
        lumina_json(['ok' => true, 'data' => $media], 201);
    }

    if ($resource === 'settings') {
        lumina_require_method('POST');
        lumina_require_csrf();
        $payload = lumina_request_data();
        lumina_save_settings($pdo, $payload['data'] ?? $payload, (int) $user['id']);
        lumina_json(['ok' => true, 'data' => lumina_settings($pdo)]);
    }

    $resources = ['categories', 'products', 'banners', 'campaigns', 'notices', 'trust-cards', 'reviews'];
    if (!in_array($resource, $resources, true)) {
        lumina_error('Recurso no encontrado.', 404);
    }
    if ($action === 'list') {
        lumina_require_method('GET');
        lumina_json(['ok' => true, 'data' => lumina_admin_records($pdo, $resource)]);
    }
    lumina_require_method('POST');
    lumina_require_csrf();
    $payload = lumina_request_data();
    $data = $payload['data'] ?? $payload;
    $id = !empty($payload['id']) ? lumina_int($payload['id'], 1) : (!empty($data['id']) ? lumina_int($data['id'], 1) : null);
    if ($action === 'save') {
        $result = match ($resource) {
            'categories' => lumina_save_category($pdo, $data, $id, (int) $user['id']),
            'products' => lumina_save_product($pdo, $data, $id, (int) $user['id']),
            'banners' => lumina_save_banner($pdo, $data, $id, (int) $user['id']),
            'campaigns' => lumina_save_campaign($pdo, $data, $id, (int) $user['id']),
            'notices' => lumina_save_notice($pdo, $data, $id, (int) $user['id']),
            'trust-cards' => lumina_save_trust_card($pdo, $data, $id, (int) $user['id']),
            'reviews' => lumina_save_review($pdo, $data, $id, (int) $user['id']),
        };
        lumina_json(['ok' => true, 'data' => $result]);
    }
    if ($action === 'delete') {
        if (!$id) lumina_error('Identificador inválido.', 422);
        lumina_delete_resource($pdo, $resource, $id, (int) $user['id']);
        lumina_json(['ok' => true]);
    }
    lumina_error('Acción no encontrada.', 404);
} catch (InvalidArgumentException $exception) {
    lumina_error($exception->getMessage(), 422);
} catch (RuntimeException $exception) {
    lumina_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    error_log('[Lúmina] ' . $exception->getMessage());
    $message = lumina_config('debug') ? $exception->getMessage() : 'Ocurrió un error inesperado. Intenta nuevamente.';
    lumina_error($message, 500);
}
