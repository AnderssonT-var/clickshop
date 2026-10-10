/*
 * Store back-office UI
 * This file intentionally owns presentation and browser interactions only.
 * All persistence, authorization, CSRF validation and upload validation stay
 * on the PHP API. It has no third-party runtime dependency.
 */

const app = document.getElementById('admin-app');
const modalRoot = document.getElementById('admin-modal-root');
const toastRoot = document.getElementById('toast-root');
// Keep the API at the public-site root. A relative URL would resolve to
// /admin/api.php when the friendly /admin/ route is used.
const API_URL = '/api.php';

const emptyData = () => ({
  settings: {},
  categories: [],
  products: [],
  banners: [],
  campaigns: [],
  notices: [],
  trustCards: [],
  reviews: [],
  orders: [],
  activity: [],
});

const state = {
  user: null,
  csrf: '',
  data: emptyData(),
  activeView: 'dashboard',
  sidebarOpen: false,
  loading: false,
  productList: {
    query: '',
    categoryId: '',
    page: 1,
    pageSize: 10,
  },
  orderList: {
    loading: false,
    loaded: false,
    filter: 'all',
    query: '',
  },
  pendingConfirmation: null,
};

const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.6" cy="6.5" r="1.1" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 21v-8h2.9l.45-3h-3.35V8.1c0-.87.25-1.46 1.5-1.46H17.7V3.96c-.34-.05-1.47-.14-2.8-.14-2.77 0-4.67 1.69-4.67 4.79V10H7.1v3h3.1v8h4Z" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3c.25 2.38 1.7 3.9 4 4.2v3c-1.46-.08-2.82-.57-4-1.46v5.92a5.65 5.65 0 1 1-4.88-5.6v3.08a2.6 2.6 0 1 0 1.88 2.5V3h3Z" fill="currentColor"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z" fill="currentColor"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" fill="currentColor"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h10v11H9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 9V4H5v11h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 1 1 14 0c0 5-7 11-7 11Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01Zm-7.01 15.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.25 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" fill="currentColor"/></svg>',
  logo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 19.4 7v10L12 21.2 4.6 17V7L12 2.8Zm0 2.3L6.7 8v8L12 18.9 17.3 16V8L12 5.1Zm0 3.1 2.6 1.5v3L12 14.1l-2.6-1.5v-3L12 8.2Z" fill="currentColor"/></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" fill="currentColor"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V6a5 5 0 0 1 10 0v2h2l1 12H4L5 8h2Zm2 0h6V6a3 3 0 0 0-6 0v2Zm-2.2 2-.66 8h11.72l-.66-8H6.8Z" fill="currentColor"/></svg>',
  folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.7A2.7 2.7 0 0 1 5.7 4H10l2 2h6.3A2.7 2.7 0 0 1 21 8.7v8.6a2.7 2.7 0 0 1-2.7 2.7H5.7A2.7 2.7 0 0 1 3 17.3V6.7Zm2 .3v10h14V8h-7l-2-2H5v1Z" fill="currentColor"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4V4Zm2 2v10.6l3.7-3.7 3.1 3.1 2.1-2.1 3.1 3.1V6H6Zm3.1 2.1a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" fill="currentColor"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.55 5.45L19 9l-5.45 1.55L12 16l-1.55-5.45L5 9l5.45-1.55L12 2Zm7 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" fill="currentColor"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.6 2.6 0 0 0 2.45-1.75h-4.9A2.6 2.6 0 0 0 12 22Zm7-4.25-1.7-2.22V10a5.3 5.3 0 0 0-4.3-5.2V4a1 1 0 1 0-2 0v.8A5.3 5.3 0 0 0 6.7 10v5.53L5 17.75v.5h14v-.5Z" fill="currentColor"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 8 3v5.7c0 5.1-3.4 9.85-8 11.3-4.6-1.45-8-6.2-8-11.3V5l8-3Zm0 2.13L6 6.38v4.32c0 3.88 2.46 7.75 6 9.13 3.54-1.38 6-5.25 6-9.13V6.38l-6-2.25Z" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.76 5.6 6.18.9-4.47 4.36 1.06 6.16L12 17.12l-5.53 2.9 1.06-6.16L3.06 9.5l6.18-.9L12 3Z" fill="currentColor"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58-1.92-3.32-2.39.96a7.5 7.5 0 0 0-1.63-.94L14.86 3h-3.84l-.36 3.18c-.58.24-1.13.55-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58A7.7 7.7 0 0 0 6.74 12c0 .32.02.63.07.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.39 1.05.7 1.63.94l.36 3.18h3.84l.36-3.18c.58-.24 1.13-.55 1.63-.94l2.39.96 1.92-3.32-2.08-1.58ZM12.94 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" fill="currentColor"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5v-2H7V6h3V4Zm4.3 3.3-1.4 1.4 2.3 2.3H9v2h6.2l-2.3 2.3 1.4 1.4 4.7-4.7-4.7-4.7Z" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.9-.7 3.8 3.8-.7L18 9.1l-3.1-3.1L4 16.9ZM16 4.9l1-1a2.2 2.2 0 0 1 3.1 3.1l-1 1L16 4.9Z" fill="currentColor"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.8 12H7.8L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6-5.6 5.6L5 17.6l5.6-5.6L5 6.4 6.4 5Z" fill="currentColor"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.5 14.1 4.5 4.5-1.4 1.4-4.5-4.5a7 7 0 1 1 1.4-1.4ZM10 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="currentColor"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h2V9.85l2.58 2.58L17 11l-5-5-5 5 1.42 1.43L11 9.85V17Zm-6 2h14v-2H5v2Z" fill="currentColor"/></svg>',
  external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14V4ZM5 6h6v2H7v9h9v-4h2v6H5V6Z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.2-3.7-3.7 1.4-1.4 2.3 2.3 7.9-7.9 1.4 1.4-9.3 9.3Z" fill="currentColor"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h11v10H3V5Zm2 2v6h7V7H5Zm10 2h3.5L21 12v3h-1.1a3 3 0 0 1-5.8 0H12v-2h7v-.38L17.5 11H15V9Zm-8 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm10 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" fill="currentColor"/></svg>',
  route: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3a4 4 0 0 1 4 4c0 3-4 7.5-4 7.5S3 10 3 7a4 4 0 0 1 4-4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 5a4 4 0 0 1 4 4c0 3-4 7.5-4 7.5s-4-4.5-4-7.5a4 4 0 0 1 4-4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9 18h6v2H9v-2Z" fill="currentColor"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.3 0 9.1 4.4 10 7-1 2.6-4.7 7-10 7S2.9 14.6 2 12c.9-2.6 4.7-7 10-7Zm0 2c-3.7 0-6.5 2.8-7.7 5 1.2 2.2 4 5 7.7 5s6.5-2.8 7.7-5C18.5 9.8 15.7 7 12 7Zm0 2.3A2.7 2.7 0 1 1 12 14.7 2.7 2.7 0 0 1 12 9.3Z" fill="currentColor"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.3 3 16.7 16.7-1.4 1.4-3-3A11.3 11.3 0 0 1 12 19C6.7 19 2.9 14.6 2 12c.45-1.29 1.5-3.08 3.15-4.55L2.9 5.2 4.3 3Zm2.28 5.1C5.42 9.15 4.58 10.7 4.3 12c1.2 2.2 4 5 7.7 5 1.07 0 2.05-.23 2.94-.62l-1.65-1.65a4.7 4.7 0 0 1-5.7-5.7L6.58 8.1ZM12 5c5.3 0 9.1 4.4 10 7-.37 1.03-1.16 2.49-2.43 3.77l-1.42-1.42A10.3 10.3 0 0 0 19.7 12C18.5 9.8 15.7 7 12 7c-.55 0-1.07.06-1.56.17L8.8 5.53C9.8 5.18 10.87 5 12 5Zm0 4.3a2.7 2.7 0 0 1 2.7 2.7c0 .33-.06.64-.16.93l-3.47-3.47c.29-.1.6-.16.93-.16Z" fill="currentColor"/></svg>',
};

const NAVIGATION = [
  { label: 'Visión general', items: [{ id: 'dashboard', label: 'Panel', icon: 'grid' }] },
  { label: 'Catálogo', items: [{ id: 'products', label: 'Productos', icon: 'bag' }, { id: 'categories', label: 'Categorías', icon: 'folder' }] },
  { label: 'Ventas', items: [{ id: 'orders', label: 'Pedidos', icon: 'bag' }] },
  { label: 'Experiencia', items: [{ id: 'banners', label: 'Banners', icon: 'image' }, { id: 'campaigns', label: 'Promociones', icon: 'sparkles' }, { id: 'notices', label: 'Avisos y alertas', icon: 'bell' }, { id: 'trust', label: 'Tarjetas de confianza', icon: 'shield' }] },
  { label: 'Comunidad', items: [{ id: 'reviews', label: 'Reseñas', icon: 'star' }] },
  { label: 'Configuración', items: [{ id: 'settings', label: 'Tienda y WhatsApp', icon: 'settings' }] },
];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function safeUrl(value) {
  const candidate = String(value ?? '').trim();
  if (!candidate) return '';
  if (/^(\/|\.\/|\.\.\/|uploads\/)/i.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate, window.location.href);
    if (parsed.protocol === 'https:' || parsed.origin === window.location.origin) return parsed.href;
  } catch {
    // An invalid URL should never be inserted into an image source.
  }
  return '';
}

function icon(name) {
  return ICONS[name] || ICONS.grid;
}

function firstLetter(value) {
  return String(value || 'T').trim().charAt(0).toUpperCase() || 'T';
}

function displayName() {
  return state.data.settings.store_name || 'Tienda';
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-EC').format(Number(value || 0));
}

function money(value) {
  const currency = state.data.settings.currency || 'USD';
  const locale = state.data.settings.locale || 'es-EC';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return '—';
  // A plain date (2026-10-12) must stay on that calendar day in local time.
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const date = plain ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])) : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(date);
}

function dateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function field(label, name, value = '', options = {}) {
  const type = options.type || 'text';
  const full = options.full ? ' field--full' : '';
  const required = options.required ? ' required' : '';
  const placeholder = options.placeholder ? ` placeholder="${escapeHTML(options.placeholder)}"` : '';
  const hint = options.hint ? `<p class="field-hint">${escapeHTML(options.hint)}</p>` : '';
  const attrs = options.attrs || '';
  if (type === 'textarea') {
    return `<div class="field${full}"><label for="field-${escapeHTML(name)}">${escapeHTML(label)}</label><textarea class="textarea" id="field-${escapeHTML(name)}" name="${escapeHTML(name)}"${required}${placeholder} ${attrs}>${escapeHTML(value)}</textarea>${hint}</div>`;
  }
  if (type === 'select') {
    const choices = options.choices || [];
    const optionsHTML = choices.map((choice) => `<option value="${escapeHTML(choice.value)}"${String(choice.value) === String(value ?? '') ? ' selected' : ''}>${escapeHTML(choice.label)}</option>`).join('');
    return `<div class="field${full}"><label for="field-${escapeHTML(name)}">${escapeHTML(label)}</label><select class="select" id="field-${escapeHTML(name)}" name="${escapeHTML(name)}"${required} ${attrs}>${optionsHTML}</select>${hint}</div>`;
  }
  if (type === 'checkbox') {
    return `<label class="checkbox-row${full}"><input type="checkbox" name="${escapeHTML(name)}" value="1"${value === true || value === 1 || value === '1' ? ' checked' : ''} ${attrs}><span>${escapeHTML(label)}</span></label>${hint}`;
  }
  const formatted = type === 'date' ? dateInputValue(value) : value;
  return `<div class="field${full}"><label for="field-${escapeHTML(name)}">${escapeHTML(label)}</label><input class="input" id="field-${escapeHTML(name)}" type="${escapeHTML(type)}" name="${escapeHTML(name)}" value="${escapeHTML(formatted)}"${required}${placeholder} ${attrs}>${hint}</div>`;
}

function passwordField(label, name, options = {}) {
  const full = options.full ? ' field--full' : '';
  const required = options.required ? ' required' : '';
  const placeholder = options.placeholder ? ` placeholder="${escapeHTML(options.placeholder)}"` : '';
  const hint = options.hint ? `<p class="field-hint">${escapeHTML(options.hint)}</p>` : '';
  const attrs = options.attrs || '';
  const inputId = `field-${name}`;
  const value = options.value || '';
  return `<div class="field${full}"><label for="${escapeHTML(inputId)}">${escapeHTML(label)}</label><span style="position:relative;display:block"><input class="input" id="${escapeHTML(inputId)}" type="password" name="${escapeHTML(name)}" value="${escapeHTML(value)}"${required}${placeholder} ${attrs} style="padding-right:48px"><button class="icon-button" type="button" data-action="toggle-password-visibility" data-password-target="${escapeHTML(inputId)}" aria-label="Mostrar contraseña" aria-pressed="false" title="Mostrar contraseña" style="position:absolute;top:50%;right:7px;width:34px;height:34px;transform:translateY(-50%);border:0;background:transparent;color:#515156">${icon('eye')}</button></span>${hint}</div>`;
}

function statusPill(status) {
  const clean = String(status || 'draft').replace(/[^a-z_-]/gi, '');
  const labels = {
    active: 'Activo', draft: 'Borrador', archived: 'Archivado', hidden: 'Oculto', paused: 'Pausado', pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', out_of_stock: 'Sin stock',
    whatsapp_pending: 'Pendiente de WhatsApp', confirmed: 'Confirmado', processing: 'En proceso', completed: 'Completado', cancelled: 'Cancelado',
  };
  const className = ['active', 'approved', 'confirmed', 'processing', 'completed'].includes(clean) ? 'status--active' : ['pending', 'whatsapp_pending', 'paused', 'out_of_stock'].includes(clean) ? 'status--warning' : clean === 'draft' ? 'status--draft' : 'status--inactive';
  return `<span class="status ${className}">${escapeHTML(labels[clean] || clean)}</span>`;
}

function productThumb(url, name) {
  const src = safeUrl(url);
  return src
    ? `<img class="admin-table__thumb" src="${escapeHTML(src)}" alt="${escapeHTML(name || '')}">`
    : `<span class="admin-table__thumb" aria-hidden="true" style="display:grid;place-items:center;color:#86868b">${icon('image')}</span>`;
}

function editorialImage(url, label) {
  const src = safeUrl(url);
  return src
    ? `<img class="admin-asset-card__image" src="${escapeHTML(src)}" alt="${escapeHTML(label || '')}">`
    : `<div class="admin-asset-card__image admin-asset-card__image--empty" aria-hidden="true">${icon('image')}</div>`;
}

async function api(resource, action = '', options = {}) {
  const url = new URL(API_URL, window.location.href);
  url.searchParams.set('resource', resource);
  if (action) url.searchParams.set('action', action);
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  let body;
  if (options.formData) {
    body = options.formData;
  } else if (options.data !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.data);
  }
  if (options.csrf !== false && state.csrf && method !== 'GET') headers['X-CSRF-Token'] = state.csrf;
  let response;
  try {
    response = await fetch(url.toString(), { method, headers, body, credentials: 'same-origin' });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Revisa tu conexión.');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('El servidor respondió con un formato inesperado.');
  }
  if (!response.ok || !payload.ok) {
    if (response.status === 401 && resource !== 'auth') {
      state.user = null;
      state.csrf = '';
      renderLogin('Tu sesión terminó. Inicia sesión nuevamente.');
    }
    throw new Error(payload.error || 'No fue posible completar la operación.');
  }
  return payload.data;
}

function setLoading(loading) {
  state.loading = loading;
  document.querySelectorAll('[data-loading-label]').forEach((button) => {
    button.disabled = loading;
    if (loading) button.dataset.previousText = button.textContent;
    if (loading) button.textContent = button.dataset.loadingLabel || 'Guardando…';
    if (!loading && button.dataset.previousText) button.textContent = button.dataset.previousText;
  });
}

