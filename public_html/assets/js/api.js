const API_URL = 'api.php';

export async function request(resource, action = 'get', options = {}) {
  const method = options.method || (['get', 'list', 'session', 'bootstrap', 'lookup', 'mine'].includes(action) ? 'GET' : 'POST');
  const params = new URLSearchParams({ resource, action });
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
  });
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  const requestOptions = { method, headers, credentials: 'same-origin' };

  if (options.csrf) headers['X-CSRF-Token'] = options.csrf;
  if (method !== 'GET' && method !== 'HEAD') {
    if (options.formData) {
      requestOptions.body = options.formData;
    } else {
      headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(options.data || {});
    }
  }

  let response;
  try {
    response = await fetch(`${API_URL}?${params.toString()}`, requestOptions);
  } catch {
    throw new Error('No fue posible conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('El servidor respondió con un formato inesperado.');
  }
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || 'No se pudo completar la solicitud.');
    error.status = response.status;
    error.details = payload.details || {};
    throw error;
  }
  return payload.data;
}

export const api = {
  publicStore: () => request('public'),
  session: () => request('auth', 'session'),
  login: (email, password) => request('auth', 'login', { method: 'POST', data: { email, password } }),
  logout: (csrf) => request('auth', 'logout', { method: 'POST', csrf }),
  adminBootstrap: () => request('admin', 'bootstrap'),
  list: (resource) => request(resource, 'list'),
  save: (resource, data, id, csrf) => request(resource, 'save', { method: 'POST', csrf, data: { data, ...(id ? { id } : {}) } }),
  remove: (resource, id, csrf) => request(resource, 'delete', { method: 'POST', csrf, data: { id } }),
  settings: (data, csrf) => request('settings', 'save', { method: 'POST', csrf, data: { data } }),
  upload: (file, kind, csrf) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    return request('upload', 'save', { method: 'POST', csrf, formData });
  },
  review: (data) => request('reviews', 'submit', { method: 'POST', data }),
  whatsappOrder: (data) => request('orders', 'whatsapp', { method: 'POST', data }),
  trackOrder: (guide) => request('tracking', 'lookup', { query: { guide } }),
  myOrders: (guides) => request('tracking', 'mine', { query: { guides: guides.join(',') } }),
};