function showToast(message, type = 'success') {
  const region = toastRoot;
  if (!region) return;
  region.className = 'toast-region';
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span aria-hidden="true">${type === 'error' ? icon('close') : type === 'warning' ? icon('bell') : icon('check')}</span><span>${escapeHTML(message)}</span>`;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 4400);
}

function renderLoading() {
  app.innerHTML = '<div class="app-loading"><span class="loading-orb"></span><p>Preparando administración…</p></div>';
}

async function loadLoginBranding() {
  try {
    const payload = await api('public', '', { csrf: false });
    const settings = payload?.settings;
    if (settings && typeof settings === 'object') {
      state.data.settings = { ...state.data.settings, ...settings };
    }
  } catch {
    // The login remains usable even if the public storefront is unavailable.
  }
}

async function renderBrandedLogin(message = '') {
  await loadLoginBranding();
  renderLogin(message);
}

function renderLogin(message = '') {
  const storeName = displayName();
  const logoUrl = safeUrl(state.data.settings.logo_url);
  document.title = `Administración — ${storeName}`;
  document.body.classList.remove('has-modal', 'menu-open');
  app.innerHTML = `
    <main class="admin-login">
      <section class="admin-login__card" aria-labelledby="login-title">
        <div class="admin-login__brand" aria-label="${escapeHTML(storeName)}">
          <span class="brand-mark admin-login__brand-mark" aria-hidden="true">${logoUrl ? `<img src="${escapeHTML(logoUrl)}" alt="">` : icon('logo')}</span>
          <span class="admin-login__store-name">${escapeHTML(storeName)}</span>
        </div>
        <h1 class="admin-login__title" id="login-title">Administración</h1>
        <p class="admin-login__copy">Accede al centro de control de ${escapeHTML(storeName)}.</p>
        ${message ? `<p class="form-error" role="alert">${escapeHTML(message)}</p>` : ''}
        <form id="login-form" class="admin-form" novalidate>
          ${field('Correo electrónico', 'email', '', { type: 'email', required: true, placeholder: 'tu@tienda.com', attrs: 'autocomplete="username"' })}
          ${passwordField('Contraseña', 'password', { required: true, placeholder: '••••••••', attrs: 'autocomplete="current-password"' })}
          <button class="button button--large" type="submit" data-loading-label="Ingresando…">Entrar al panel</button>
        </form>
        <p class="form-hint text-center">Las cuentas se crean de forma segura durante la instalación. No se muestran credenciales de ejemplo.</p>
      </section>
    </main>`;
}

function navHTML() {
  return NAVIGATION.map((section) => `
    <div class="admin-nav__group">
      <p class="admin-nav__label">${escapeHTML(section.label)}</p>
      ${section.items.map((item) => `<a class="admin-nav__link${state.activeView === item.id ? ' is-active' : ''}" href="#${item.id}" data-nav="${item.id}"${state.activeView === item.id ? ' aria-current="page"' : ''}>${icon(item.icon)}<span>${escapeHTML(item.label)}</span></a>`).join('')}
    </div>`).join('');
}

function renderApp() {
  const user = state.user || {};
  const storeName = displayName();
  app.innerHTML = `
    <div class="admin-shell">
      <header class="admin-topbar">
        <div class="admin-topbar__left">
          <button class="icon-button admin-menu-toggle" type="button" data-action="toggle-sidebar" aria-label="Abrir menú">${icon('menu')}</button>
          <a class="admin-topbar__brand" href="./" target="_blank" rel="noopener" title="Abrir tienda">
            <span class="brand-mark" aria-hidden="true">${safeUrl(state.data.settings.logo_url) ? `<img src="${escapeHTML(safeUrl(state.data.settings.logo_url))}" alt="">` : icon('logo')}</span>
            <span>${escapeHTML(storeName)}</span>
          </a>
          <span class="admin-caption">Centro de administración</span>
        </div>
        <div class="admin-topbar__right">
          <a class="button button-secondary button-small" href="./" target="_blank" rel="noopener">${icon('eye')} Ver tienda</a>
          <span class="admin-avatar" aria-label="${escapeHTML(user.name || 'Administrador')}">${escapeHTML(firstLetter(user.name))}</span>
          <button class="icon-button" type="button" data-action="logout" aria-label="Cerrar sesión">${icon('logout')}</button>
        </div>
      </header>
      <div class="admin-layout">
        <aside class="admin-sidebar${state.sidebarOpen ? ' is-open' : ''}" id="admin-sidebar" aria-label="Navegación de administración">
          <a class="admin-sidebar__brand" href="./" target="_blank" rel="noopener" title="Abrir tienda">
          <span class="brand-mark" aria-hidden="true">${safeUrl(state.data.settings.logo_url) ? `<img src="${escapeHTML(safeUrl(state.data.settings.logo_url))}" alt="">` : icon('logo')}</span>
          <span>${escapeHTML(storeName)}</span>
          </a>
          <nav class="admin-nav">${navHTML()}</nav>
          <div class="admin-sidebar__bottom">
            <a class="admin-nav__link" href="./" target="_blank" rel="noopener">${icon('external')}<span>Ver tienda</span></a>
            <button class="admin-nav__link" type="button" data-action="logout">${icon('logout')}<span>Cerrar sesión</span></button>
            <small class="text-faint" style="padding:0 10px">Desarrollado por A.T.</small>
          </div>
        </aside>
        <main class="admin-main"><section class="admin-page" id="admin-page" tabindex="-1"></section></main>
      </div>
    </div>`;
  renderPage();
  if (state.activeView === 'orders') void loadOrders();
}

function renderPage() {
  const target = document.getElementById('admin-page');
  if (!target) return;
  target.innerHTML = {
    dashboard: renderDashboard,
    products: renderProducts,
    categories: renderCategories,
    orders: renderOrders,
    banners: renderBanners,
    campaigns: renderCampaigns,
    notices: renderNotices,
    trust: renderTrust,
    reviews: renderReviews,
    settings: renderSettings,
  }[state.activeView]?.() || renderDashboard();
}

function pageHeading(title, description, action = '') {
  return `<header class="admin-page__heading"><div><h1 class="admin-page__title">${escapeHTML(title)}</h1><p class="admin-page__description">${escapeHTML(description)}</p></div>${action}</header>`;
}

function emptyState(title, text, action = '') {
  return `<div class="empty-state"><h2>${escapeHTML(title)}</h2><p>${escapeHTML(text)}</p>${action}</div>`;
}

function pageAction(label, action, iconName = 'plus') {
  return `<button class="button" type="button" data-action="${escapeHTML(action)}">${icon(iconName)} ${escapeHTML(label)}</button>`;
}

function renderDashboard() {
  const { products, categories, campaigns, reviews, banners, notices } = state.data;
  const orders = Array.isArray(state.data.orders) ? state.data.orders : [];
  const activeProducts = products.filter((product) => product.status === 'active').length;
  const lowStock = products.filter((product) => Number(product.stock || 0) <= Number(product.low_stock_threshold || 0) && product.status !== 'archived').length;
  const pendingReviews = reviews.filter((review) => review.status === 'pending').length;
  const pendingOrders = orders.filter((order) => ['pending', 'whatsapp_pending'].includes(String(order.status || ''))).length;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length;
  const activity = recentActivity();
  const catalogCoverage = Math.min(100, Math.round((activeProducts / Math.max(products.length, 1)) * 100));
  return `
    ${pageHeading('Panel de control', 'Una vista clara de tu catálogo, experiencia y comunidad.', pageAction('Nuevo producto', 'new-product'))}
    <div class="admin-grid">
      ${statCard('Productos activos', formatNumber(activeProducts), `${formatNumber(products.length)} en total`, 'bag')}
      ${statCard('Inventario bajo', formatNumber(lowStock), lowStock ? 'Necesita atención' : 'Todo en orden', lowStock ? 'warning' : 'success')}
      ${statCard('Pedidos pendientes', formatNumber(pendingOrders), pendingOrders ? 'Requieren confirmación' : 'Bandeja al día', pendingOrders ? 'warning' : 'success')}
      ${statCard('Reseñas pendientes', formatNumber(pendingReviews), pendingReviews ? 'Esperando moderación' : 'Bandeja al día', pendingReviews ? 'warning' : 'success')}
      ${statCard('Campañas visibles', formatNumber(activeCampaigns), `${formatNumber(banners.filter((item) => item.status === 'active').length)} banners y ${formatNumber(notices.filter((item) => item.status === 'active').length)} avisos`, 'sparkles')}
    </div>
    <div class="admin-layout-grid">
      <section class="admin-panel">
        <header class="admin-panel__header"><div><h2 class="admin-panel__title">Salud del catálogo</h2><p class="admin-form-section__copy">Publicación y cobertura de la tienda.</p></div><span class="status status--active">${catalogCoverage}% publicado</span></header>
        <div class="admin-chart" aria-label="Indicador de salud del catálogo" style="display:grid;place-items:center;padding:28px">
          <div style="width:min(100%,520px);display:grid;gap:20px">
            ${progressRow('Productos activos', activeProducts, Math.max(products.length, 1), '#0071e3')}
            ${progressRow('Categorías visibles', categories.filter((item) => item.status === 'active').length, Math.max(categories.length, 1), '#5e5ce6')}
            ${progressRow('Banners activos', banners.filter((item) => item.status === 'active').length, Math.max(banners.length, 1), '#268342')}
            ${progressRow('Campañas activas', activeCampaigns, Math.max(campaigns.length, 1), '#a64b00')}
          </div>
        </div>
      </section>
      <section class="admin-panel">
        <header class="admin-panel__header"><h2 class="admin-panel__title">Actividad reciente</h2><button class="button button--ghost button--small" data-nav="reviews">Ver reseñas</button></header>
        <div class="activity-list">${activity.length ? activity.map(activityRow).join('') : '<p class="text-muted">Aún no hay cambios que mostrar.</p>'}</div>
      </section>
    </div>`;
}

function statCard(label, value, caption, kind) {
  const isStatus = kind === 'warning' || kind === 'success';
  const tone = kind === 'warning' ? 'admin-stat__trend--down' : '';
  return `<article class="admin-card admin-stat"><span class="admin-stat__label">${escapeHTML(label)}</span><strong class="admin-stat__value">${escapeHTML(value)}</strong><span class="admin-stat__trend ${tone}">${isStatus ? '' : icon(kind)}${escapeHTML(caption)}</span></article>`;
}

function progressRow(label, amount, total, color) {
  const ratio = Math.max(0, Math.min(100, Math.round((Number(amount) / Number(total || 1)) * 100)));
  return `<div><div style="display:flex;justify-content:space-between;gap:12px;font-size:.78rem;color:#53535a"><span>${escapeHTML(label)}</span><strong style="color:#1d1d1f">${formatNumber(amount)} / ${formatNumber(total)}</strong></div><div style="height:8px;margin-top:8px;border-radius:99px;background:rgba(29,29,31,.08);overflow:hidden"><span style="display:block;width:${ratio}%;height:100%;border-radius:99px;background:${escapeHTML(color)};transition:width 520ms cubic-bezier(.2,.8,.2,1)"></span></div></div>`;
}

function recentActivity() {
  if (state.data.activity?.length) {
    const iconByEntity = { product: 'bag', category: 'folder', banner: 'image', campaign: 'sparkles', notice: 'bell', trust_card: 'shield', review: 'star', user: 'shield', settings: 'settings', media: 'image', order: 'bag' };
    return state.data.activity.map((item) => ({
      date: item.created_at,
      label: item.summary || `${item.entity_type || 'Elemento'} actualizado`,
      icon: iconByEntity[item.entity_type] || 'grid',
    }));
  }
  const sources = [
    ...state.data.products.map((item) => ({ date: item.updated_at || item.created_at, label: `Producto “${item.name}” actualizado`, icon: 'bag' })),
    ...state.data.reviews.map((item) => ({ date: item.updated_at || item.created_at, label: `Reseña de ${item.author_name} ${item.status === 'pending' ? 'pendiente de moderación' : 'actualizada'}`, icon: 'star' })),
    ...state.data.banners.map((item) => ({ date: item.updated_at || item.created_at, label: `Banner “${item.title}” actualizado`, icon: 'image' })),
    ...state.data.campaigns.map((item) => ({ date: item.updated_at || item.created_at, label: `Campaña “${item.name}” actualizada`, icon: 'sparkles' })),
  ];
  return sources.filter((item) => item.date).sort((left, right) => new Date(right.date) - new Date(left.date)).slice(0, 5);
}

function activityRow(item) {
  return `<article class="activity-item"><span class="activity-item__icon" aria-hidden="true">${icon(item.icon)}</span><p class="activity-item__text"><strong>${escapeHTML(item.label)}</strong><span class="activity-item__time">${escapeHTML(formatDate(item.date))}</span></p></article>`;
}

function renderProducts() {
  const products = state.data.products;
  const filters = state.productList;
  const categoryOptions = [...state.data.categories]
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'es'))
    .map((category) => `<option value="${escapeHTML(category.id)}"${String(filters.categoryId) === String(category.id) ? ' selected' : ''}>${escapeHTML(category.name)}</option>`)
    .join('');
  return `
    ${pageHeading('Productos', 'Gestiona información, inventario, variantes, precios e imágenes.', pageAction('Nuevo producto', 'new-product'))}
    <div class="admin-toolbar"><div class="admin-toolbar__group"><label class="search-field">${icon('search')}<span class="sr-only">Buscar productos</span><input type="search" data-filter="products" value="${escapeHTML(filters.query)}" placeholder="Buscar por nombre, SKU o categoría"></label><label class="sr-only" for="product-category-filter">Filtrar por categoría</label><select class="select" id="product-category-filter" data-product-category-filter aria-label="Filtrar por categoría" style="min-height:42px;min-width:190px"><option value="">Todas las categorías</option>${categoryOptions}</select></div><span class="text-muted" id="products-result-count">${productResultsCount()}</span></div>
    ${products.length ? productResultsMarkup() : emptyState('Tu catálogo está listo para comenzar', 'Crea el primer producto y elige la categoría, imagen e inventario.', pageAction('Crear producto', 'new-product'))}`;
}

function filteredProducts() {
  const { query, categoryId } = state.productList;
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('es');
  return state.data.products.filter((product) => {
    if (categoryId && String(product.category_id || '') !== String(categoryId)) return false;
    if (!normalizedQuery) return true;
    const searchable = `${product.name || ''} ${product.sku || ''} ${product.category_name || ''} ${product.slug || ''}`.toLocaleLowerCase('es');
    return searchable.includes(normalizedQuery);
  });
}

function productResultsCount() {
  const total = state.data.products.length;
  const matches = filteredProducts().length;
  return matches === total ? `${formatNumber(total)} productos` : `${formatNumber(matches)} de ${formatNumber(total)} productos`;
}

function productResultsMarkup() {
  const products = filteredProducts();
  const pageSize = Math.max(1, Number(state.productList.pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(state.productList.page) || 1), totalPages);
  state.productList.page = currentPage;
  const start = (currentPage - 1) * pageSize;
  const visible = products.slice(start, start + pageSize);
  if (!products.length) {
    return `<div class="admin-table-wrap" id="products-results"><div class="empty-state"><h2>No encontramos productos</h2><p>Prueba otra búsqueda o selecciona otra categoría.</p></div></div>`;
  }
  const rangeStart = start + 1;
  const rangeEnd = Math.min(start + visible.length, products.length);
  const pager = totalPages > 1 ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 0 0"><span class="text-muted">Mostrando ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} de ${formatNumber(products.length)}</span><div style="display:flex;align-items:center;gap:8px"><button class="button button--secondary button--small" type="button" data-action="products-page" data-page="${currentPage - 1}"${currentPage === 1 ? ' disabled' : ''}>← Anterior</button><span class="text-muted" aria-label="Página actual">${currentPage} / ${totalPages}</span><button class="button button--secondary button--small" type="button" data-action="products-page" data-page="${currentPage + 1}"${currentPage === totalPages ? ' disabled' : ''}>Siguiente →</button></div></div>` : `<p class="text-muted" style="margin:16px 0 0">Mostrando ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} de ${formatNumber(products.length)}</p>`;
  return `<div class="admin-table-wrap" id="products-results"><table class="admin-table"><thead><tr><th>Producto</th><th>Estado</th><th>Precio</th><th>Stock</th><th>Orden</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody id="products-table">${visible.map(productRow).join('')}</tbody></table>${pager}</div>`;
}

function productRow(product) {
  const currentPrice = product.sale_price !== null && product.sale_price !== '' ? product.sale_price : product.regular_price;
  return `<tr><td><div class="admin-table__product">${productThumb(product.image_url, product.name)}<span><span>${escapeHTML(product.name)}</span><small class="text-faint" style="display:block;margin-top:2px">${escapeHTML(product.sku)} · ${escapeHTML(product.category_name || 'Sin categoría')}</small></span></div></td><td>${statusPill(product.status)}</td><td><strong style="color:#1d1d1f">${money(currentPrice)}</strong>${product.sale_price ? `<small class="text-faint" style="display:block;text-decoration:line-through">${money(product.regular_price)}</small>` : ''}</td><td>${escapeHTML(formatNumber(product.stock))}</td><td>${escapeHTML(formatNumber(product.sort_order))}</td><td><div class="admin-table__actions">${rowAction('Editar', 'edit-product', product.id, 'edit')}${rowAction('Eliminar permanentemente', 'delete-products', product.id, 'trash', true)}</div></td></tr>`;
}

function rowAction(label, action, id, iconName, danger = false) {
  // Edit gets a labelled pill; destructive and secondary actions stay compact
  // icon buttons with a tooltip, so every row reads the same way.
  if (iconName === 'edit') {
    return `<button class="row-btn row-btn--edit" type="button" data-action="${escapeHTML(action)}" data-id="${escapeHTML(id)}" title="${escapeHTML(label)}">${icon('edit')}<span>Editar</span></button>`;
  }
  return `<button class="row-btn row-btn--icon${danger ? ' row-btn--danger' : ''}" type="button" data-action="${escapeHTML(action)}" data-id="${escapeHTML(id)}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${icon(iconName)}</button>`;
}

function renderCategories() {
  const categories = state.data.categories;
  return `
    ${pageHeading('Categorías', 'Crea la arquitectura del catálogo y controla cómo se muestra al público.', pageAction('Nueva categoría', 'new-category'))}
    ${categories.length ? `<div class="admin-table-wrap admin-table-wrap--categories"><table class="admin-table admin-table--categories"><thead><tr><th>Categoría</th><th>Productos</th><th>Estado</th><th>Orden</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${categories.map(categoryRow).join('')}</tbody></table></div>` : emptyState('Aún no hay categorías', 'Crea categorías antes de publicar productos.', pageAction('Crear categoría', 'new-category'))}`;
}

function categoryRow(category) {
  return `<tr><td><div class="admin-table__product">${productThumb(category.image_url, category.name)}<span><span>${escapeHTML(category.name)}</span><small class="text-faint" style="display:block;margin-top:2px">/${escapeHTML(category.slug)}</small></span></div></td><td>${escapeHTML(formatNumber(category.product_count))}</td><td>${statusPill(category.status)}</td><td>${escapeHTML(formatNumber(category.sort_order))}</td><td><div class="admin-table__actions">${rowAction('Editar', 'edit-category', category.id, 'edit')}${rowAction('Eliminar', 'delete-categories', category.id, 'trash', true)}</div></td></tr>`;
}

function formatDateTime(value) {
  if (!value) return '—';
  // The database stores UTC timestamps without a zone ("2026-10-08 13:29:00").
  const raw = String(value).replace(' ', 'T');
  const date = new Date(/T\d{2}:\d{2}(:\d{2})?$/.test(raw) ? `${raw}Z` : raw);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function orderItemsFor(order) {
  let items = order?.items ?? order?.order_items ?? order?.lines ?? [];
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && typeof item === 'object');
}

function orderShippingFor(order) {
  const explicitKey = ['shipping', 'shipping_total', 'shipping_amount', 'shipping_fee'].find((key) => order?.[key] !== undefined && order?.[key] !== null && order?.[key] !== '');
  if (explicitKey) return Math.max(0, Number(order[explicitKey]) || 0);
  const subtotal = Number(order?.subtotal || 0);
  const discount = Number(order?.discount_total || 0);
  const total = Number(order?.total || 0);
  return Math.max(0, total - Math.max(0, subtotal - discount));
}

function orderReference(order) {
  return String(order?.reference_code || order?.reference || `#${order?.id || '—'}`);
}

function orderItemLabel(item) {
  const product = item.product_name || item.name || 'Producto';
  const variant = item.variant_label ? ` · ${item.variant_label}` : '';
  const quantity = Math.max(1, Number(item.quantity || 1));
  return `${quantity}× ${product}${variant}`;
}

function orderItemsMarkup(order, limit = 2) {
  const items = orderItemsFor(order);
  if (!items.length) return '<span class="text-faint">Los productos de este pedido no están disponibles.</span>';
  const visible = items.slice(0, limit);
  const remainder = items.length - visible.length;
  return `${visible.map((item) => `<span>${escapeHTML(orderItemLabel(item))}</span>`).join('')}${remainder > 0 ? `<span class="text-faint">+${escapeHTML(formatNumber(remainder))} producto${remainder === 1 ? '' : 's'}</span>` : ''}`;
}

// ---------------------------------------------------------------------------
// Orders & shipment tracking
//
// One pipeline (mirrors app/repository.php):
//   pending → preparing → shipped → out_for_delivery → delivered
//   + issue (novedad) and cancelled.
// The store guide (CS-…) never changes; the courier guide is a separate field.
// ---------------------------------------------------------------------------

const SHIPMENT_STATUSES = [
  { value: 'pending', label: 'Pedido recibido', tone: 'status--draft' },
  { value: 'preparing', label: 'En preparación', tone: 'status--warning' },
  { value: 'shipped', label: 'Enviado', tone: 'status--info' },
  { value: 'out_for_delivery', label: 'En reparto', tone: 'status--info' },
  { value: 'delivered', label: 'Entregado', tone: 'status--active' },
  { value: 'issue', label: 'Novedad', tone: 'status--danger' },
  { value: 'cancelled', label: 'Cancelado', tone: 'status--inactive' },
];
const SHIPMENT_FLOW = ['pending', 'preparing', 'shipped', 'out_for_delivery', 'delivered'];
const SHIPMENT_NEXT = {
  pending: ['preparing', 'shipped', 'cancelled'],
  preparing: ['pending', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
  shipped: ['preparing', 'out_for_delivery', 'delivered', 'issue', 'cancelled'],
  out_for_delivery: ['shipped', 'delivered', 'issue', 'cancelled'],
  issue: ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
const CARRIER_SUGGESTIONS = ['Servientrega', 'Laar Courier', 'Tramaco Express', 'Urbano Express', 'Entrega propia (motorizado)', 'Retiro en tienda'];
const ORDER_FILTERS = [
  { id: 'all', label: 'Todos', match: () => true },
  { id: 'pending', label: 'Por confirmar', match: (status) => status === 'pending' },
  { id: 'preparing', label: 'En preparación', match: (status) => status === 'preparing' },
  { id: 'transit', label: 'En camino', match: (status) => status === 'shipped' || status === 'out_for_delivery' },
  { id: 'issue', label: 'Novedades', match: (status) => status === 'issue' },
  { id: 'delivered', label: 'Entregados', match: (status) => status === 'delivered' },
  { id: 'cancelled', label: 'Cancelados', match: (status) => status === 'cancelled' },
];

function shipmentStatusFor(order) {
  const raw = String(order?.shipment_status || '').trim().toLowerCase();
  if (SHIPMENT_STATUSES.some((item) => item.value === raw)) return raw;
  const orderStatus = String(order?.status || '').trim().toLowerCase();
  if (orderStatus === 'cancelled') return 'cancelled';
  if (orderStatus === 'completed') return 'delivered';
  if (orderStatus === 'processing') return 'shipped';
  if (orderStatus === 'confirmed') return 'preparing';
  return 'pending';
}

function orderCanBeConfirmed(order) {
  return shipmentStatusFor(order) === 'pending';
}

function orderCanBeCancelled(order) {
  return (SHIPMENT_NEXT[shipmentStatusFor(order)] || []).includes('cancelled');
}

function shipmentStatusLabel(status) {
  return SHIPMENT_STATUSES.find((item) => item.value === status)?.label || 'Pedido recibido';
}

function shipmentStatusPill(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : shipmentStatusFor(orderOrStatus);
  const tone = SHIPMENT_STATUSES.find((item) => item.value === status)?.tone || 'status--draft';
  return `<span class="status shipment-status ${tone}">${escapeHTML(shipmentStatusLabel(status))}</span>`;
}

function orderTrackingNumber(order) {
  return String(order?.tracking_number || order?.tracking_code || '').trim();
}

function orderCarrierGuide(order) {
  return String(order?.carrier_tracking_number || '').trim();
}

function orderShippingCarrier(order) {
  return String(order?.shipping_carrier || '').trim();
}

function orderTrackingHistory(order) {
  const history = Array.isArray(order?.tracking_history) ? order.tracking_history : [];
  return history.filter((event) => event && typeof event === 'object').map((event) => ({
    status: shipmentStatusFor({ shipment_status: event.status }),
    note: String(event.detail || event.note || '').trim(),
    location: String(event.location || '').trim(),
    occurred_at: event.occurred_at || event.created_at || '',
  }));
}

function publicTrackingUrl(order) {
  const guide = orderTrackingNumber(order);
  // The panel lives at /admin or /admin.php; the tracker sits next to it.
  const base = window.location.href.replace(/admin(?:\.php)?\/?(?:[?#].*)?$/i, '');
  const url = new URL('seguimiento', base);
  if (guide) url.searchParams.set('guia', guide);
  return url.href;
}

/** Ecuadorian mobile numbers are stored as typed (0991234567); wa.me needs 593991234567. */
function customerWhatsappNumber(order) {
  let digits = String(order?.customer_phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^0\d{9}$/.test(digits)) return `593${digits.slice(1)}`;
  if (/^5930\d{9}$/.test(digits)) return `593${digits.slice(4)}`;
  if (/^9\d{8}$/.test(digits)) return `593${digits}`;
  return digits.length >= 10 ? digits : '';
}

function customerNotificationText(order) {
  const status = shipmentStatusFor(order);
  const name = String(order.customer_name || '').trim().split(/\s+/)[0] || '';
  const carrier = orderShippingCarrier(order);
  const carrierGuide = orderCarrierGuide(order);
  const lines = [`Hola${name ? ` ${name}` : ''}, te escribimos de ${displayName()}.`, ''];
  const intro = {
    pending: `Recibimos tu pedido ${orderReference(order)}. En breve lo confirmamos contigo.`,
    preparing: `¡Tu pedido ${orderReference(order)} fue confirmado! Ya lo estamos preparando.`,
    shipped: `¡Tu pedido ${orderReference(order)} ya fue enviado! 🚚`,
    out_for_delivery: `Tu pedido ${orderReference(order)} salió a reparto y llega hoy a tu dirección. 📦`,
    delivered: `Tu pedido ${orderReference(order)} fue entregado. ¡Gracias por comprar con nosotros! 🙌`,
    issue: `Tuvimos una novedad con la entrega de tu pedido ${orderReference(order)}.`,
    cancelled: `Tu pedido ${orderReference(order)} fue cancelado.`,
  }[status];
  lines.push(intro);
  if (status === 'issue') {
    const latest = orderTrackingHistory(order).find((event) => event.status === 'issue');
    if (latest?.note) lines.push(`Detalle: ${latest.note}`);
    lines.push('¿Nos confirmas cuándo podemos volver a intentarlo?');
  }
  if (['shipped', 'out_for_delivery', 'issue'].includes(status) && carrier) lines.push(`Transportadora: ${carrier}${carrierGuide ? ` · Guía ${carrierGuide}` : ''}`);
  if (order.estimated_delivery && !['delivered', 'cancelled'].includes(status)) lines.push(`Entrega estimada: ${formatDate(order.estimated_delivery)}`);
  if (status !== 'cancelled') {
    lines.push('', `Sigue tu pedido aquí (guía ${orderTrackingNumber(order)}):`, publicTrackingUrl(order));
  }
  return lines.join('\n');
}

function customerWhatsappHref(order) {
  const number = customerWhatsappNumber(order);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(customerNotificationText(order))}` : '';
}

function shipmentStepper(order) {
  const status = shipmentStatusFor(order);
  let reached = status;
  if (status === 'issue' || status === 'cancelled') {
    reached = orderTrackingHistory(order).map((event) => event.status).find((value) => SHIPMENT_FLOW.includes(value)) || 'pending';
  }
  const index = Math.max(0, SHIPMENT_FLOW.indexOf(reached));
  const modifier = status === 'issue' ? ' is-issue' : status === 'cancelled' ? ' is-cancelled' : '';
  return `<ol class="ship-stepper${modifier}" aria-label="Progreso: ${escapeHTML(shipmentStatusLabel(status))}">${SHIPMENT_FLOW.map((step, stepIndex) => `<li class="${stepIndex < index ? 'is-done' : stepIndex === index ? 'is-current' : ''}"><span class="ship-stepper__dot"></span><span class="ship-stepper__label">${escapeHTML(shipmentStatusLabel(step))}</span></li>`).join('')}</ol>`;
}

function shipmentTimeline(order) {
  const history = orderTrackingHistory(order);
  const events = history.length ? history : [{ status: shipmentStatusFor(order), note: '', location: '', occurred_at: order.updated_at || order.created_at }];
  return `<ol class="shipment-timeline">${events.map((event) => `<li class="shipment-timeline__item is-${escapeHTML(event.status)}"><span class="shipment-timeline__dot" aria-hidden="true"></span><div><strong>${escapeHTML(shipmentStatusLabel(event.status))}</strong>${event.note ? `<p>${escapeHTML(event.note)}</p>` : ''}<small>${escapeHTML(formatDateTime(event.occurred_at))}${event.location ? ` · ${escapeHTML(event.location)}` : ''}</small></div></li>`).join('')}</ol>`;
}

/** The single "next step" offered on each order card. */
function nextShipmentAction(order) {
  return {
    pending: { status: 'preparing', label: 'Confirmar pedido' },
    preparing: { status: 'shipped', label: 'Marcar como enviado' },
    shipped: { status: 'out_for_delivery', label: 'En reparto' },
    out_for_delivery: { status: 'delivered', label: 'Marcar entregado' },
    issue: { status: 'out_for_delivery', label: 'Reintentar entrega' },
  }[shipmentStatusFor(order)] || null;
}

function orderSearchText(order) {
  return [orderReference(order), order.customer_name, order.customer_phone, order.shipping_city, orderTrackingNumber(order), orderCarrierGuide(order), orderShippingCarrier(order)]
    .join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function filteredOrders() {
  const orders = [...(state.data.orders || [])].sort((left, right) => new Date(String(right.created_at || 0).replace(' ', 'T')) - new Date(String(left.created_at || 0).replace(' ', 'T')));
  const filter = ORDER_FILTERS.find((item) => item.id === state.orderList.filter) || ORDER_FILTERS[0];
  const query = String(state.orderList.query || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return orders.filter((order) => filter.match(shipmentStatusFor(order)) && (!query || orderSearchText(order).includes(query)));
}

function ordersListMarkup() {
  const all = state.data.orders || [];
  if (state.orderList.loading && !all.length) return '<p class="text-muted">Cargando pedidos…</p>';
  if (!all.length) return emptyState('Aún no hay pedidos', 'Cuando una persona finalice un pedido por WhatsApp, aparecerá aquí con su guía de seguimiento.');
  const orders = filteredOrders();
  if (!orders.length) return `<div class="orders-empty-filter"><p>No hay pedidos con este filtro${state.orderList.query ? ` que coincidan con «${escapeHTML(state.orderList.query)}»` : ''}.</p><button class="button button--secondary button--small" type="button" data-action="order-filter" data-filter="all">Ver todos</button></div>`;
  return `<section class="orders-list" aria-label="Listado de pedidos">${orders.map(orderCard).join('')}</section>`;
}

function renderOrders() {
  const orders = state.data.orders || [];
  const count = (id) => orders.filter((order) => ORDER_FILTERS.find((item) => item.id === id).match(shipmentStatusFor(order))).length;
  const active = orders.filter((order) => !['cancelled'].includes(shipmentStatusFor(order)));
  const total = active.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const pending = count('pending');
  const issues = count('issue');
  const tabs = ORDER_FILTERS.map((item) => {
    const amount = count(item.id);
    const isActive = (state.orderList.filter || 'all') === item.id;
    return `<button type="button" class="order-tab${isActive ? ' is-active' : ''}${item.id === 'issue' && amount ? ' has-alert' : ''}" data-action="order-filter" data-filter="${item.id}" aria-pressed="${isActive}">${escapeHTML(item.label)}<span>${formatNumber(amount)}</span></button>`;
  }).join('');
  return `
    ${pageHeading('Pedidos', 'Confirma, despacha y avisa a tus clientes. Cada cambio se refleja al instante en su página de seguimiento.')}
    <div class="admin-grid orders-summary">
      ${statCard('Por confirmar', formatNumber(pending), pending ? 'Escríbeles y confirma' : 'Bandeja al día', pending ? 'warning' : 'success')}
      ${statCard('En camino', formatNumber(count('transit')), count('transit') ? 'Enviados o en reparto' : 'Sin envíos en ruta', 'truck')}
      ${statCard('Novedades', formatNumber(issues), issues ? 'Requieren atención' : 'Sin incidencias', issues ? 'warning' : 'success')}
      ${statCard('Ventas activas', money(total), `${formatNumber(active.length)} pedido${active.length === 1 ? '' : 's'} no cancelado${active.length === 1 ? '' : 's'}`, 'bag')}
    </div>
    <div class="orders-toolbar">
      <div class="order-tabs" role="toolbar" aria-label="Filtrar pedidos por estado">${tabs}</div>
      <label class="orders-search"><span class="sr-only">Buscar pedidos</span><input class="input" type="search" data-filter="orders" value="${escapeHTML(state.orderList.query || '')}" placeholder="Buscar por cliente, teléfono, ciudad o guía"></label>
    </div>
    <div id="orders-list-holder">${ordersListMarkup()}</div>`;
}

function copyButton(value, label = 'Copiar') {
  return value ? `<button class="order-copy" type="button" data-action="copy-text" data-copy="${escapeHTML(value)}" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)} ${escapeHTML(value)}">${icon('copy')}</button>` : '';
}

function orderCard(order) {
  const reference = orderReference(order);
  const phone = order.customer_phone || '';
  const shipping = orderShippingFor(order);
  const status = shipmentStatusFor(order);
  const nextAction = nextShipmentAction(order);
  const carrier = orderShippingCarrier(order);
  const carrierGuide = orderCarrierGuide(order);
  const destination = [order.shipping_city, order.shipping_address].filter(Boolean).join(' · ');
  const whatsappHref = customerWhatsappHref(order);
  return `<article class="order-card is-${escapeHTML(status)}" data-order-id="${escapeHTML(order.id)}">
    <header class="order-card__header">
      <div>
        <strong class="order-card__reference">${escapeHTML(reference)}</strong>
        <span class="order-card__date">${escapeHTML(formatDateTime(order.created_at))}</span>
      </div>
      ${shipmentStatusPill(status)}
    </header>
    <div class="order-card__body">
      ${shipmentStepper(order)}
      <div class="order-card__customer"><strong>${escapeHTML(order.customer_name || 'Cliente sin nombre')}</strong>${phone ? `<a href="tel:${escapeHTML(String(phone).replace(/[^+0-9]/g, ''))}">${escapeHTML(phone)}</a>` : '<span class="text-faint">Sin teléfono</span>'}</div>
      ${destination ? `<p class="order-card__destination">${icon('pin')}<span>${escapeHTML(destination)}</span></p>` : ''}
      <div class="order-card__items">${orderItemsMarkup(order)}</div>
      <div class="order-card__totals"><span>Subtotal <strong>${money(order.subtotal)}</strong></span><span>Envío <strong>${money(shipping)}</strong></span><span>Total <strong>${money(order.total)}</strong></span></div>
      <dl class="order-guides">
        <div><dt>Guía de la tienda</dt><dd><span>${escapeHTML(orderTrackingNumber(order) || '—')}</span>${copyButton(orderTrackingNumber(order), 'Copiar guía')}</dd></div>
        <div><dt>${escapeHTML(carrier || 'Transportadora')}</dt><dd>${carrierGuide ? `<span>${escapeHTML(carrierGuide)}</span>${copyButton(carrierGuide, 'Copiar guía de la transportadora')}` : `<span class="text-faint">${carrier ? 'Sin guía' : 'Sin asignar'}</span>`}</dd></div>
      </dl>
      ${order.customer_note ? `<p class="order-card__note"><strong>Nota:</strong> ${escapeHTML(order.customer_note)}</p>` : ''}
    </div>
    <footer class="order-card__actions">
      ${nextAction ? `<button class="button button--small order-card__advance" type="button" data-action="advance-shipment" data-id="${escapeHTML(order.id)}" data-shipment-status="${escapeHTML(nextAction.status)}">${escapeHTML(nextAction.label)}</button>` : ''}
      ${whatsappHref ? `<a class="button button--secondary button--small order-card__whatsapp" href="${escapeHTML(whatsappHref)}" target="_blank" rel="noopener">${icon('chat')} Avisar</a>` : ''}
      <button class="button button--secondary button--small" type="button" data-action="manage-shipment" data-id="${escapeHTML(order.id)}">${icon('truck')} Gestionar</button>
      <span class="order-card__spacer"></span>
      ${rowAction('Ver detalle', 'view-order', order.id, 'eye')}
      ${rowAction('Eliminar pedido', 'delete-orders', order.id, 'trash', true)}
    </footer>
  </article>`;
}

function orderShipmentDetails(order) {
  const carrier = orderShippingCarrier(order);
  return `<section class="admin-form-section shipment-detail-section"><header class="admin-form-section__header shipment-detail-section__header"><div><h3 class="admin-form-section__title">Seguimiento de envío</h3><p class="admin-form-section__copy">El cliente consulta este estado con su guía en <a href="${escapeHTML(publicTrackingUrl(order))}" target="_blank" rel="noopener">la página de seguimiento</a>.</p></div><button class="button button--secondary button--small" type="button" data-action="manage-shipment" data-id="${escapeHTML(order.id)}">${icon('truck')} Gestionar</button></header>${shipmentStepper(order)}<div class="shipment-detail-grid"><div><span class="shipment-detail-grid__label">Estado</span>${shipmentStatusPill(order)}</div><div><span class="shipment-detail-grid__label">Transportadora</span><strong>${escapeHTML(carrier || 'Sin asignar')}</strong></div><div><span class="shipment-detail-grid__label">Guía de la tienda</span><strong class="shipment-guide-value">${escapeHTML(orderTrackingNumber(order) || '—')}</strong></div><div><span class="shipment-detail-grid__label">Guía transportadora</span><strong class="shipment-guide-value">${escapeHTML(orderCarrierGuide(order) || '—')}</strong></div>${order.estimated_delivery ? `<div><span class="shipment-detail-grid__label">Entrega estimada</span><strong>${escapeHTML(formatDate(order.estimated_delivery))}</strong></div>` : ''}</div><div class="shipment-history"><h4>Historial que ve el cliente</h4>${shipmentTimeline(order)}</div></section>`;
}

function openOrderDetails(id) {
  const order = recordFor('orders', id);
  if (!order) {
    showToast('No encontramos ese pedido.', 'error');
    return;
  }
  const items = orderItemsFor(order);
  const reference = orderReference(order);
  const shipping = orderShippingFor(order);
  const contact = [order.customer_name, order.customer_phone].filter(Boolean).join(' · ') || 'Sin datos de contacto';
  const itemRows = items.length
    ? `<div style="display:grid;gap:8px">${items.map((item) => `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid rgba(29,29,31,.09)"><span>${escapeHTML(orderItemLabel(item))}</span><strong>${money(item.line_total ?? ((Number(item.unit_price || 0) * Number(item.quantity || 1))))}</strong></div>`).join('')}</div>`
    : '<p class="text-muted">No hay productos disponibles para este pedido.</p>';
  const nextAction = nextShipmentAction(order);
  const whatsappHref = customerWhatsappHref(order);
  const actions = `<div class="form-actions" style="margin-top:22px"><button class="button button--secondary" type="button" data-action="close-modal">Cerrar</button>${orderCanBeCancelled(order) ? `<button class="button button--secondary" type="button" data-action="cancel-order" data-id="${escapeHTML(order.id)}">Cancelar pedido</button>` : ''}${whatsappHref ? `<a class="button button--secondary" href="${escapeHTML(whatsappHref)}" target="_blank" rel="noopener">${icon('chat')} Avisar por WhatsApp</a>` : ''}${nextAction ? `<button class="button" type="button" data-action="advance-shipment" data-id="${escapeHTML(order.id)}" data-shipment-status="${escapeHTML(nextAction.status)}">${escapeHTML(nextAction.label)}</button>` : ''}</div>`;
  const address = [order.shipping_address, order.shipping_city].filter(Boolean).join(', ');
  openModal(`Pedido ${reference}`, `<section class="admin-form-section"><header class="admin-form-section__header"><h3 class="admin-form-section__title">Cliente y entrega</h3><p class="admin-form-section__copy">${escapeHTML(contact)}</p></header><div class="form-grid"><div class="field"><label>Dirección de entrega</label><div style="padding-top:8px;color:#1d1d1f;font-weight:650">${escapeHTML(address || 'No indicada')}</div></div><div class="field"><label>Fecha del pedido</label><div style="padding-top:8px;color:#1d1d1f;font-weight:650">${escapeHTML(formatDateTime(order.created_at))}</div></div><div class="field field--full"><label>Nota del cliente</label><div style="padding:12px 14px;border:1px solid rgba(29,29,31,.12);border-radius:12px;background:#fafafd;color:#515156;white-space:pre-wrap">${escapeHTML(order.customer_note || 'No dejó una nota.')}</div></div></div></section><section class="admin-form-section"><header class="admin-form-section__header"><h3 class="admin-form-section__title">Productos</h3><p class="admin-form-section__copy">${Number(order.stock_applied) === 1 ? 'El stock de estos productos ya fue descontado.' : Number(order.stock_applied) === 2 ? 'Pedido anterior al control de stock: no mueve inventario.' : 'El stock se descontará al confirmar el pedido.'}</p></header>${itemRows}</section>${orderShipmentDetails(order)}<section class="admin-form-section"><div class="form-grid"><div class="field"><label>Subtotal</label><strong style="font-size:1.08rem;color:#1d1d1f">${money(order.subtotal)}</strong></div><div class="field"><label>Envío</label><strong style="font-size:1.08rem;color:#1d1d1f">${money(shipping)}</strong></div><div class="field field--full"><label>Total</label><strong style="font-size:1.35rem;color:#1d1d1f">${money(order.total)}</strong></div></div></section>${actions}`);
}

function openShipmentEditor(id, preferredStatus = '') {
  const order = recordFor('orders', id);
  if (!order) {
    showToast('No encontramos ese pedido.', 'error');
    return;
  }
  const current = shipmentStatusFor(order);
  const allowed = [current, ...(SHIPMENT_NEXT[current] || [])];
  const status = allowed.includes(preferredStatus) ? preferredStatus : current;
  const choices = allowed.map((value) => ({ value, label: value === current ? `${shipmentStatusLabel(value)} (actual)` : shipmentStatusLabel(value) }));
  const reference = orderReference(order);
  const finalNotice = (SHIPMENT_NEXT[current] || []).length ? '' : `<p class="shipment-final-notice">${icon('check')} Este pedido está «${escapeHTML(shipmentStatusLabel(current))}». Su estado es definitivo; solo puedes agregar una nota al historial.</p>`;
  const datalist = `<datalist id="carrier-options">${CARRIER_SUGGESTIONS.map((carrier) => `<option value="${escapeHTML(carrier)}"></option>`).join('')}</datalist>`;
  const form = `<form class="admin-form shipment-editor" id="shipment-form" data-order-id="${escapeHTML(order.id)}" data-current-status="${escapeHTML(current)}" novalidate>
    ${finalNotice}
    <section class="admin-form-section">
      <header class="admin-form-section__header"><h3 class="admin-form-section__title">Estado del pedido</h3><p class="admin-form-section__copy">Guía del cliente: <strong>${escapeHTML(orderTrackingNumber(order))}</strong> · <a href="${escapeHTML(publicTrackingUrl(order))}" target="_blank" rel="noopener">ver lo que ve el cliente</a></p></header>
      ${shipmentStepper(order)}
      <div class="form-grid">
        ${field('Nuevo estado', 'status', status, { type: 'select', full: true, choices, attrs: 'data-shipment-status-select' })}
      </div>
    </section>
    <section class="admin-form-section" data-shipment-carrier-section>
      <header class="admin-form-section__header"><h3 class="admin-form-section__title">Transportadora</h3><p class="admin-form-section__copy">Obligatoria para marcar como enviado. Si el courier te da una guía, regístrala: el cliente también podrá rastrear con ella.</p></header>
      <div class="form-grid">
        ${field('Transportadora o método', 'carrier_name', orderShippingCarrier(order), { placeholder: 'Ej. Servientrega', attrs: 'list="carrier-options" autocomplete="off" maxlength="100"' })}
        ${field('Guía de la transportadora', 'carrier_tracking_number', orderCarrierGuide(order), { placeholder: 'Ej. 1234567890', attrs: 'autocomplete="off" maxlength="60"' })}
        ${field('Entrega estimada', 'estimated_delivery', order.estimated_delivery || '', { type: 'date' })}
        ${field('Ubicación (opcional)', 'event_location', '', { placeholder: 'Ej. Centro de distribución Quito', attrs: 'maxlength="180"' })}
      </div>
      ${datalist}
    </section>
    <section class="admin-form-section">
      <div class="form-grid">
        ${field('Mensaje para el cliente', 'event_note', '', { type: 'textarea', full: true, placeholder: 'Opcional. Si lo dejas vacío usamos un mensaje estándar para el estado elegido.', hint: 'Aparece en el historial de su página de seguimiento. Obligatorio si registras una novedad.', attrs: 'maxlength="500" data-shipment-note' })}
      </div>
    </section>
    <section class="admin-form-section shipment-history-section"><header class="admin-form-section__header"><h3 class="admin-form-section__title">Historial que ve el cliente</h3></header>${shipmentTimeline(order)}</section>
    <div class="form-actions"><button class="button button--secondary" type="button" data-action="close-modal">Cerrar</button><button class="button" type="submit" data-loading-label="Guardando…">Guardar y continuar</button></div>
  </form>`;
  openModal(`Seguimiento · ${reference}`, form);
  updateShipmentEditorHints();
}

/** Highlights the fields each status needs, so the admin is guided before saving. */
function updateShipmentEditorHints() {
  const form = modalRoot.querySelector('#shipment-form');
  if (!form) return;
  const status = form.querySelector('[data-shipment-status-select]')?.value || '';
  const carrierInput = form.querySelector('[name="carrier_name"]');
  const note = form.querySelector('[data-shipment-note]');
  if (carrierInput) carrierInput.required = ['shipped', 'out_for_delivery'].includes(status);
  if (note) {
    note.required = status === 'issue' && status !== form.dataset.currentStatus;
    note.placeholder = status === 'issue' ? 'Describe la novedad. Ej.: No había nadie en la dirección; reintentaremos mañana.' : 'Opcional. Si lo dejas vacío usamos un mensaje estándar para el estado elegido.';
  }
  form.querySelector('[data-shipment-carrier-section]')?.classList.toggle('is-required', ['shipped', 'out_for_delivery'].includes(status));
}

/** After every status change, offer to tell the customer on WhatsApp. */
function offerCustomerNotification(order, message) {
  const href = order ? customerWhatsappHref(order) : '';
  if (!href) {
    showToast(message);
    return;
  }
  // A real link (not window.open) so popup blockers never swallow the message.
  openModal(message, `<section class="confirm-dialog"><p class="confirm-dialog__message">¿Quieres avisar a ${escapeHTML(order.customer_name || 'tu cliente')} por WhatsApp?</p><p class="confirm-dialog__detail">Se abrirá WhatsApp con un mensaje listo que incluye el estado y el enlace de seguimiento. Solo tienes que enviarlo.</p><div class="form-actions"><button class="button button--secondary" type="button" data-action="close-modal">Ahora no</button><a class="button" href="${escapeHTML(href)}" target="_blank" rel="noopener" data-action="close-modal">${icon('chat')} Avisar por WhatsApp</a></div></section>`);
}

async function saveShipment(id, data, successMessage) {
  const updated = await api('orders', 'shipment', { method: 'POST', data: { id, data } });
  await refreshAdmin();
  const order = recordFor('orders', id) || updated;
  offerCustomerNotification(order, successMessage);
}

/** One-click advance from the card. "Enviado" needs carrier data, so it opens the editor. */
function advanceShipment(id, nextStatus) {
  const order = recordFor('orders', id);
  if (!order) {
    showToast('No encontramos ese pedido.', 'error');
    return;
  }
  if (nextStatus === 'shipped' || (nextStatus === 'out_for_delivery' && !orderShippingCarrier(order))) {
    openShipmentEditor(id, nextStatus);
    return;
  }
  const copy = {
    preparing: ['¿Confirmar pedido?', `Confirmarás ${orderReference(order)} y se descontará el stock de sus productos.`, 'Asegúrate de haber acordado el pago y la entrega con el cliente.'],
    out_for_delivery: ['¿Marcar en reparto?', `${orderReference(order)} quedará como «En reparto».`, 'Úsalo cuando el pedido salió hacia la dirección del cliente.'],
    delivered: ['¿Marcar como entregado?', `${orderReference(order)} quedará como «Entregado».`, 'Este estado es definitivo y ya no se podrá cancelar.'],
  }[nextStatus] || ['¿Actualizar pedido?', `${orderReference(order)} pasará a «${shipmentStatusLabel(nextStatus)}».`, ''];
  requestConfirmation({
    title: copy[0],
    message: copy[1],
    detail: copy[2],
    confirmLabel: shipmentStatusLabel(nextStatus) === 'En preparación' ? 'Confirmar pedido' : 'Actualizar',
    onConfirm: async () => {
      setLoading(true);
      try {
        await saveShipment(id, { status: nextStatus }, `Pedido ${orderReference(order)}: ${shipmentStatusLabel(nextStatus)}`);
      } catch (error) {
        showToast(error?.message || 'No fue posible actualizar el pedido.', 'error');
      } finally {
        setLoading(false);
      }
    },
  });
}

function applyOrderFilter(filter) {
  state.orderList.filter = ORDER_FILTERS.some((item) => item.id === filter) ? filter : 'all';
  if (state.activeView === 'orders') renderPage();
}

function applyOrderSearch(input) {
  state.orderList.query = input.value;
  const holder = document.querySelector('#orders-list-holder');
  if (holder) holder.innerHTML = ordersListMarkup();
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast('Copiado al portapapeles.');
  } catch {
    window.prompt('Copia este valor:', value);
  }
}

function renderBanners() {
  const banners = [...state.data.banners].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
  const content = banners.length
    ? `<section class="admin-editorial-panel">
        <p class="admin-editorial-callout">Los banners activos se muestran en la portada por orden. Los programados respetan sus fechas de inicio y cierre.</p>
        <div class="admin-asset-grid">${banners.map(bannerCard).join('')}</div>
      </section>`
    : emptyState('Todavía no hay banners', 'Crea el primero para actualizar la historia principal de tu portada.', pageAction('Crear banner', 'new-banner'));
  return `${pageHeading('Banners', 'Define las historias visuales principales de la portada.', pageAction('Nuevo banner', 'new-banner'))}${content}`;
}

function renderCampaigns() {
  const campaigns = [...state.data.campaigns].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
  const content = campaigns.length
    ? `<section class="admin-editorial-panel">
        <p class="admin-editorial-callout">Una rebaja activa calcula el precio más bajo disponible. Los descuentos no se acumulan: el cliente siempre ve la mejor oferta vigente.</p>
        <div class="admin-marketing-list">${campaigns.map(campaignRow).join('')}</div>
      </section>`
    : emptyState('Aún no hay campañas', 'Crea una campaña para programar una rebaja, código o beneficio editorial.', pageAction('Crear campaña', 'new-campaign'));
  return `${pageHeading('Promociones y campañas', 'Programa rebajas, códigos, beneficios y campañas temáticas.', pageAction('Nueva campaña', 'new-campaign'))}${content}`;
}

function renderNotices() {
  const notices = [...state.data.notices].sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));
  const content = notices.length
    ? `<section class="admin-editorial-panel">
        <p class="admin-editorial-callout">Solo se muestra al público el aviso activo, vigente y con mayor prioridad. Si es cerrable, cada visitante puede ocultarlo sin eliminarlo del panel.</p>
        <div class="admin-marketing-list">${notices.map(noticeRow).join('')}</div>
      </section>`
    : emptyState('No hay avisos configurados', 'Crea un aviso para comunicar novedades, promociones o alertas temporales.', pageAction('Crear aviso', 'new-notice'));
  return `${pageHeading('Avisos y alertas', 'Publica anuncios informativos, promociones y alertas temporales.', pageAction('Nuevo aviso', 'new-notice'))}${content}`;
}

function bannerCard(banner) {
  return `<article class="admin-asset-card">
    <div class="admin-asset-card__media">${editorialImage(banner.image_url, banner.title)}</div>
    <div class="admin-asset-card__body">
      <div class="admin-asset-card__meta">${statusPill(banner.status)}<span>Orden ${escapeHTML(formatNumber(banner.sort_order))}</span></div>
      <h2>${escapeHTML(banner.title)}</h2>
      <p>${escapeHTML(banner.body || banner.eyebrow || 'Sin descripción editorial.')}</p>
      <div class="admin-asset-card__actions">
        <button class="button button--secondary button--small admin-asset-card__edit" type="button" data-action="edit-banner" data-id="${escapeHTML(banner.id)}">${icon('edit')}<span>Editar</span></button>
        <button class="button button--danger button--small admin-asset-card__delete" type="button" data-action="delete-banners" data-id="${escapeHTML(banner.id)}" aria-label="Eliminar banner" title="Eliminar banner">${icon('trash')}</button>
      </div>
    </div>
  </article>`;
}

function campaignRow(campaign) {
  const discount = Number(campaign.discount_percent || 0) > 0 ? `${formatNumber(campaign.discount_percent)}%` : 'Editorial';
  const scope = targetLabel(campaign);
  const timing = campaign.ends_at ? ` · Hasta ${formatDate(campaign.ends_at)}` : '';
  return `<article class="admin-marketing-row">
    <div class="admin-marketing-row__copy">
      <span class="admin-marketing-row__type">${escapeHTML(campaign.type || 'Campaña')}</span>
      <h2>${escapeHTML(campaign.name)}</h2>
      <p>${escapeHTML(campaign.message || campaign.title || 'Sin descripción editorial.')}</p>
    </div>
    <p class="admin-marketing-row__meta">${escapeHTML(discount)} · ${scope}${escapeHTML(timing)}</p>
    ${statusPill(campaign.status)}
    <div class="admin-marketing-row__actions">
      ${rowAction('Editar', 'edit-campaign', campaign.id, 'edit')}
      ${rowAction('Eliminar', 'delete-campaigns', campaign.id, 'trash', true)}
    </div>
  </article>`;
}

function noticeRow(notice) {
  const timing = notice.ends_at ? ` · Hasta ${formatDate(notice.ends_at)}` : '';
  return `<article class="admin-marketing-row">
    <div class="admin-marketing-row__copy">
      <span class="admin-marketing-row__type">${escapeHTML(noticeLabel(notice.type))}</span>
      <h2>${escapeHTML(notice.title)}</h2>
      <p>${escapeHTML(notice.message || 'Sin mensaje.')}</p>
    </div>
    <p class="admin-marketing-row__meta">Prioridad ${escapeHTML(formatNumber(notice.priority))}${escapeHTML(timing)}</p>
    ${statusPill(notice.status)}
    <div class="admin-marketing-row__actions">
      ${rowAction('Editar', 'edit-notice', notice.id, 'edit')}
      ${rowAction('Eliminar', 'delete-notices', notice.id, 'trash', true)}
    </div>
  </article>`;
}

function renderTrust() {
  const cards = state.data.trustCards;
  return `${pageHeading('Tarjetas de confianza', 'Edita el bloque de beneficios bajo el hero: envío, catálogo, atención y gestión.', pageAction('Nueva tarjeta', 'new-trust-card'))}
    <section class="admin-panel"><header class="admin-panel__header"><div><h2 class="admin-panel__title">Vista previa del bloque</h2><p class="admin-form-section__copy">Este contenido es totalmente manipulable desde aquí.</p></div><span class="status ${state.data.settings.trust_enabled === '0' || state.data.settings.trust_enabled === 0 ? 'status--inactive' : 'status--active'}">${state.data.settings.trust_enabled === '0' || state.data.settings.trust_enabled === 0 ? 'Oculto' : 'Visible'}</span></header><div class="trust-grid" style="margin-bottom:26px">${cards.filter((card) => card.status === 'active').map(trustPreview).join('') || '<p class="text-muted">No hay tarjetas visibles.</p>'}</div></section>
    <div style="height:18px"></div>${renderGenericTable({ records: cards, resource: 'trust-cards', actionPrefix: 'trust-card', columns: [{ key: 'title', label: 'Tarjeta', render: (record) => `<span style="display:inline-flex;align-items:center;gap:9px;color:#1d1d1f">${icon(record.icon_key)}<strong>${escapeHTML(record.title)}</strong></span><small class="text-faint" style="display:block;margin-top:4px">${escapeHTML(record.body)}</small>` }, { key: 'theme', label: 'Estilo' }, { key: 'status', label: 'Estado', render: (record) => statusPill(record.status) }, { key: 'sort_order', label: 'Orden' }] })}`;
}

function trustPreview(card) {
  return `<article class="trust-card trust-card--${escapeHTML(card.theme || 'light')}"><span class="trust-card__icon" aria-hidden="true">${icon(card.icon_key)}</span><h3 class="trust-card__title">${escapeHTML(card.title)}</h3><p class="trust-card__copy">${escapeHTML(card.body)}</p></article>`;
}

function renderReviews() {
  const reviews = state.data.reviews;
  const approved = reviews.filter((review) => review.status === 'approved');
  const average = approved.length ? (approved.reduce((total, item) => total + Number(item.rating || 0), 0) / approved.length).toFixed(1) : '—';
  return `
    ${pageHeading('Opiniones y reseñas', 'Modera comentarios y controla su aparición en la tienda.', pageAction('Nueva reseña', 'new-review'))}
    <div class="admin-grid" style="margin-bottom:20px">${statCard('Total de reseñas', formatNumber(reviews.length), `${formatNumber(approved.length)} publicadas`, 'star')}${statCard('Calificación pública', average, approved.length ? 'Promedio de reseñas aprobadas' : 'Aún sin reseñas', 'star')}${statCard('Pendientes', formatNumber(reviews.filter((review) => review.status === 'pending').length), 'Requieren revisión', 'warning')}${statCard('Formulario público', state.data.settings.reviews_form_enabled === '0' || state.data.settings.reviews_form_enabled === 0 ? 'Desactivado' : 'Activo', state.data.settings.reviews_enabled === '0' || state.data.settings.reviews_enabled === 0 ? 'Reseñas ocultas en tienda' : 'Reseñas visibles', 'shield')}</div>
    ${reviews.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Cliente</th><th>Calificación</th><th>Producto</th><th>Estado</th><th>Destacada</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${reviews.map(reviewRow).join('')}</tbody></table></div>` : emptyState('Aún no hay reseñas', 'Cuando los clientes escriban opiniones aparecerán aquí para moderarlas.', pageAction('Añadir reseña', 'new-review'))}`;
}

function reviewRow(review) {
  const stars = '★'.repeat(Math.max(0, Math.min(5, Number(review.rating || 0)))) + '☆'.repeat(Math.max(0, 5 - Number(review.rating || 0)));
  return `<tr><td><strong style="color:#1d1d1f">${escapeHTML(review.author_name)}</strong><small class="text-faint" style="display:block;margin-top:2px">${escapeHTML(review.title || review.author_email || 'Sin asunto')}</small></td><td><span style="color:#d88600;letter-spacing:1px" aria-label="${escapeHTML(review.rating)} de 5">${stars}</span></td><td>${escapeHTML(review.product_name || 'Tienda')}</td><td>${statusPill(review.status)}</td><td>${review.is_featured == 1 || review.is_featured === true ? '<span class="status status--active">Sí</span>' : '—'}</td><td><div class="admin-table__actions">${review.status === 'pending' ? `<button class="button button--small button--ghost" type="button" data-action="moderate-review" data-id="${escapeHTML(review.id)}" data-status="approved">Aprobar</button>` : ''}${rowAction('Editar', 'edit-review', review.id, 'edit')}${rowAction('Eliminar', 'delete-reviews', review.id, 'trash', true)}</div></td></tr>`;
}

function renderSettings() {
  const settings = state.data.settings;
  return `${pageHeading('Tienda y WhatsApp', 'Nombre, identidad visual, contacto, visibilidad y preferencias de la tienda.')}
    <form class="admin-form" data-form="settings" id="settings-form" novalidate>
      <section class="admin-form-section"><header class="admin-form-section__header"><h2 class="admin-form-section__title">Identidad de marca</h2><p class="admin-form-section__copy">El nombre, logo e icono se reflejan en la tienda pública.</p></header><div class="form-grid">
        ${field('Nombre de tienda', 'store_name', settings.store_name || '', { required: true })}
        ${field('Frase corta', 'store_tagline', settings.store_tagline || '', { placeholder: 'Una experiencia que se siente cuidada.' })}
        ${brandingUpload('Logo', 'logo_media_id', settings.logo_media_id, settings.logo_url, 'branding-logo', 'PNG, JPG o WebP.')}
        ${brandingUpload('Icono / favicon', 'favicon_media_id', settings.favicon_media_id, settings.favicon_url, 'branding-favicon', 'PNG, JPG o WebP.')}
      </div></section>
      <section class="admin-form-section"><header class="admin-form-section__header"><h2 class="admin-form-section__title">Contacto y pedido por WhatsApp</h2><p class="admin-form-section__copy">Los pedidos se guardan antes de abrir la conversación de WhatsApp.</p></header><div class="form-grid">
        ${field('Número de WhatsApp', 'whatsapp_number', settings.whatsapp_number || '', { required: true, placeholder: '593991234567', hint: 'Incluye el código de país (593) y quita el 0 inicial. Ej.: 0991234567 → 593991234567.' })}
        ${field('Teléfono visible', 'store_phone', settings.store_phone || '', { placeholder: '+593 99 123 4567' })}
        ${field('Correo de contacto', 'store_email', settings.store_email || '', { type: 'email', placeholder: 'hola@tutienda.com' })}
        ${field('Dirección o zona', 'address', settings.address || '', { placeholder: 'Quito, Ecuador' })}
        ${field('Mensaje inicial de WhatsApp', 'whatsapp_message', settings.whatsapp_message || '', { type: 'textarea', full: true })}
        ${field('Aviso de envío', 'shipping_notice', settings.shipping_notice || '', { full: true, placeholder: 'Envío sin costo en compras desde $250.' })}
        ${field('Cobrar envío fijo', 'shipping_enabled', settings.shipping_enabled !== '0' && settings.shipping_enabled !== 0 && settings.shipping_enabled !== false, { type: 'checkbox', full: true, hint: 'Desactívalo para quitar el envío del carrito y de los pedidos de WhatsApp.' })}
        ${field('Valor de envío', 'shipping_fee', settings.shipping_fee ?? '5', { type: 'number', attrs: 'min="0" max="9999.99" step="0.01" inputmode="decimal"', hint: 'Por defecto se cobran $5. El valor 0 también permite envío sin costo.' })}
        ${field('Envío gratis desde', 'free_shipping_min', settings.free_shipping_min ?? '', { type: 'number', attrs: 'min="0" step="0.01" inputmode="decimal"', placeholder: 'Ej. 99', hint: 'Subtotal a partir del cual el envío es gratis. Déjalo vacío para cobrar siempre. Recuerda que el aviso de envío diga lo mismo.' })}
      </div></section>
      <section class="admin-form-section"><header class="admin-form-section__header"><h2 class="admin-form-section__title">Redes sociales</h2><p class="admin-form-section__copy">Añade solo los perfiles que quieras mostrar en la tienda. Los enlaces deben usar HTTPS.</p></header><div class="form-grid">
        ${socialField('Instagram', 'social_instagram', settings.social_instagram || '', 'https://instagram.com/tutienda', 'instagram')}
        ${socialField('Facebook', 'social_facebook', settings.social_facebook || '', 'https://facebook.com/tutienda', 'facebook')}
        ${socialField('TikTok', 'social_tiktok', settings.social_tiktok || '', 'https://tiktok.com/@tutienda', 'tiktok')}
        ${socialField('X', 'social_x', settings.social_x || '', 'https://x.com/tutienda', 'x')}
        ${socialField('YouTube', 'social_youtube', settings.social_youtube || '', 'https://youtube.com/@tutienda', 'youtube')}
      </div></section>
      <section class="admin-form-section"><header class="admin-form-section__header"><h2 class="admin-form-section__title">Experiencia y confianza</h2><p class="admin-form-section__copy">Activa o desactiva reseñas y el bloque de tarjetas de confianza.</p></header><div class="form-grid">
        <div class="field field--full" style="gap:14px">${field('Mostrar calificación, opiniones y reseñas', 'reviews_enabled', settings.reviews_enabled !== '0' && settings.reviews_enabled !== 0, { type: 'checkbox' })}${field('Permitir a clientes enviar reseñas', 'reviews_form_enabled', settings.reviews_form_enabled !== '0' && settings.reviews_form_enabled !== 0, { type: 'checkbox' })}${field('Mostrar tarjetas de confianza', 'trust_enabled', settings.trust_enabled !== '0' && settings.trust_enabled !== 0, { type: 'checkbox' })}</div>
        ${field('Título del bloque de confianza', 'trust_title', settings.trust_title || '', { full: true })}
        ${field('Descripción del bloque de confianza', 'trust_description', settings.trust_description || '', { type: 'textarea', full: true })}
      </div></section>
      <section class="admin-form-section"><header class="admin-form-section__header"><h2 class="admin-form-section__title">Idioma, moneda y SEO</h2><p class="admin-form-section__copy">Ajustes base para producción.</p></header><div class="form-grid">
        ${field('Moneda', 'currency', settings.currency || 'USD', { required: true, attrs: 'maxlength="4"' })}
        ${field('Localización', 'locale', settings.locale || 'es-EC', { required: true, placeholder: 'es-EC' })}
        ${field('Título SEO', 'seo_title', settings.seo_title || '', { full: true })}
        ${field('Descripción SEO', 'seo_description', settings.seo_description || '', { type: 'textarea', full: true })}
      </div></section>
      <section class="admin-form-section" style="background:#f5f5f7"><h2 class="admin-form-section__title">Crédito del proyecto</h2><p class="admin-form-section__copy">Desarrollado por A.T. Este crédito es permanente y no está disponible para edición.</p></section>
      <div class="form-actions"><button class="button button--large" type="submit" data-loading-label="Guardando…">Guardar configuración</button></div>
    </form>
    <form class="admin-form" id="account-form" novalidate>
      <section class="admin-form-section"><header class="admin-form-section__header"><h2 class="admin-form-section__title">Cuenta de administración</h2><p class="admin-form-section__copy">Cambia tus datos de acceso sin exponer la contraseña actual. Para modificar correo o contraseña, confirma primero la contraseña vigente.</p></header><div class="form-grid">
        ${field('Nombre de administrador', 'name', state.user?.name || '', { required: true, attrs: 'autocomplete="name"' })}
        ${field('Correo para iniciar sesión', 'email', state.user?.email || '', { type: 'email', required: true, attrs: 'autocomplete="username"' })}
        ${passwordField('Contraseña actual', 'current_password', { hint: 'Obligatoria solo si cambias el correo o la contraseña.', attrs: 'autocomplete="current-password"' })}
        ${passwordField('Nueva contraseña', 'new_password', { hint: 'Mínimo 12 caracteres.', attrs: 'autocomplete="new-password" minlength="12"' })}
        ${passwordField('Repite la nueva contraseña', 'new_password_confirmation', { attrs: 'autocomplete="new-password" minlength="12"' })}
      </div></section>
      <div class="form-actions"><button class="button button--secondary button--large" type="submit" data-loading-label="Actualizando…">Actualizar acceso</button></div>
    </form>`;
}

function socialField(label, name, value, placeholder, iconName) {
  return `<div class="field social-field"><label for="field-${escapeHTML(name)}">${escapeHTML(label)}</label><span class="social-input social-input--${escapeHTML(iconName)}"><span class="social-input__icon" aria-hidden="true">${icon(iconName)}</span><input class="input" id="field-${escapeHTML(name)}" type="url" name="${escapeHTML(name)}" value="${escapeHTML(value)}" placeholder="${escapeHTML(placeholder)}" inputmode="url"></span></div>`;
}

function brandingUpload(label, name, id, url, kind, hint) {
  const source = safeUrl(url);
  return `<div class="field"><label>${escapeHTML(label)}</label><input type="hidden" name="${escapeHTML(name)}" id="${escapeHTML(name)}" value="${escapeHTML(id || '')}"><label class="image-upload image-upload--${escapeHTML(kind)}" for="upload-${escapeHTML(name)}" id="preview-wrap-${escapeHTML(name)}"><span data-upload-preview="${escapeHTML(name)}">${source ? `<img class="image-upload__preview" src="${escapeHTML(source)}" alt="Vista previa de ${escapeHTML(label)}">` : `<span><span style="display:grid;place-items:center;margin:auto;width:36px;height:36px">${icon('upload')}</span><strong style="display:block;margin-top:8px">Subir ${escapeHTML(label.toLowerCase())}</strong></span>`}</span><input id="upload-${escapeHTML(name)}" type="file" accept="image/jpeg,image/png,image/webp" data-upload-target="${escapeHTML(name)}" data-upload-kind="${escapeHTML(kind)}"></label><p class="field-hint">${escapeHTML(hint)} <span class="upload-spec">${icon('image')} ${escapeHTML(uploadSpec(kind).label)}. Se ajusta sola al subir.</span></p></div>`;
}

function renderGenericTable({ records, resource, columns, actionPrefix = '' }) {
  const singular = actionPrefix || resource.replace(/s$/, '');
  const actionNew = resource === 'trust-cards' ? 'new-trust-card' : `new-${singular}`;
  if (!records.length) return emptyState('No hay elementos todavía', 'Crea el primero para empezar a configurarlo.', pageAction('Crear nuevo', actionNew));
  return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${columns.map((column) => `<th>${escapeHTML(column.label)}</th>`).join('')}<th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${records.map((record) => `<tr>${columns.map((column) => `<td>${column.render ? column.render(record) : escapeHTML(record[column.key] ?? '—')}</td>`).join('')}<td><div class="admin-table__actions">${rowAction('Editar', `edit-${singular}`, record.id, 'edit')}${rowAction('Eliminar', `delete-${resource}`, record.id, 'trash', true)}</div></td></tr>`).join('')}</tbody></table></div>`;
}

function targetLabel(record) {
  const labels = { all: 'Toda la tienda', category: 'Categoría', product: 'Producto' };
  return escapeHTML(labels[record.target_type] || record.target_type || 'Toda la tienda');
}

function noticeLabel(value) {
  return ({ info: 'Información', promotion: 'Promoción', warning: 'Advertencia', alert: 'Alerta' })[value] || value || 'Información';
}

function recordFor(resource, id) {
  const key = { 'trust-cards': 'trustCards' }[resource] || resource;
  return (state.data[key] || []).find((record) => String(record.id) === String(id)) || null;
}

let modalCloseTimer = 0;

function openModal(title, content, options = {}) {
  // A modal opened right after another one closes (e.g. "confirm" → "notify
  // the customer") must not be wiped by the previous close animation.
  window.clearTimeout(modalCloseTimer);
  closeModal(true);
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal" aria-hidden="true"></div>
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <header class="modal__header"><h2 class="modal__title" id="admin-modal-title">${escapeHTML(title)}</h2><button class="icon-button" type="button" data-action="close-modal" aria-label="Cerrar">${icon('close')}</button></header>
      <div class="modal__body">${content}</div>
    </section>`;
  document.body.classList.add('has-modal');
  requestAnimationFrame(() => {
    modalRoot.querySelector('.modal-backdrop')?.classList.add('is-open');
    modalRoot.querySelector('.modal')?.classList.add('is-open');
    const firstFocusable = modalRoot.querySelector('input, select, textarea, button');
    firstFocusable?.focus();
  });
  if (options.onOpen) options.onOpen();
}

function closeModal(immediate = false) {
  const modal = modalRoot.querySelector('.modal');
  const backdrop = modalRoot.querySelector('.modal-backdrop');
  if (!modal && !backdrop) return;
  state.pendingConfirmation = null;
  document.body.classList.remove('has-modal');
  if (immediate) {
    modalRoot.innerHTML = '';
    return;
  }
  modal?.classList.remove('is-open');
  backdrop?.classList.remove('is-open');
  modalCloseTimer = window.setTimeout(() => { modalRoot.innerHTML = ''; }, 240);
}

function requestConfirmation({ title, message, detail = '', confirmLabel = 'Confirmar', destructive = false, onConfirm }) {
  openModal(title, `<section class="confirm-dialog"><p class="confirm-dialog__message">${escapeHTML(message)}</p>${detail ? `<p class="confirm-dialog__detail">${escapeHTML(detail)}</p>` : ''}<div class="form-actions"><button class="button button--secondary" type="button" data-action="close-modal">Cancelar</button><button class="button${destructive ? ' button--danger' : ''}" type="button" data-action="confirm-pending-action">${escapeHTML(confirmLabel)}</button></div></section>`);
  state.pendingConfirmation = { onConfirm };
}

async function confirmPendingAction() {
  const pending = state.pendingConfirmation;
  if (!pending?.onConfirm) return;
  state.pendingConfirmation = null;
  closeModal();
  await pending.onConfirm();
}

function editorForm(resource, id, content, submitLabel = 'Guardar cambios') {
  return `<form class="admin-form" data-form="${escapeHTML(resource)}" data-id="${escapeHTML(id || '')}" novalidate>${content}<div class="form-actions"><button class="button button--secondary" type="button" data-action="close-modal">Cancelar</button><button class="button" type="submit" data-loading-label="Guardando…">${escapeHTML(submitLabel)}</button></div></form>`;
}

function section(title, copy, content) {
  return `<section class="admin-form-section"><header class="admin-form-section__header"><h3 class="admin-form-section__title">${escapeHTML(title)}</h3>${copy ? `<p class="admin-form-section__copy">${escapeHTML(copy)}</p>` : ''}</header>${content}</section>`;
}

function hiddenField(name, value) {
  return `<input type="hidden" name="${escapeHTML(name)}" id="field-${escapeHTML(name)}" value="${escapeHTML(value ?? '')}">`;
}

/*
 * Every image slot has a fixed shape in the store. Uploads are fitted to that
 * shape in the browser before they are sent, so a photo never overflows,
 * stretches or crops unexpectedly, and files stay light.
 */
const UPLOAD_SPECS = {
  products: { width: 1200, height: 1200, mode: 'contain', background: '#ffffff', label: 'Cuadrada 1200 × 1200 px · fondo blanco' },
  categories: { width: 1200, height: 900, mode: 'contain', background: '#ffffff', label: 'Horizontal 1200 × 900 px' },
  banners: { width: 1600, height: 1000, mode: 'fit', label: 'Hasta 1600 px · se respeta el recorte (ideal PNG sin fondo)' },
  'branding-logo': { width: 600, height: 600, mode: 'fit', label: 'Hasta 600 px · ideal PNG sin fondo' },
  'branding-favicon': { width: 256, height: 256, mode: 'contain', background: null, label: 'Cuadrada 256 × 256 px' },
};

function uploadSpec(kind) {
  return UPLOAD_SPECS[kind] || { width: 1600, height: 1600, mode: 'fit', label: 'Hasta 1600 px' };
}

async function prepareUploadImage(file, kind) {
  const spec = uploadSpec(kind);
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const keepAlpha = file.type !== 'image/jpeg' && (spec.background === null || spec.mode === 'fit');
    let canvasWidth;
    let canvasHeight;
    let drawWidth;
    let drawHeight;
    if (spec.mode === 'fit') {
      const scale = Math.min(1, spec.width / bitmap.width, spec.height / bitmap.height);
      canvasWidth = drawWidth = Math.round(bitmap.width * scale);
      canvasHeight = drawHeight = Math.round(bitmap.height * scale);
    } else {
      canvasWidth = spec.width;
      canvasHeight = spec.height;
      // Leave a small margin so products never touch the edge of the card.
      const scale = Math.min((spec.width * 0.92) / bitmap.width, (spec.height * 0.92) / bitmap.height);
      drawWidth = Math.round(bitmap.width * scale);
      drawHeight = Math.round(bitmap.height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    if (spec.background && !keepAlpha) {
      context.fillStyle = spec.background;
      context.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    context.drawImage(bitmap, Math.round((canvasWidth - drawWidth) / 2), Math.round((canvasHeight - drawHeight) / 2), drawWidth, drawHeight);
    const type = keepAlpha ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.86));
    if (!blob) return file;
    const name = file.name.replace(/\.[a-z0-9]+$/i, '') + (type === 'image/png' ? '.png' : '.jpg');
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}

function modalImageUpload(label, fieldName, mediaValue, url, kind, options = {}) {
  const source = safeUrl(url);
  const multiple = Boolean(options.multiple);
  const preview = source
    ? `<img class="image-upload__preview" src="${escapeHTML(source)}" alt="Vista previa de ${escapeHTML(label)}">`
    : `<span><span style="display:grid;place-items:center;width:38px;height:38px;margin:auto">${icon('upload')}</span><strong style="display:block;margin-top:8px">Subir imagen</strong><small style="display:block;margin-top:4px">JPG, PNG o WebP</small></span>`;
  return `<div class="field field--full"><label>${escapeHTML(label)}</label>${hiddenField(fieldName, mediaValue || '')}<label class="image-upload image-upload--${escapeHTML(kind)}" for="upload-${escapeHTML(fieldName)}"><span data-upload-preview="${escapeHTML(fieldName)}">${preview}</span><input id="upload-${escapeHTML(fieldName)}" type="file" accept="image/jpeg,image/png,image/webp"${multiple ? ' multiple' : ''} data-upload-target="${escapeHTML(fieldName)}" data-upload-kind="${escapeHTML(kind)}"${multiple ? ' data-upload-multiple="true"' : ''}></label><p class="field-hint">${escapeHTML(options.hint || 'JPG, PNG o WebP.')} <span class="upload-spec">${icon('image')} ${escapeHTML(uploadSpec(kind).label)}. Se ajusta sola al subir.</span></p></div>`;
}

function openProductForm(id = null) {
  const product = id ? recordFor('products', id) : {};
  const categories = state.data.categories.filter((category) => category.status !== 'archived');
  if (!categories.length) {
    showToast('Crea una categoría antes de añadir un producto.', 'warning');
    state.activeView = 'categories';
    renderApp();
    openCategoryForm();
    return;
  }
  const categoryChoices = [{ value: '', label: 'Selecciona una categoría' }, ...categories.map((category) => ({ value: category.id, label: category.name }))];
  const mediaIds = Array.isArray(product.media_ids) ? product.media_ids.join(',') : '';
  const body = [
    section('Información principal', 'Título, URL amigable y organización dentro del catálogo.', `<div class="form-grid">
      ${field('Nombre del producto', 'name', product.name || '', { required: true, attrs: 'data-slug-source="slug"' })}
      ${field('Slug', 'slug', product.slug || '', { required: true, hint: 'Se usa en la URL del producto.' })}
      ${field('Categoría', 'category_id', product.category_id || '', { type: 'select', required: true, choices: categoryChoices })}
      ${field('SKU', 'sku', product.sku || '', { required: true, placeholder: 'LUM-001' })}
      ${field('Estado', 'status', product.status || 'draft', { type: 'select', choices: [{ value: 'draft', label: 'Borrador' }, { value: 'active', label: 'Activo' }, { value: 'out_of_stock', label: 'Sin stock' }, { value: 'archived', label: 'Archivado' }] })}
      ${field('Etiqueta', 'badge', product.badge || '', { placeholder: 'Nuevo, Oferta, Edición limitada' })}
      ${field('Orden de aparición', 'sort_order', product.sort_order || 0, { type: 'number', attrs: 'min="0" step="1"' })}
    </div>`),
    section('Precio e inventario', 'El precio promocional debe ser menor al precio normal.', `<div class="form-grid">
      ${field('Precio normal', 'regular_price', product.regular_price ?? '', { type: 'number', required: true, attrs: 'min="0.01" step="0.01"' })}
      ${field('Precio promocional', 'sale_price', product.sale_price ?? '', { type: 'number', attrs: 'min="0.01" step="0.01"', hint: 'Déjalo vacío si no hay rebaja individual.' })}
      ${field('Stock disponible', 'stock', product.stock ?? 0, { type: 'number', required: true, attrs: 'min="0" step="1"' })}
      ${field('Alerta de inventario bajo', 'low_stock_threshold', product.low_stock_threshold ?? 0, { type: 'number', attrs: 'min="0" step="1"' })}
    </div>`),
    section('Descripción', 'Incluye una descripción breve para tarjetas y una extendida para el detalle.', `<div class="form-grid">${field('Descripción corta', 'short_description', product.short_description || '', { type: 'textarea', full: true, required: true, attrs: 'maxlength="360"' })}${field('Descripción larga', 'long_description', product.long_description || '', { type: 'textarea', full: true, attrs: 'maxlength="4000"' })}</div>`),
    section('Imágenes y variantes', 'Sube una o varias imágenes. Las variantes se guardan junto con el producto.', `<div class="form-grid">${modalImageUpload('Imágenes del producto', 'media_ids', mediaIds, product.image_url, 'products', { multiple: true, hint: 'La primera imagen será la portada. Puedes seleccionar varias a la vez.' })}${field('Texto alternativo de las imágenes', 'image_alt', product.image_alt || product.name || '', { full: true, placeholder: 'Descripción breve de la imagen' })}</div><div style="margin-top:22px"><div class="admin-panel__header"><div><h4 class="admin-panel__title">Variantes</h4><p class="admin-form-section__copy">Usa Grupo: «Color» y Valor: «Negro», por ejemplo. La tienda mostrará las opciones en un desplegable.</p></div><button type="button" class="button button--secondary button--small" data-action="add-variant">${icon('plus')} Añadir variante</button></div><div id="variant-list" style="display:grid;gap:10px">${variantRows(product.variants || [])}</div></div>`),
  ].join('');
  openModal(id ? 'Editar producto' : 'Nuevo producto', editorForm('products', product.id || '', body, id ? 'Guardar producto' : 'Crear producto'));
}

function variantRows(variants) {
  if (!variants.length) return '<p class="text-muted" data-variant-empty>Aún no hay variantes. El producto puede venderse sin opciones.</p>';
  return variants.map((variant, index) => variantRow(variant, index)).join('');
}

function variantRow(variant = {}, index = 0) {
  return `<div class="form-grid" data-variant-row style="padding:13px;border:1px solid rgba(29,29,31,.1);border-radius:12px;background:#fafafd"><div class="field"><label>Grupo de variante</label><input class="input" name="variant_option_name" value="${escapeHTML(variant.option_name || '')}" placeholder="Color"></div><div class="field"><label>Valor de variante</label><input class="input" name="variant_option_value" value="${escapeHTML(variant.option_value || '')}" placeholder="Negro"></div><div class="field"><label>SKU variante</label><input class="input" name="variant_sku" value="${escapeHTML(variant.sku || '')}" placeholder="LUM-001-N"></div><div class="field"><label>Ajuste de precio</label><input class="input" type="number" step="0.01" name="variant_price_delta" value="${escapeHTML(variant.price_delta || 0)}"></div><div class="field"><label>Stock variante</label><input class="input" type="number" min="0" step="1" name="variant_stock" value="${escapeHTML(variant.stock ?? 0)}"></div><div class="field" style="align-self:end"><button type="button" class="button button--ghost button--small" data-action="remove-variant">${icon('trash')} Quitar</button></div></div>`;
}

function openCategoryForm(id = null) {
  const category = id ? recordFor('categories', id) : {};
  const body = section('Configuración de categoría', 'Las categorías activas se podrán navegar en la tienda pública.', `<div class="form-grid">
    ${field('Nombre', 'name', category.name || '', { required: true, attrs: 'data-slug-source="slug"' })}
    ${field('Slug', 'slug', category.slug || '', { required: true })}
    ${field('Estado', 'status', category.status || 'active', { type: 'select', choices: [{ value: 'active', label: 'Activa' }, { value: 'hidden', label: 'Oculta' }, { value: 'archived', label: 'Archivada' }] })}
    ${field('Orden de aparición', 'sort_order', category.sort_order || 0, { type: 'number', attrs: 'min="0" step="1"' })}
    ${field('Descripción', 'description', category.description || '', { type: 'textarea', full: true, attrs: 'maxlength="500"' })}
    ${modalImageUpload('Imagen de categoría', 'media_id', category.media_id || '', category.image_url, 'categories', { hint: 'Imagen opcional para el acceso visual de la categoría.' })}
  </div>`);
  openModal(id ? 'Editar categoría' : 'Nueva categoría', editorForm('categories', category.id || '', body, id ? 'Guardar categoría' : 'Crear categoría'));
}

function openBannerForm(id = null) {
  const banner = id ? recordFor('banners', id) : {};
  const body = section('Contenido del banner', 'Los banners activos aparecen en orden dentro de la portada.', `<div class="form-grid">
    ${field('Sobrelínea', 'eyebrow', banner.eyebrow || '', { placeholder: 'Nueva colección' })}
    ${field('Título', 'title', banner.title || '', { required: true })}
    ${field('Texto', 'body', banner.body || '', { type: 'textarea', full: true, required: true, attrs: 'maxlength="600"' })}
    ${field('Texto del CTA', 'cta_label', banner.cta_label || '', { placeholder: 'Explorar ahora' })}
    ${field('Destino del CTA', 'cta_target', banner.cta_target || '', { placeholder: '#productos', hint: 'Usa una sección interna (#productos) o un enlace https.' })}
    ${field('Tema visual', 'theme', banner.theme || 'light', { type: 'select', choices: [{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }, { value: 'warm', label: 'Cálido' }] })}
    ${field('Estado', 'status', banner.status || 'draft', { type: 'select', choices: publicationChoices() })}
    ${field('Orden', 'sort_order', banner.sort_order || 0, { type: 'number', attrs: 'min="0" step="1"' })}
    ${field('Inicio', 'starts_at', banner.starts_at || '', { type: 'date' })}
    ${field('Fin', 'ends_at', banner.ends_at || '', { type: 'date' })}
    ${modalImageUpload('Imagen del banner', 'media_id', banner.media_id || '', banner.image_url, 'banners', { hint: 'Una imagen amplia mejora la composición visual.' })}
  </div>`);
  openModal(id ? 'Editar banner' : 'Nuevo banner', editorForm('banners', banner.id || '', body, id ? 'Guardar banner' : 'Crear banner'));
}

function publicationChoices() {
  return [{ value: 'draft', label: 'Borrador' }, { value: 'active', label: 'Activo' }, { value: 'paused', label: 'Pausado' }, { value: 'archived', label: 'Archivado' }];
}

function openCampaignForm(id = null) {
  const campaign = id ? recordFor('campaigns', id) : {};
  const targetType = campaign.target_type || 'all';
  const body = section('Reglas de campaña', 'Puedes aplicar la rebaja a toda la tienda, una categoría o un producto.', `<div class="form-grid">
    ${field('Nombre interno', 'name', campaign.name || '', { required: true, placeholder: 'Cyber Week 2026' })}
    ${field('Tipo', 'type', campaign.type || 'promotion', { type: 'select', choices: [{ value: 'promotion', label: 'Promoción' }, { value: 'sale', label: 'Rebaja' }, { value: 'campaign', label: 'Campaña' }, { value: 'benefit', label: 'Beneficio' }] })}
    ${field('Titular visible', 'title', campaign.title || '', { required: true })}
    ${field('Código promocional', 'code', campaign.code || '', { placeholder: 'BIENVENIDA10' })}
    ${field('Mensaje', 'message', campaign.message || '', { type: 'textarea', full: true, attrs: 'maxlength="700"' })}
    ${field('Descuento (%)', 'discount_percent', campaign.discount_percent ?? 0, { type: 'number', attrs: 'min="0" max="100" step="0.01"' })}
    ${field('Aplica a', 'target_type', targetType, { type: 'select', choices: [{ value: 'all', label: 'Toda la tienda' }, { value: 'category', label: 'Una categoría' }, { value: 'product', label: 'Un producto' }], attrs: 'data-campaign-target-type' })}
    <div id="campaign-target-holder">${campaignTargetField(targetType, campaign.target_id || '')}</div>
    ${field('Texto del CTA', 'cta_label', campaign.cta_label || '', { placeholder: 'Descubrir oferta' })}
    ${field('Destino del CTA', 'cta_target', campaign.cta_target || '', { placeholder: '#productos' })}
    ${field('Tema', 'theme', campaign.theme || 'blue', { type: 'select', choices: [{ value: 'blue', label: 'Azul' }, { value: 'dark', label: 'Oscuro' }, { value: 'warm', label: 'Cálido' }] })}
    ${field('Estado', 'status', campaign.status || 'draft', { type: 'select', choices: publicationChoices() })}
    ${field('Orden', 'sort_order', campaign.sort_order || 0, { type: 'number', attrs: 'min="0" step="1"' })}
    ${field('Inicio', 'starts_at', campaign.starts_at || '', { type: 'date' })}
    ${field('Fin', 'ends_at', campaign.ends_at || '', { type: 'date' })}
  </div>`);
  openModal(id ? 'Editar campaña' : 'Nueva campaña', editorForm('campaigns', campaign.id || '', body, id ? 'Guardar campaña' : 'Crear campaña'));
}

function campaignTargetField(type, selected) {
  if (type === 'category') {
    return field('Categoría objetivo', 'target_id', selected, { type: 'select', choices: [{ value: '', label: 'Selecciona una categoría' }, ...state.data.categories.map((category) => ({ value: category.id, label: category.name }))] });
  }
  if (type === 'product') {
    return field('Producto objetivo', 'target_id', selected, { type: 'select', choices: [{ value: '', label: 'Selecciona un producto' }, ...state.data.products.filter((product) => product.status !== 'archived').map((product) => ({ value: product.id, label: product.name }))] });
  }
  return `<div class="field"><label>Destino</label><input class="input" value="Toda la tienda" disabled>${hiddenField('target_id', '')}</div>`;
}

function openNoticeForm(id = null) {
  const notice = id ? recordFor('notices', id) : {};
  const body = section('Contenido del aviso', 'Define un anuncio temporal y priorízalo dentro de la barra superior.', `<div class="form-grid">
    ${field('Tipo', 'type', notice.type || 'info', { type: 'select', choices: [{ value: 'info', label: 'Información' }, { value: 'promotion', label: 'Promoción' }, { value: 'warning', label: 'Advertencia' }, { value: 'alert', label: 'Alerta' }] })}
    ${field('Título', 'title', notice.title || '', { required: true })}
    ${field('Mensaje', 'message', notice.message || '', { type: 'textarea', full: true, required: true, attrs: 'maxlength="500"' })}
    ${field('Texto del CTA', 'cta_label', notice.cta_label || '', { placeholder: 'Ver novedades' })}
    ${field('Destino del CTA', 'cta_target', notice.cta_target || '', { placeholder: '#productos' })}
    ${field('Prioridad', 'priority', notice.priority ?? 0, { type: 'number', attrs: 'min="0" step="1"', hint: 'Un número mayor se muestra primero.' })}
    ${field('Estado', 'status', notice.status || 'draft', { type: 'select', choices: publicationChoices() })}
    ${field('Inicio', 'starts_at', notice.starts_at || '', { type: 'date' })}
    ${field('Fin', 'ends_at', notice.ends_at || '', { type: 'date' })}
    ${field('Permitir cerrar este aviso', 'dismissible', notice.dismissible !== 0 && notice.dismissible !== '0', { type: 'checkbox', full: true })}
  </div>`);
  openModal(id ? 'Editar aviso' : 'Nuevo aviso', editorForm('notices', notice.id || '', body, id ? 'Guardar aviso' : 'Crear aviso'));
}

function openTrustCardForm(id = null) {
  const card = id ? recordFor('trust-cards', id) : {};
  const body = section('Tarjeta de confianza', 'Este bloque corresponde a las cuatro tarjetas bajo el hero de la tienda.', `<div class="form-grid">
    ${field('Icono', 'icon_key', card.icon_key || 'shield', { type: 'select', choices: [{ value: 'truck', label: 'Envío' }, { value: 'shield', label: 'Escudo' }, { value: 'card', label: 'Tarjeta' }, { value: 'chat', label: 'Conversación' }, { value: 'gift', label: 'Regalo' }, { value: 'location', label: 'Ubicación' }, { value: 'clock', label: 'Reloj' }, { value: 'box', label: 'Caja' }, { value: 'check', label: 'Verificación' }, { value: 'headset', label: 'Soporte' }] })}
    ${field('Estilo', 'theme', card.theme || 'light', { type: 'select', choices: [{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }, { value: 'accent', label: 'Acento' }] })}
    ${field('Título', 'title', card.title || '', { required: true })}
    ${field('Texto', 'body', card.body || '', { type: 'textarea', full: true, required: true, attrs: 'maxlength="250"' })}
    ${field('Texto del CTA', 'cta_label', card.cta_label || '', { placeholder: 'Conocer más' })}
    ${field('Destino del CTA', 'cta_target', card.cta_target || '', { placeholder: '#productos' })}
    ${field('Orden', 'sort_order', card.sort_order || 0, { type: 'number', attrs: 'min="0" step="1"' })}
    ${field('Estado', 'status', card.status || 'active', { type: 'select', choices: [{ value: 'active', label: 'Visible' }, { value: 'hidden', label: 'Oculta' }] })}
  </div>`);
  openModal(id ? 'Editar tarjeta' : 'Nueva tarjeta', editorForm('trust-cards', card.id || '', body, id ? 'Guardar tarjeta' : 'Crear tarjeta'));
}

function openReviewForm(id = null) {
  const review = id ? recordFor('reviews', id) : {};
  const productChoices = [{ value: '', label: 'Reseña general de la tienda' }, ...state.data.products.filter((product) => product.status !== 'archived').map((product) => ({ value: product.id, label: product.name }))];
  const body = section('Moderación de reseña', 'Solo las reseñas aprobadas y con reseñas activas se mostrarán en la tienda.', `<div class="form-grid">
    ${field('Nombre del cliente', 'author_name', review.author_name || '', { required: true })}
    ${field('Correo del cliente', 'author_email', review.author_email || '', { type: 'email' })}
    ${field('Producto', 'product_id', review.product_id || '', { type: 'select', choices: productChoices })}
    ${field('Calificación', 'rating', review.rating || 5, { type: 'select', choices: [5, 4, 3, 2, 1].map((rating) => ({ value: rating, label: `${rating} estrella${rating === 1 ? '' : 's'}` })) })}
    ${field('Título', 'title', review.title || '', { full: true })}
    ${field('Opinión', 'body', review.body || '', { type: 'textarea', full: true, required: true, attrs: 'maxlength="1600"' })}
    ${field('Estado', 'status', review.status || 'pending', { type: 'select', choices: [{ value: 'pending', label: 'Pendiente' }, { value: 'approved', label: 'Aprobada' }, { value: 'rejected', label: 'Rechazada' }, { value: 'hidden', label: 'Oculta' }] })}
    ${field('Destacar en la tienda', 'is_featured', review.is_featured == 1 || review.is_featured === true, { type: 'checkbox', full: true })}
  </div>`);
  openModal(id ? 'Editar reseña' : 'Nueva reseña', editorForm('reviews', review.id || '', body, id ? 'Guardar reseña' : 'Guardar reseña'));
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formValue(form, name) {
  const input = form.elements.namedItem(name);
  if (!input) return '';
  return input instanceof RadioNodeList ? input.value : input.value;
}

function formDataObject(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    data[input.name] = input.checked ? '1' : '0';
  });
  return data;
}

function productFormData(form) {
  const data = formDataObject(form);
  data.media_ids = String(data.media_ids || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  data.variants = [...form.querySelectorAll('[data-variant-row]')].map((row) => ({
    option_name: row.querySelector('[name="variant_option_name"]')?.value || '',
    option_value: row.querySelector('[name="variant_option_value"]')?.value || '',
    sku: row.querySelector('[name="variant_sku"]')?.value || '',
    price_delta: row.querySelector('[name="variant_price_delta"]')?.value || '0',
    stock: row.querySelector('[name="variant_stock"]')?.value || '0',
  }));
  return data;
}

function resourceFromForm(form) {
  return form.dataset.form || '';
}

async function loadAdmin() {
  renderLoading();
  const payload = await api('admin', 'bootstrap');
  state.data = { ...emptyData(), ...payload };
  state.orderList.loaded = Array.isArray(payload.orders);
  state.orderList.loading = false;
  state.user = payload.user;
  state.csrf = payload.csrf_token;
  renderApp();
}

async function refreshAdmin(options = {}) {
  const keepView = options.keepView !== false;
  const activeView = state.activeView;
  const payload = await api('admin', 'bootstrap');
  state.data = { ...emptyData(), ...payload };
  state.orderList.loaded = Array.isArray(payload.orders);
  state.orderList.loading = false;
  state.user = payload.user;
  state.csrf = payload.csrf_token;
  if (keepView) state.activeView = activeView;
  renderApp();
}

function orderListFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}

async function loadOrders(options = {}) {
  const force = options.force === true;
  if (state.orderList.loading || (!force && state.orderList.loaded)) return;
  state.orderList.loading = true;
  if (state.activeView === 'orders') renderPage();
  try {
    const payload = await api('orders', 'list');
    state.data.orders = orderListFromPayload(payload);
    state.orderList.loaded = true;
  } catch (error) {
    showToast(error?.message || 'No fue posible cargar los pedidos.', 'error');
  } finally {
    state.orderList.loading = false;
    if (state.activeView === 'orders') renderPage();
  }
}

async function submitLogin(form) {
  if (!form.reportValidity()) return;
  const email = formValue(form, 'email');
  const password = formValue(form, 'password');
  setLoading(true);
  try {
    const session = await api('auth', 'login', { method: 'POST', data: { email, password }, csrf: false });
    state.user = session.user;
    state.csrf = session.csrf_token;
    await loadAdmin();
    showToast('Sesión iniciada.');
  } catch (error) {
    const message = error?.message || 'No fue posible iniciar sesión.';
    const errorNode = form.closest('.admin-login__card')?.querySelector('.form-error');
    if (errorNode) errorNode.textContent = message;
    else {
      const node = document.createElement('p');
      node.className = 'form-error';
      node.setAttribute('role', 'alert');
      node.textContent = message;
      form.before(node);
    }
  } finally {
    setLoading(false);
  }
}

async function submitSettings(form) {
  if (!form.reportValidity()) return;
  setLoading(true);
  try {
    await api('settings', '', { method: 'POST', data: { data: formDataObject(form) } });
    await refreshAdmin();
    showToast('Configuración guardada.');
  } catch (error) {
    showToast(error?.message || 'No fue posible guardar la configuración.', 'error');
  } finally {
    setLoading(false);
  }
}

async function submitAccount(form) {
  if (!form.reportValidity()) return;
  const newPassword = formValue(form, 'new_password');
  const confirmation = formValue(form, 'new_password_confirmation');
  if (newPassword !== confirmation) {
    showToast('La nueva contraseña y su confirmación no coinciden.', 'error');
    return;
  }
  setLoading(true);
  try {
    const account = await api('auth', 'update-profile', { method: 'POST', data: formDataObject(form) });
    state.user = account.user;
    state.csrf = account.csrf_token;
    await refreshAdmin();
    showToast('Datos de acceso actualizados.');
  } catch (error) {
    showToast(error?.message || 'No fue posible actualizar los datos de acceso.', 'error');
  } finally {
    setLoading(false);
  }
}

async function submitEditor(form) {
  if (!form.reportValidity()) return;
  const resource = resourceFromForm(form);
  const id = form.dataset.id || undefined;
  const data = resource === 'products' ? productFormData(form) : formDataObject(form);
  setLoading(true);
  try {
    await api(resource, 'save', { method: 'POST', data: { data, ...(id ? { id } : {}) } });
    closeModal();
    await refreshAdmin();
    showToast(id ? 'Cambios guardados.' : 'Elemento creado.');
  } catch (error) {
    const target = form.querySelector('.form-error') || document.createElement('p');
    target.className = 'form-error';
    target.setAttribute('role', 'alert');
    target.textContent = error?.message || 'No fue posible guardar los cambios.';
    if (!target.parentNode) form.prepend(target);
    showToast(target.textContent, 'error');
  } finally {
    setLoading(false);
  }
}

async function submitShipment(form) {
  if (!form.reportValidity()) return;
  const id = Number(form.dataset.orderId);
  if (!Number.isInteger(id) || id < 1) {
    showToast('No encontramos el pedido para actualizar.', 'error');
    return;
  }
  const data = formDataObject(form);
  const changed = data.status && data.status !== form.dataset.currentStatus;
  setLoading(true);
  try {
    closeModal();
    await saveShipment(id, data, changed ? `Pedido actualizado: ${shipmentStatusLabel(data.status)}` : 'Seguimiento guardado');
  } catch (error) {
    openShipmentEditor(id, data.status);
    const reopened = modalRoot.querySelector('#shipment-form');
    if (reopened) {
      Object.entries(data).forEach(([name, value]) => {
        const input = reopened.querySelector(`[name="${CSS.escape(name)}"]`);
        if (input && name !== 'status') input.value = value;
      });
      const target = document.createElement('p');
      target.className = 'form-error';
      target.setAttribute('role', 'alert');
      target.textContent = error?.message || 'No fue posible actualizar el seguimiento.';
      reopened.prepend(target);
      updateShipmentEditorHints();
    }
    showToast(error?.message || 'No fue posible actualizar el seguimiento.', 'error');
  } finally {
    setLoading(false);
  }
}

async function removeResource(resource, id) {
  const labels = {
    products: 'eliminar permanentemente este producto',
    categories: 'eliminar esta categoría',
    banners: 'eliminar este banner',
    campaigns: 'eliminar esta campaña',
    notices: 'eliminar este aviso',
    'trust-cards': 'eliminar esta tarjeta',
    reviews: 'eliminar esta reseña',
    orders: 'eliminar este pedido',
  };
  const label = labels[resource] || 'eliminar este elemento';
  requestConfirmation({
    title: '¿Eliminar definitivamente?',
    message: `¿Seguro que deseas ${label}?`,
    detail: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    destructive: true,
    onConfirm: async () => {
      setLoading(true);
      try {
        await api(resource, 'delete', { method: 'POST', data: { id } });
        await refreshAdmin();
        showToast(resource === 'products' ? 'Producto eliminado permanentemente.' : resource === 'orders' ? 'Pedido eliminado permanentemente.' : 'Elemento eliminado.');
      } catch (error) {
        showToast(error?.message || 'No fue posible eliminar el elemento.', 'error');
      } finally {
        setLoading(false);
      }
    },
  });
}

async function changeOrderStatus(id, action) {
  const order = recordFor('orders', id);
  if (!order) {
    showToast('No encontramos ese pedido.', 'error');
    return;
  }
  if (action === 'confirm') {
    advanceShipment(id, 'preparing');
    return;
  }
  const restock = Number(order.stock_applied) === 1;
  requestConfirmation({
    title: '¿Cancelar pedido?',
    message: `Cancelarás el pedido ${orderReference(order)}.`,
    detail: `${restock ? 'Las unidades vuelven al stock automáticamente. ' : ''}El cliente verá el pedido como cancelado y esta acción es definitiva.`,
    confirmLabel: 'Cancelar pedido',
    destructive: true,
    onConfirm: async () => {
      setLoading(true);
      try {
        await saveShipment(id, { status: 'cancelled' }, 'Pedido cancelado');
      } catch (error) {
        showToast(error?.message || 'No fue posible cancelar el pedido.', 'error');
      } finally {
        setLoading(false);
      }
    },
  });
}

async function moderateReview(id, status) {
  const review = recordFor('reviews', id);
  if (!review) return;
  setLoading(true);
  try {
    await api('reviews', 'save', { method: 'POST', data: { id, data: { ...review, status } } });
    await refreshAdmin();
    showToast(status === 'approved' ? 'Reseña aprobada.' : 'Reseña actualizada.');
  } catch (error) {
    showToast(error?.message || 'No fue posible moderar la reseña.', 'error');
  } finally {
    setLoading(false);
  }
}

async function logout() {
  setLoading(true);
  try {
    await api('auth', 'logout', { method: 'POST', data: {} });
  } catch (error) {
    showToast(error?.message || 'No fue posible cerrar la sesión.', 'error');
    setLoading(false);
    return;
  }
  state.user = null;
  state.csrf = '';
  state.data = emptyData();
  state.activeView = 'dashboard';
  closeModal(true);
  await renderBrandedLogin();
  setLoading(false);
}

function navigate(view) {
  const available = NAVIGATION.flatMap((section) => section.items.map((item) => item.id));
  if (!available.includes(view)) return;
  state.activeView = view;
  state.sidebarOpen = false;
  if (window.location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  renderApp();
  document.querySelector('#admin-page')?.focus({ preventScroll: true });
}

function addVariant() {
  const list = modalRoot.querySelector('#variant-list');
  if (!list) return;
  list.querySelector('[data-variant-empty]')?.remove();
  list.insertAdjacentHTML('beforeend', variantRow({}, list.querySelectorAll('[data-variant-row]').length));
}

function removeVariant(button) {
  const row = button.closest('[data-variant-row]');
  const list = button.closest('#variant-list');
  row?.remove();
  if (list && !list.querySelector('[data-variant-row]')) list.innerHTML = variantRows([]);
}

async function uploadImage(input) {
  const files = [...(input.files || [])];
  if (!files.length) return;
  const targetName = input.dataset.uploadTarget;
  const kind = input.dataset.uploadKind || 'media';
  const target = input.closest('form')?.querySelector(`[name="${CSS.escape(targetName)}"]`);
  const preview = input.closest('.field')?.querySelector(`[data-upload-preview="${CSS.escape(targetName)}"]`)
    || document.querySelector(`[data-upload-preview="${CSS.escape(targetName)}"]`);
  if (!target) return;
  input.disabled = true;
  try {
    const uploaded = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', await prepareUploadImage(file, kind));
      formData.append('kind', kind);
      uploaded.push(await api('upload', 'save', { method: 'POST', formData }));
    }
    const ids = input.dataset.uploadMultiple === 'true'
      ? [...new Set(`${target.value || ''},${uploaded.map((file) => file.id).join(',')}`.split(',').filter(Boolean))]
      : [String(uploaded[0].id)];
    target.value = ids.join(',');
    const last = uploaded[uploaded.length - 1];
    if (preview && last?.url) preview.innerHTML = `<img class="image-upload__preview" src="${escapeHTML(safeUrl(last.url))}" alt="Vista previa">`;
    showToast(files.length > 1 ? `${files.length} imágenes subidas.` : 'Imagen subida.');
  } catch (error) {
    showToast(error?.message || 'No fue posible subir la imagen.', 'error');
  } finally {
    input.value = '';
    input.disabled = false;
  }
}

function refreshProductResults() {
  const current = document.getElementById('products-results');
  if (!current) return;
  current.outerHTML = productResultsMarkup();
  const count = document.getElementById('products-result-count');
  if (count) count.textContent = productResultsCount();
}

function applyProductFilter(input) {
  state.productList.query = input.value;
  state.productList.page = 1;
  refreshProductResults();
}

function applyProductCategoryFilter(select) {
  state.productList.categoryId = select.value;
  state.productList.page = 1;
  refreshProductResults();
}

function setProductListPage(value) {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return;
  state.productList.page = Math.trunc(page);
  refreshProductResults();
}

function togglePasswordVisibility(button) {
  const input = document.getElementById(button.dataset.passwordTarget || '');
  if (!(input instanceof HTMLInputElement)) return;
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  button.setAttribute('aria-pressed', reveal ? 'true' : 'false');
  button.setAttribute('aria-label', reveal ? 'Ocultar contraseña' : 'Mostrar contraseña');
  button.setAttribute('title', reveal ? 'Ocultar contraseña' : 'Mostrar contraseña');
  button.innerHTML = icon(reveal ? 'eyeOff' : 'eye');
}

function updateCampaignTarget(select) {
  const holder = modalRoot.querySelector('#campaign-target-holder');
  if (holder) holder.innerHTML = campaignTargetField(select.value, '');
}

function actionHandler(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'logout') return logout();
  if (action === 'toggle-password-visibility') return togglePasswordVisibility(button);
  if (action === 'confirm-pending-action') return confirmPendingAction();
  if (action === 'view-order') return openOrderDetails(id);
  if (action === 'confirm-order') return changeOrderStatus(id, 'confirm');
  if (action === 'cancel-order') return changeOrderStatus(id, 'cancel');
  if (action === 'manage-shipment') return openShipmentEditor(id);
  if (action === 'advance-shipment') return advanceShipment(id, button.dataset.shipmentStatus || '');
  if (action === 'order-filter') return applyOrderFilter(button.dataset.filter || 'all');
  if (action === 'copy-text') return copyText(button.dataset.copy || '');
  if (action === 'products-page') return setProductListPage(button.dataset.page);
  if (action === 'toggle-sidebar') {
    state.sidebarOpen = !state.sidebarOpen;
    document.querySelector('.admin-sidebar')?.classList.toggle('is-open', state.sidebarOpen);
    return;
  }
  if (action === 'close-modal') return closeModal();
  if (action === 'add-variant') return addVariant();
  if (action === 'remove-variant') return removeVariant(button);
  if (action === 'moderate-review') return moderateReview(id, button.dataset.status || 'approved');
  const editors = {
    'new-product': () => openProductForm(), 'edit-product': () => openProductForm(id),
    'new-category': () => openCategoryForm(), 'edit-category': () => openCategoryForm(id),
    'new-banner': () => openBannerForm(), 'edit-banner': () => openBannerForm(id),
    'new-campaign': () => openCampaignForm(), 'edit-campaign': () => openCampaignForm(id),
    'new-notice': () => openNoticeForm(), 'edit-notice': () => openNoticeForm(id),
    'new-trust-card': () => openTrustCardForm(), 'edit-trust-card': () => openTrustCardForm(id),
    'new-review': () => openReviewForm(), 'edit-review': () => openReviewForm(id),
  };
  if (editors[action]) return editors[action]();
  if (action?.startsWith('delete-')) return removeResource(action.slice('delete-'.length), id);
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    navigate(nav.dataset.nav);
    return;
  }
  const action = event.target.closest('[data-action]');
  if (action) actionHandler(action);
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id === 'login-form') {
    event.preventDefault();
    submitLogin(form);
    return;
  }
  if (form.id === 'settings-form') {
    event.preventDefault();
    submitSettings(form);
    return;
  }
  if (form.id === 'account-form') {
    event.preventDefault();
    submitAccount(form);
    return;
  }
  if (form.id === 'shipment-form') {
    event.preventDefault();
    submitShipment(form);
    return;
  }
  if (form.dataset.form) {
    event.preventDefault();
    submitEditor(form);
  }
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
  if (input.matches('[data-slug-source]')) {
    const slug = input.closest('form')?.querySelector(`[name="${CSS.escape(input.dataset.slugSource)}"]`);
    if (slug && !slug.dataset.manual) slug.value = slugify(input.value);
  }
  if (input.matches('[name="slug"]')) input.dataset.manual = input.value ? 'true' : '';
  if (input.matches('[data-filter="products"]')) applyProductFilter(input);
  if (input.matches('[data-filter="orders"]')) applyOrderSearch(input);
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  if (target.matches('[data-upload-target]') && target instanceof HTMLInputElement) uploadImage(target);
  if (target.matches('[data-campaign-target-type]')) updateCampaignTarget(target);
  if (target.matches('[data-product-category-filter]')) applyProductCategoryFilter(target);
  if (target.matches('[data-shipment-status-select]')) updateShipmentEditorHints();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalRoot.innerHTML) closeModal();
});

async function start() {
  const requestedView = window.location.hash.replace('#', '');
  if (NAVIGATION.flatMap((section) => section.items.map((item) => item.id)).includes(requestedView)) state.activeView = requestedView;
  try {
    const session = await api('auth', 'session', { csrf: false });
    if (!session.user) {
      await renderBrandedLogin();
      return;
    }
    state.user = session.user;
    state.csrf = session.csrf_token;
    await loadAdmin();
  } catch (error) {
    await renderBrandedLogin('No se pudo iniciar la administración. Verifica la configuración de la base de datos.');
  }
}

start();
