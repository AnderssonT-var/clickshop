import { api } from './api.js?v=2';

const app = document.querySelector('#store-app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const CART_KEY = 'lumina-production-cart-v1';
// Keep the direct PHP entry point so the project also works with `php -S` in
// local development. Apache additionally exposes the clean `/tienda` route.
const STORE_PATH = 'tienda.php';

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('has-reveal');
}

const state = {
  data: null,
  category: 'all',
  query: '',
  sort: 'featured',
  catalogPage: 0,
  cart: readCart(),
  selectedBanner: 0,
  reviewFilter: 'all',
};

function isCatalogView() {
  return document.body.dataset.storeView === 'catalog';
}

function isTrackingView() {
  return document.body.dataset.storeView === 'tracking';
}

function isHomeView() {
  return !isCatalogView() && !isTrackingView();
}

function storeHref(category = '') {
  const normalizedCategory = String(category || '').trim();
  return normalizedCategory && normalizedCategory !== 'all'
    ? `${STORE_PATH}?categoria=${encodeURIComponent(normalizedCategory)}`
    : STORE_PATH;
}

function trackingHref(guide = '') {
  const value = String(guide || '').trim();
  return value ? `seguimiento.php?guia=${encodeURIComponent(value)}` : 'seguimiento.php';
}

// wa.me needs the international number without the national trunk "0":
// 0991234567 and 5930991234567 both become 593991234567.
function whatsappDigits(value = state.data?.settings?.whatsapp_number) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^5930\d{8,9}$/.test(digits)) return `593${digits.slice(4)}`;
  if (/^0\d{8,9}$/.test(digits)) return `593${digits.slice(1)}`;
  return digits;
}

function whatsappHref(text = '') {
  const number = whatsappDigits();
  if (!number) return '';
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function productShareUrl(product) {
  const url = new URL(STORE_PATH, window.location.href);
  url.searchParams.set('producto', product.slug || String(product.id));
  return url.href;
}

function homeHref(fragment = '#inicio') {
  return isHomeView() ? fragment : `index.php${fragment}`;
}

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((line) => Number.isInteger(Number(line.product_id)) && Number(line.quantity) > 0) : [];
  } catch {
    return [];
  }
}

const MY_ORDERS_KEY = 'clickshop-my-orders-v1';
const CUSTOMER_KEY = 'clickshop-customer-v1';
const EC_CITIES = ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Manta', 'Portoviejo', 'Ambato', 'Riobamba', 'Loja', 'Ibarra', 'Esmeraldas', 'Quevedo', 'Latacunga', 'Milagro', 'Babahoyo', 'Durán', 'Salinas', 'Tulcán', 'Puyo'];

// "Mis pedidos": guides of orders placed from this device. No account needed —
// the guide itself is the key, exactly like a courier tracking number.
function readMyOrders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.code === 'string').slice(0, 12) : [];
  } catch {
    return [];
  }
}

function writeMyOrders(list) {
  try { localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(list.slice(0, 12))); } catch { /* storage unavailable */ }
}

function rememberOrder(entry) {
  const code = String(entry.code || '').trim().toUpperCase();
  if (!code) return;
  writeMyOrders([{ ...entry, code }, ...readMyOrders().filter((item) => item.code !== code)]);
}

function forgetOrder(code) {
  writeMyOrders(readMyOrders().filter((item) => item.code !== code));
}

function readCustomer() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function cleanUrl(value = '') {
  const stringValue = String(value).trim();
  if (/^https:\/\//i.test(stringValue)) return stringValue;
  if (stringValue === '#catalogo' || /^(?:\.?\/)?tienda(?:\.php)?\/?$/i.test(stringValue)) return storeHref();
  if (stringValue.startsWith('#')) return isHomeView() ? stringValue : `index.php${stringValue}`;
  if (/^(?:\.?\/)?index\.php(?:#.*)?$/i.test(stringValue)) return stringValue;
  return storeHref();
}

function currency(value) {
  const settings = state.data?.settings || {};
  try {
    return new Intl.NumberFormat(settings.locale || 'es-EC', { style: 'currency', currency: settings.currency || 'USD', maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return `$${Number(value || 0).toFixed(2)}`;
  }
}

function isActive(record) {
  if (!record.starts_at && !record.ends_at) return true;
  const today = new Date().toISOString().slice(0, 10);
  return (!record.starts_at || record.starts_at.slice(0, 10) <= today) && (!record.ends_at || record.ends_at.slice(0, 10) >= today);
}

function campaignAppliesToProduct(campaign, product) {
  const target = campaign.target_type || 'all';
  return target === 'all'
    || (target === 'product' && Number(campaign.target_id) === Number(product.id))
    || (target === 'category' && Number(campaign.target_id) === Number(product.category_id));
}

function activeProductCampaigns(product) {
  return (state.data?.campaigns || []).filter((campaign) => (
    isActive(campaign) && Number(campaign.discount_percent) > 0 && campaignAppliesToProduct(campaign, product)
  ));
}

function productPrice(product) {
  const regular = Number(product.regular_price || 0);
  let current = product.sale_price !== null && product.sale_price !== '' && Number(product.sale_price) < regular ? Number(product.sale_price) : regular;
  activeProductCampaigns(product).forEach((campaign) => {
    current = Math.min(current, regular * (1 - Number(campaign.discount_percent) / 100));
  });
  return { regular, current: Math.round(current * 100) / 100 };
}

function productById(id) {
  return (state.data?.products || []).find((product) => Number(product.id) === Number(id));
}

function productIsAvailable(product) {
  // The public endpoint only returns active products, while an admin payload
  // may include an explicit status. Support both shapes so cart lines remain
  // valid in local and production environments.
  return Boolean(product) && Number(product.stock) > 0 && (!product.status || product.status === 'active');
}

function productVariants(product) {
  return Array.isArray(product?.variants)
    ? product.variants.filter((variant) => Number.isInteger(Number(variant?.id)) && Number(variant.id) > 0)
    : [];
}

function defaultDetailVariantIds(product) {
  const variants = productVariants(product);
  if (!variants.length) return [];
  const preferred = variants.find((variant) => Number(variant.stock) > 0) || variants[0];
  return preferred ? [Number(preferred.id)] : [];
}

function selectedVariantDetails(product, variantIds = []) {
  const variants = productVariants(product);
  const requested = [...new Set((variantIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  // The public detail uses one select. Keeping one id here also cleans up any
  // cart line that was created with the older multi-radio detail interface.
  const selected = requested.length
    ? variants.filter((variant) => Number(variant.id) === requested[0]).slice(0, 1)
    : [];
  const baseStock = Math.max(0, Number(product?.stock) || 0);
  const variantStocks = selected.map((variant) => Math.max(0, Number(variant.stock) || 0));
  return {
    variants: selected,
    ids: selected.map((variant) => Number(variant.id)),
    delta: selected.reduce((sum, variant) => sum + Number(variant.price_delta || 0), 0),
    stock: Math.min(baseStock, ...(variantStocks.length ? variantStocks : [baseStock])),
  };
}

function productCanPurchase(product) {
  if (!productIsAvailable(product)) return false;
  const variants = productVariants(product);
  return !variants.length || variants.some((variant) => Number(variant.stock) > 0);
}

function availabilityLabel(stock) {
  const units = Math.max(0, Number(stock) || 0);
  return units === 1 ? '1 unidad disponible' : `${units} unidades disponibles`;
}

function cartLineKey(productId, variantIds = []) {
  return `${productId}:${[...variantIds].map(Number).sort((a, b) => a - b).join(',')}`;
}

function cartDetails() {
  return state.cart.map((line) => {
    const product = productById(line.product_id);
    if (!product) return null;
    const selection = selectedVariantDetails(product, line.variant_ids || []);
    const selected = selection.variants;
    const price = productPrice(product);
    return { ...line, key: cartLineKey(line.product_id, selection.ids), product, selected, maxStock: selection.stock, unitPrice: price.current + selection.delta, quantity: Math.max(1, Number(line.quantity) || 1) };
  }).filter(Boolean);
}

function cartCount() {
  return cartDetails().reduce((sum, line) => sum + line.quantity, 0);
}

function cartSubtotal() {
  return cartDetails().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

function freeShippingMin() {
  const value = Number(state.data?.settings?.free_shipping_min);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function shippingCost() {
  const settings = state.data?.settings || {};
  if (settings.shipping_enabled === false || settings.shipping_enabled === 0 || settings.shipping_enabled === '0') return 0;
  // Same rule as the server: free from the configured minimum subtotal.
  if (freeShippingMin() && cartSubtotal() >= freeShippingMin()) return 0;
  const fee = Number(settings.shipping_fee);
  // A store created before this option existed should immediately use the
  // requested standard fee, while the administration area can later change
  // it or disable it completely.
  return Number.isFinite(fee) && fee >= 0 ? Math.round(fee * 100) / 100 : 5;
}

function cartTotal() {
  return cartSubtotal() + shippingCost();
}

/** Fee before the free-shipping rule, used to decide whether the progress bar makes sense. */
function shippingCostBase() {
  const settings = state.data?.settings || {};
  if (settings.shipping_enabled === false || settings.shipping_enabled === 0 || settings.shipping_enabled === '0') return 0;
  const fee = Number(settings.shipping_fee);
  return Number.isFinite(fee) && fee >= 0 ? fee : 5;
}

function shippingLabel() {
  const cost = shippingCost();
  return cost > 0 ? currency(cost) : 'Sin costo';
}

function shippingDisclosure(cost = shippingCost()) {
  const normalizedCost = Number(cost);
  return Number.isFinite(normalizedCost) && normalizedCost > 0
    ? `Se cobra ${currency(normalizedCost)} por envío.`
    : (freeShippingMin() && cartSubtotal() >= freeShippingMin() ? `Envío gratis por compras desde ${currency(freeShippingMin())}.` : 'No se cobra envío.');
}

function icon(name, size = 20) {
  const paths = {
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    star: '<path d="m12 3 2.75 5.57L21 9.48l-4.5 4.38 1.06 6.19L12 17.16l-5.56 2.89 1.06-6.19L3 9.48l6.25-.91L12 3Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h3l4 4v2h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    shield: '<path d="M12 3 20 6v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    whatsapp: '<path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01Zm-7.01 15.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.25 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" fill="currentColor" stroke="none"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    chat: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.3-.7L4 20l1.5-4A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    gift: '<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M12 10v10M3 7h18v3H3zM12 7H8.5a2 2 0 1 1 2-3C12 4 12 7 12 7Zm0 0h3.5a2 2 0 1 0-2-3C12 4 12 7 12 7Z"/>',
    box: '<path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"/><path d="M19 15c.3 1.6 1 2.4 2.5 2.7-1.5.3-2.2 1-2.5 2.6-.3-1.6-1-2.3-2.6-2.6 1.6-.3 2.3-1.1 2.6-2.7Z"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    location: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    headset: '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13h3v5H5a1 1 0 0 1-1-1v-4Zm16 0h-3v5h2a1 1 0 0 0 1-1v-4Z"/><path d="M17 18c0 2-2 3-5 3"/>',
    instagram: '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6"/><circle cx="12" cy="12" r="3.6"/><circle cx="17.6" cy="6.6" r=".75" fill="currentColor" stroke="none"/>',
    facebook: '<path d="M14.2 21v-8h2.9l.45-3h-3.35V8.1c0-.87.25-1.46 1.5-1.46H17.7V3.96c-.34-.05-1.47-.14-2.8-.14-2.77 0-4.67 1.69-4.67 4.79V10H7.1v3h3.1v8h4Z" fill="currentColor" stroke="none"/>',
    tiktok: '<path d="M14.5 4c.25 2.38 1.7 3.9 4 4.2v3c-1.46-.08-2.82-.57-4-1.46v5.42a5.15 5.15 0 1 1-4.48-5.1v3.06a2.16 2.16 0 1 0 1.48 2.05V4h3Z" fill="currentColor" stroke="none"/>',
    x: '<path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z" fill="currentColor" stroke="none"/>',
    youtube: '<rect x="3.4" y="6.4" width="17.2" height="11.2" rx="3.1"/><path d="m10.2 9.45 4.5 2.55-4.5 2.55V9.45Z" fill="currentColor" stroke="none"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    phone: '<path d="M6.6 3.5h2.6l1.3 4.2-1.8 1.4a12 12 0 0 0 6.2 6.2l1.4-1.8 4.2 1.3v2.6a2.2 2.2 0 0 1-2.4 2.2A16.8 16.8 0 0 1 4.4 5.9 2.2 2.2 0 0 1 6.6 3.5Z"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7-7-1Z"/><path d="m11 13 9-9"/>',
  };
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.check}</svg>`;
}

function imageMarkup(url, label, className = '') {
  if (url) return `<img class="${className}" src="${escapeAttribute(url)}" alt="${escapeAttribute(label)}" loading="lazy">`;
  const initials = String(label || 'L').split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return `<span class="image-fallback ${className}" aria-label="${escapeAttribute(label)}">${escapeHtml(initials)}</span>`;
}

// The public API can progressively expose a full image gallery.  Until then,
// the original cover image remains a reliable fallback for every product.
function productImages(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const normalized = images.map((image) => {
    const url = typeof image === 'string'
      ? image
      : (image?.url || image?.image_url || image?.media_url || image?.path || image?.src || '');
    if (!url) return null;
    return {
      url: String(url),
      alt: typeof image === 'string' ? product.name : (image.alt || image.image_alt || image.title || product.name),
    };
  }).filter(Boolean);

  if (!normalized.length && product.image_url) normalized.push({ url: product.image_url, alt: product.name });
  return normalized.filter((image, index, list) => list.findIndex((item) => item.url === image.url) === index);
}

function logoMarkup(settings, inverse = false) {
  if (settings.logo_url) return `<img class="brand-logo-image" src="${escapeAttribute(settings.logo_url)}" alt="${escapeAttribute(settings.store_name)}">`;
  const initial = String(settings.store_name || 'T').trim().charAt(0).toUpperCase() || 'T';
  return `<span class="brand-mark${inverse ? ' inverse' : ''}" aria-hidden="true">${escapeHtml(initial)}</span>`;
}

function renderNotice(notices) {
  const notice = (notices || []).find(isActive);
  if (!notice) return '';
  const typeLabels = { info: 'Información', promotion: 'Promoción', warning: 'Aviso', alert: 'Alerta' };
  return `<aside class="announcement ${escapeAttribute(notice.type)}" data-notice="${Number(notice.id)}">
    <div class="container announcement-inner"><span class="announcement-label">${escapeHtml(typeLabels[notice.type] || 'Novedad')}</span><p><strong>${escapeHtml(notice.title)}.</strong> ${escapeHtml(notice.message)}</p>${notice.cta_label ? `<a href="${escapeAttribute(cleanUrl(notice.cta_target))}">${escapeHtml(notice.cta_label)} ${icon('arrow', 14)}</a>` : ''}${notice.dismissible ? `<button class="announcement-close" type="button" data-action="dismiss-notice" aria-label="Cerrar aviso">${icon('close', 15)}</button>` : ''}</div>
  </aside>`;
}

function renderHeader(settings) {
  const catalogView = isCatalogView();
  const trackingView = isTrackingView();
  return `<header id="site-header" class="site-header">
    <div class="container header-inner">
      <a class="brand brand--stacked" href="${homeHref()}" aria-label="Inicio de ${escapeAttribute(settings.store_name)}"><span class="brand-emblem">${logoMarkup(settings)}</span><span class="brand-name">${escapeHtml(settings.store_name)}</span></a>
      <nav class="site-nav" aria-label="Navegación principal"><a class="nav-link${isHomeView() ? ' active' : ''}" href="${homeHref('#inicio')}">Inicio</a><a class="nav-link" href="${homeHref('#colecciones')}">Colecciones</a><a class="nav-link${catalogView ? ' active' : ''}" href="${storeHref()}">Tienda</a><a class="nav-link${trackingView ? ' active' : ''}" href="${trackingHref()}">Rastrear pedido</a><a class="nav-link" href="${homeHref('#resenas')}">Opiniones</a><a class="nav-link" href="#soporte">Soporte</a></nav>
      <div class="nav-actions"><button class="cart-button" type="button" data-action="open-cart" aria-label="Abrir carrito">${icon('bag', 20)}<span id="cart-count" class="cart-count">${cartCount()}</span></button><button class="mobile-menu-toggle" type="button" data-action="toggle-menu" aria-label="Abrir menú" aria-controls="mobile-sheet" aria-expanded="false"><span class="burger" aria-hidden="true"><span></span><span></span></span></button></div>
    </div>
  </header>`;
}

/** Full-screen menu for phones. Lives outside the header so the header's
    backdrop blur can never clip it, and every entry does something real. */
function renderMobileMenu(settings) {
  const categories = state.data?.categories || [];
  const whatsapp = whatsappHref(`Hola ${settings.store_name || ''}, quiero hacer una consulta.`);
  const links = [
    { label: 'Inicio', href: homeHref('#inicio'), hint: 'Destacados y novedades' },
    { label: 'Tienda', href: storeHref(), hint: `${(state.data?.products || []).length} productos` },
    { label: 'Rastrear pedido', href: trackingHref(), hint: 'Consulta tu guía' },
    { label: 'Opiniones', href: homeHref('#resenas'), hint: 'Lo que dicen nuestros clientes' },
    { label: 'Soporte', href: '#soporte', hint: 'Contacto y redes' },
  ];
  const item = (link, index) => `<li style="--i:${index}"><a href="${escapeAttribute(link.href)}" data-menu-link><span><strong>${escapeHtml(link.label)}</strong><small>${escapeHtml(link.hint)}</small></span>${icon('arrow', 18)}</a></li>`;
  const collections = `<li style="--i:1"><details class="sheet-collections"><summary><span><strong>Colecciones</strong><small>${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}</small></span>${icon('plus', 18)}</summary><div class="sheet-collections__grid">${categories.map((category) => `<button type="button" data-action="open-category" data-category="${escapeAttribute(category.slug)}"><span class="sheet-collections__img">${imageMarkup(category.image_url, category.name, '')}</span><span>${escapeHtml(category.name)}</span></button>`).join('')}<button type="button" data-action="open-category" data-category="all"><span class="sheet-collections__img sheet-collections__img--all">${icon('box', 22)}</span><span>Todo el catálogo</span></button></div></details></li>`;
  return `<div id="mobile-sheet" class="mobile-sheet" data-mobile-sheet aria-hidden="true">
    <div class="mobile-sheet__backdrop" data-action="close-menu"></div>
    <nav class="mobile-sheet__panel" aria-label="Menú principal">
      <ul class="mobile-sheet__links">${item(links[0], 0)}${collections}${links.slice(1).map((link, index) => item(link, index + 2)).join('')}</ul>
      <div class="mobile-sheet__foot" style="--i:7"><button class="button button-dark" type="button" data-action="open-cart">${icon('bag', 18)}<span>Ver carrito (<span data-cart-count-mirror>${cartCount()}</span>)</span></button>${whatsapp ? `<a class="button button-whatsapp" href="${escapeAttribute(whatsapp)}" target="_blank" rel="noopener">${icon('whatsapp', 18)} Escríbenos</a>` : ''}</div>
    </nav>
  </div>`;
}

/** Splits a heading into words so each one can animate in with a stagger. */
function animatedWords(text) {
  return String(text || '').split(/\s+/).filter(Boolean)
    .map((word, index) => `<span class="hero-word" style="--i:${index}">${escapeHtml(word)}</span>`).join(' ');
}

/** Without a banner image the hero shows real catalogue products floating in 3D. */
function heroShowcase() {
  const picks = featuredProducts(12).filter((product) => product.image_url).slice(0, 5);
  if (picks.length < 3) return '';
  return `<div class="hero-showcase" data-hero-showcase>${picks.map((product, index) => {
    const price = productPrice(product);
    return `<button type="button" class="hero-card" data-pos="${index}" data-action="view-product" data-id="${Number(product.id)}" aria-label="Ver ${escapeAttribute(product.name)}"><span class="hero-card__image"><img src="${escapeAttribute(product.image_url)}" alt="" loading="${index < 3 ? 'eager' : 'lazy'}"></span><span class="hero-card__info"><span class="hero-card__name">${escapeHtml(product.name)}</span><strong>${currency(price.current)}</strong></span></button>`;
  }).join('')}<span class="hero-chip hero-chip--one">${icon('truck', 15)} Rastrea tu pedido en línea</span><span class="hero-chip hero-chip--two">${icon('chat', 15)} Pide por WhatsApp</span></div>`;
}

/** Hero slides: the admin's banners plus a live "favoritos" slide built from
    the catalogue, so the animated product showcase always has its own place. */
function heroSlides(banners, settings) {
  const slides = banners.length ? banners.slice() : [{ eyebrow: 'Selección en línea', title: settings.store_tagline || 'Tecnología elegida con intención.', body: 'Una experiencia de compra cuidada, clara y directa.', cta_label: 'Ver catálogo', cta_target: storeHref(), theme: 'dark' }];
  const canShowcase = featuredProducts(12).filter((product) => product.image_url).length >= 3;
  if (canShowcase && slides.every((slide) => slide.image_url)) {
    slides.push({ kind: 'showcase', eyebrow: 'Favoritos de la tienda', title: 'Elige tu favorito en segundos.', body: 'Toca cualquier producto para verlo de cerca, agrégalo al carrito y confirma tu pedido por WhatsApp.', cta_label: 'Ver la tienda', cta_target: storeHref(), theme: 'dark' });
  }
  return slides;
}

function renderHero(banners, settings) {
  const slides = heroSlides(banners, settings);
  const index = state.selectedBanner % slides.length;
  const current = slides[index];
  const showcase = current.image_url ? '' : heroShowcase();
  const visual = current.image_url
    ? `<div class="hero-visual hero-visual--image"><div class="hero-image-frame">${imageMarkup(current.image_url, current.title, 'hero-image')}</div><span class="hero-orb orb-one"></span><span class="hero-orb orb-two"></span></div>`
    : (showcase
      ? `<div class="hero-visual hero-visual--showcase">${showcase}</div>`
      : `<div class="hero-visual">${imageMarkup('', current.title, 'hero-image')}<span class="hero-orb orb-one"></span><span class="hero-orb orb-two"></span></div>`);
  const whatsapp = whatsappHref(`Hola ${settings.store_name || ''}, quiero hacer una consulta.`);
  return `<section id="inicio" class="hero-wrap section" aria-label="Destacado">
    <div class="container"><article class="hero hero--animated theme-${escapeAttribute(current.theme || 'dark')}${current.kind === 'showcase' ? ' hero--showcase' : ''}" data-hero data-banner-index="${index}">
      <span class="hero-aurora" aria-hidden="true"></span>
      <div class="hero-copy"><p class="eyebrow hero-in" style="--d:0">${escapeHtml(current.eyebrow || settings.store_name)}</p><h1>${animatedWords(current.title)}</h1><p class="hero-in" style="--d:4">${escapeHtml(current.body || '')}</p><div class="hero-actions hero-in" style="--d:6"><a class="button button-primary button-shine" href="${escapeAttribute(cleanUrl(current.cta_target))}">${escapeHtml(current.cta_label || 'Explorar')} ${icon('arrow', 17)}</a>${whatsapp ? `<a class="button button-quiet" href="${escapeAttribute(whatsapp)}" target="_blank" rel="noopener">${icon('whatsapp', 17)} Escríbenos</a>` : `<button class="button button-quiet" type="button" data-action="scroll-catalog">Comprar ahora</button>`}</div></div>
      ${visual}
    </article>${slides.length > 1 ? `<div class="hero-controls" aria-label="Seleccionar destacado" style="--hero-ms:${BANNER_AUTOPLAY_MS}ms">${slides.map((slide, position) => `<button type="button" class="hero-dot ${position === index ? 'active' : ''}" data-action="select-banner" data-index="${position}" aria-label="Mostrar ${escapeAttribute(slide.title)}"><span></span></button>`).join('')}</div>` : ''}</div>
  </section>`;
}

/* Hero motion: rotating product showcase, banner autoplay and pointer parallax.
   One interval for the whole page; it simply does nothing when the hero is gone. */
const HERO_ROTATE_MS = 3600;
const BANNER_AUTOPLAY_MS = 7000;
let heroTick = 0;
let heroTimer = 0;
function startHeroMotion() {
  if (heroTimer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  heroTimer = window.setInterval(() => {
    if (document.hidden) return;
    heroTick += 1;
    const showcase = document.querySelector('[data-hero-showcase]');
    if (showcase && !showcase.matches(':hover')) {
      const cards = [...showcase.querySelectorAll('.hero-card')];
      cards.forEach((card) => { card.dataset.pos = String((Number(card.dataset.pos) - 1 + cards.length) % cards.length); });
    }
    const slides = state.data ? heroSlides(state.data.banners || [], state.data.settings || {}) : [];
    if (slides.length > 1 && (heroTick * HERO_ROTATE_MS) % BANNER_AUTOPLAY_MS < HERO_ROTATE_MS) {
      const hero = document.querySelector('[data-hero]');
      if (hero && !hero.matches(':hover') && !document.querySelector('.mobile-sheet.is-open')) swapBanner((state.selectedBanner + 1) % slides.length);
    }
  }, HERO_ROTATE_MS);
}

let heroSwapTimer = 0;
function swapBanner(index) {
  state.selectedBanner = index;
  const section = document.getElementById('inicio');
  if (!section || !state.data) return renderStore();
  const replace = () => {
    const current = document.getElementById('inicio');
    if (current) current.outerHTML = renderHero(state.data.banners || [], state.data.settings || {});
  };
  const hero = section.querySelector('[data-hero]');
  window.clearTimeout(heroSwapTimer);
  if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return replace();
  hero.classList.add('is-leaving');
  heroSwapTimer = window.setTimeout(replace, 380);
}

function handleHeroPointer(event) {
  const hero = event.target.closest?.('[data-hero]');
  if (!hero || event.pointerType === 'touch') return;
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
  hero.style.setProperty('--my', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
}

/** Gentle 3D tilt on product cards for mouse users. */
function handleCardTilt(event) {
  if (event.pointerType !== 'mouse') return;
  const card = event.target.closest?.('.product-card');
  document.querySelectorAll('.product-card.is-tilting').forEach((node) => {
    if (node !== card) { node.classList.remove('is-tilting'); node.style.removeProperty('--rx'); node.style.removeProperty('--ry'); }
  });
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.classList.add('is-tilting');
  card.style.setProperty('--ry', `${(((event.clientX - rect.left) / rect.width) - 0.5) * 6}deg`);
  card.style.setProperty('--rx', `${(0.5 - ((event.clientY - rect.top) / rect.height)) * 6}deg`);
}

function renderTrustCards(settings, trustCards) {
  if (!settings.trust_enabled || !trustCards.length) return '';
  return `<section class="trust-section section"><div class="container"><div class="section-heading compact"><div><p class="eyebrow">Una experiencia completa</p><h2>${escapeHtml(settings.trust_title)}</h2>${settings.trust_description ? `<p>${escapeHtml(settings.trust_description)}</p>` : ''}</div></div><div class="trust-grid">${trustCards.map((card, index) => `<article class="trust-card reveal theme-${escapeAttribute(card.theme || 'light')} tone-${escapeAttribute(card.icon_key || 'shield')}" style="--i:${index}"><span class="trust-card__glow" aria-hidden="true"></span><div class="trust-icon">${icon(card.icon_key || 'shield', 24)}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.body)}</p>${card.cta_label ? `<a href="${escapeAttribute(cleanUrl(card.cta_target))}" class="text-link">${escapeHtml(card.cta_label)} ${icon('arrow', 14)}</a>` : ''}</article>`).join('')}</div></div></section>`;
}

const VIEWED_KEY = 'clickshop-viewed-v1';

function readViewed() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

function rememberViewed(productId) {
  try {
    localStorage.setItem(VIEWED_KEY, JSON.stringify([Number(productId), ...readViewed().filter((id) => id !== Number(productId))].slice(0, 12)));
  } catch { /* storage unavailable */ }
}

function renderRecentlyViewed() {
  const products = readViewed().map(productById).filter((product) => product && productIsAvailable(product)).slice(0, 8);
  if (products.length < 2) return '';
  return `<section class="section recent-section"><div class="container"><div class="section-heading"><div><p class="eyebrow">Para retomar</p><h2>Vistos recientemente.</h2></div></div><div class="recent-rail">${products.map((product) => `<button type="button" class="recent-item" data-action="view-product" data-id="${Number(product.id)}"><span class="recent-item__image">${imageMarkup(product.image_url, product.name, '')}</span><span class="recent-item__name">${escapeHtml(product.name)}</span><strong>${currency(productPrice(product).current)}</strong></button>`).join('')}</div></div></section>`;
}

/** Same category first, closest price first — a simple, predictable "related" list. */
function relatedProducts(product, limit = 4) {
  const price = productPrice(product).current;
  return (state.data?.products || [])
    .filter((item) => Number(item.id) !== Number(product.id) && productCanPurchase(item))
    .map((item) => ({ item, score: (item.category_id === product.category_id ? 0 : 1000) + Math.abs(productPrice(item).current - price) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

function renderBenefitStrip(settings) {
  const items = [
    settings.shipping_notice || '',
    'Pide en minutos por WhatsApp',
    'Rastrea tu pedido con tu guía',
    'Atención directa y personalizada',
  ].filter(Boolean);
  const row = items.map((text) => `<span>${icon('check', 15)} ${escapeHtml(text)}</span>`).join('');
  return `<div class="benefit-strip" aria-label="Beneficios"><div class="benefit-strip__track">${row}${row.replace(/<span>/g, '<span aria-hidden="true">')}</div></div>`;
}

function featuredProducts(limit = 8) {
  const products = (state.data?.products || []).filter(productCanPurchase);
  const score = (product) => (product.badge ? 0 : 1) + (productPrice(product).current < productPrice(product).regular ? 0 : 1);
  return products
    .slice()
    .sort((a, b) => score(a) - score(b) || Number(a.sort_order) - Number(b.sort_order))
    .slice(0, limit);
}

function renderFeatured() {
  const products = featuredProducts();
  if (!products.length) return '';
  const total = (state.data?.products || []).length;
  return `<section id="destacados" class="section featured-section"><div class="container"><div class="section-heading"><div><p class="eyebrow">Destacados</p><h2>Productos destacados.</h2></div><a class="text-link" href="${storeHref()}">Ver todo ${icon('arrow', 16)}</a></div><div class="product-grid featured-grid">${products.map(renderProductCard).join('')}</div>${total > products.length ? `<div class="featured-more"><a class="button button-dark" href="${storeHref()}">Ver los ${total} productos ${icon('arrow', 17)}</a></div>` : ''}</div></section>`;
}

const WA_TOPICS = ['Quiero hacer un pedido', 'Consultar un producto', 'Estado de mi envío', 'Precios y promociones'];

function renderWhatsappFab(settings) {
  const href = whatsappHref(`Hola ${settings.store_name || ''}, quiero hacer una consulta.`);
  if (!href) return '';
  const name = escapeHtml(settings.store_name || 'Tienda');
  const avatar = settings.logo_url ? `<img src="${escapeAttribute(settings.logo_url)}" alt="">` : `<span>${escapeHtml(String(settings.store_name || 'T').trim().charAt(0).toUpperCase())}</span>`;
  return `<div class="wa-widget" data-wa-widget>
    <section class="wa-panel" id="wa-panel" role="dialog" aria-modal="false" aria-label="Chat de WhatsApp" hidden>
      <header class="wa-panel__head"><span class="wa-panel__avatar">${avatar}<i aria-hidden="true"></i></span><div><strong>${name}</strong><small>En línea · respondemos en minutos</small></div><button type="button" class="wa-panel__close" data-action="wa-close" aria-label="Cerrar chat">${icon('close', 18)}</button></header>
      <div class="wa-panel__body">
        <div class="wa-bubble"><p>¡Hola! Bienvenido a <b>${name}</b>.</p><p>¿En qué podemos ayudarte hoy?</p><time>${new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</time></div>
        <div class="wa-topics" aria-label="Temas rápidos">${WA_TOPICS.map((topic) => `<button type="button" class="wa-topic" data-action="wa-topic" data-topic="${escapeAttribute(topic)}">${escapeHtml(topic)}</button>`).join('')}</div>
      </div>
      <form class="wa-panel__form" id="wa-form" autocomplete="on">
        <input name="name" type="text" maxlength="60" placeholder="Tu nombre (opcional)" autocomplete="given-name">
        <div class="wa-compose"><textarea name="message" rows="2" maxlength="600" placeholder="Escribe tu mensaje…" required></textarea><button type="submit" class="wa-send" aria-label="Enviar por WhatsApp">${icon('send', 20)}</button></div>
        <p class="wa-note">${icon('whatsapp', 14)} Se abrirá WhatsApp con tu mensaje listo para enviar.</p>
      </form>
    </section>
    <button type="button" class="whatsapp-fab" data-action="wa-toggle" aria-expanded="false" aria-controls="wa-panel" aria-label="Abrir chat de WhatsApp">${icon('whatsapp', 24)}<span>¿Dudas? Escríbenos</span></button>
  </div>`;
}

function setWaChat(open) {
  const widget = document.querySelector('[data-wa-widget]');
  if (!widget) return;
  const panel = widget.querySelector('.wa-panel');
  const toggle = widget.querySelector('.whatsapp-fab');
  if (open) { closeMenu(); panel.hidden = false; requestAnimationFrame(() => widget.classList.add('is-open')); }
  else { widget.classList.remove('is-open'); window.setTimeout(() => { if (!widget.classList.contains('is-open')) panel.hidden = true; }, 260); }
  toggle.setAttribute('aria-expanded', String(open));
  if (open) window.setTimeout(() => widget.querySelector('textarea')?.focus({ preventScroll: true }), 280);
}

function sendWaChat(form) {
  const data = new FormData(form);
  const message = String(data.get('message') || '').trim();
  if (!message) return form.querySelector('textarea')?.focus();
  const who = String(data.get('name') || '').trim();
  const text = `${who ? `Hola, soy ${who}. ` : 'Hola. '}${message}`;
  const href = whatsappHref(text);
  if (href) window.open(href, '_blank', 'noopener');
  form.reset();
  setWaChat(false);
}

function catalogCollage() {
  const picks = (state.data?.products || []).filter((product) => product.image_url).slice(0, 3);
  if (!picks.length) return icon('box', 44);
  return `<span class="catalog-collage">${picks.map((product, index) => `<span class="catalog-collage__item" style="--i:${index}"><img src="${escapeAttribute(product.image_url)}" alt="" loading="lazy"></span>`).join('')}</span>`;
}

function renderCollections(categories) {
  return `<section id="colecciones" class="section collections-section"><div class="container"><div class="section-heading"><div><p class="eyebrow">Explora por intención</p><h2>Elige tu categoría.</h2></div><a class="text-link" href="${storeHref()}">Ver todo ${icon('arrow', 16)}</a></div><div class="collection-grid">${categories.map((category) => `<button type="button" class="collection-card reveal" data-action="open-category" data-category="${escapeAttribute(category.slug)}"><div class="collection-image">${imageMarkup(category.image_url, category.name, 'collection-img')}</div><div><p>${escapeHtml(category.description || 'Productos elegidos para ti')}</p><h3>${escapeHtml(category.name)}</h3><span>Explorar ${icon('arrow', 15)}</span></div></button>`).join('')}<button type="button" class="collection-card collection-card--all reveal" data-action="open-category" data-category="all"><div class="collection-image collection-image--all">${catalogCollage()}</div><div><p>${(state.data?.products || []).length} productos disponibles</p><h3>Todo el catálogo</h3><span>Ver la tienda ${icon('arrow', 15)}</span></div></button></div></div></section>`;
}

const CAMPAIGN_LABELS = { promotion: 'Promoción', sale: 'Rebaja', campaign: 'Campaña', benefit: 'Beneficio' };

function campaignIcon(campaign) {
  const text = `${campaign.title} ${campaign.message}`.toLocaleLowerCase('es');
  if (Number(campaign.discount_percent)) return 'percent';
  if (/env[ií]o/.test(text)) return 'truck';
  if (/regalo|obsequio/.test(text)) return 'gift';
  return 'sparkle';
}

function campaignTalksAboutShipping(campaign) {
  return /env[ií]o\s+gratis|env[ií]o\s+sin\s+costo|free\s+shipping/i.test(`${campaign.title} ${campaign.message}`);
}

/** Live progress towards free shipping, based on what is already in the cart. */
function freeShippingProgressMarkup() {
  const goal = freeShippingMin();
  if (!goal) return '';
  const subtotal = cartSubtotal();
  const ratio = Math.min(1, subtotal / goal);
  const copy = ratio >= 1
    ? `${icon('check', 15)} ¡Tu carrito ya tiene envío gratis!`
    : (subtotal > 0 ? `Te faltan <strong>${currency(goal - subtotal)}</strong> para el envío gratis.` : `Envío gratis desde <strong>${currency(goal)}</strong>. Empieza a llenar tu carrito.`);
  return `<div class="promo-progress${ratio >= 1 ? ' is-complete' : ''}" data-promo-progress><div class="promo-progress__track"><span style="--progress:${(ratio * 100).toFixed(1)}%"></span></div><p>${copy}</p></div>`;
}

function refreshPromoProgress() {
  document.querySelectorAll('[data-promo-progress]').forEach((node) => {
    const holder = document.createElement('div');
    holder.innerHTML = freeShippingProgressMarkup();
    const next = holder.firstElementChild;
    if (!next) return;
    // Update in place so the bar glides to its new width.
    node.className = next.className;
    node.querySelector('.promo-progress__track span')?.style.setProperty('--progress', next.querySelector('.promo-progress__track span').style.getPropertyValue('--progress'));
    node.querySelector('p').innerHTML = next.querySelector('p').innerHTML;
  });
}

function campaignCountdown(endsAt) {
  if (!endsAt) return '';
  const end = new Date(String(endsAt).replace(' ', 'T') + 'Z');
  const days = Math.ceil((end - Date.now()) / 86400000);
  if (!Number.isFinite(days) || days < 0) return '';
  return `<span class="promo-chip promo-chip--time">${icon('clock', 14)} ${days <= 1 ? 'Termina hoy' : `Quedan ${days} días`}</span>`;
}

function renderCampaignCard(campaign, index) {
  const discount = Number(campaign.discount_percent) || 0;
  const label = CAMPAIGN_LABELS[campaign.type] || 'Promoción';
  const target = campaign.cta_target ? cleanUrl(campaign.cta_target) : storeHref();
  const art = discount
    ? `<span class="promo-card__big">-${Math.round(discount)}<small>%</small></span>`
    : `<span class="promo-card__icon">${icon(campaignIcon(campaign), 54)}</span>`;
  return `<article class="promo-card reveal theme-${escapeAttribute(campaign.theme || 'blue')}" style="--i:${index}">
    <div class="promo-card__art" aria-hidden="true"><span class="promo-ring promo-ring--1"></span><span class="promo-ring promo-ring--2"></span><span class="promo-ring promo-ring--3"></span>${art}</div>
    <div class="promo-card__body">
      <div class="promo-card__chips"><span class="promo-chip">${icon(campaignIcon(campaign), 14)} ${escapeHtml(label)}</span>${campaignCountdown(campaign.ends_at)}</div>
      <h3>${escapeHtml(campaign.title)}</h3>
      ${campaign.message ? `<p>${escapeHtml(campaign.message)}</p>` : ''}
      ${campaignTalksAboutShipping(campaign) ? freeShippingProgressMarkup() : ''}
      <div class="promo-card__actions"><a class="button button-promo" href="${escapeAttribute(target)}">${escapeHtml(campaign.cta_label || 'Ver productos')} ${icon('arrow', 16)}</a>${campaign.code ? `<button type="button" class="promo-code" data-action="copy-code" data-code="${escapeAttribute(campaign.code)}" aria-label="Copiar código ${escapeAttribute(campaign.code)}"><span>Código</span><strong>${escapeHtml(campaign.code)}</strong>${icon('copy', 15)}</button>` : ''}</div>
    </div>
  </article>`;
}

function renderCampaigns(campaigns) {
  const active = campaigns.filter(isActive);
  if (!active.length) return '';
  return `<section id="promociones" class="section promo-section"><div class="container"><div class="section-heading"><div><p class="eyebrow">Oportunidades activas</p><h2>Más valor, sin complicaciones.</h2></div></div><div class="promo-grid${active.length === 1 ? ' is-single' : ''}">${active.map(renderCampaignCard).join('')}</div></div></section>`;
}

function renderProductCard(product) {
  const price = productPrice(product);
  const isOut = !productCanPurchase(product);
  const hasVariants = productVariants(product).length > 0;
  const stockClass = isOut ? 'out' : (Number(product.stock) <= Number(product.low_stock_threshold || 0) ? 'low' : '');
  const stockCopy = isOut ? (hasVariants && productIsAvailable(product) ? 'Sin variantes disponibles' : 'Sin stock') : (stockClass === 'low' ? `Últimas ${product.stock} unidades` : 'Disponible');
  return `<article class="product-card reveal" data-product-card="${Number(product.id)}"><button class="product-image-wrap" type="button" data-action="view-product" data-id="${Number(product.id)}" aria-label="Ver ${escapeAttribute(product.name)}">${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}${price.current < price.regular ? `<span class="product-discount">-${Math.round((1 - price.current / price.regular) * 100)}%</span>` : ''}${imageMarkup(product.image_url, product.name, 'product-image')}</button><div class="product-card-body"><p class="product-category">${escapeHtml(product.category_name || '')}</p><h3><button type="button" data-action="view-product" data-id="${Number(product.id)}">${escapeHtml(product.name)}</button></h3>${Number(product.review_count) ? `<p class="product-rating" aria-label="${Number(product.rating_average).toFixed(1)} de 5 en ${Number(product.review_count)} opiniones">${starMeter(product.rating_average, 13)}<span>${Number(product.rating_average).toFixed(1)} (${Number(product.review_count)})</span></p>` : ''}<p class="product-short">${escapeHtml(product.short_description || '')}</p><div class="price-row"><span class="price">${currency(price.current)}</span>${price.current < price.regular ? `<span class="price-original">${currency(price.regular)}</span>` : ''}</div><div class="product-card-actions"><span class="stock-line ${stockClass}">${stockCopy}</span><button class="button button-dark button-small" type="button" data-action="quick-add" data-id="${Number(product.id)}" ${isOut ? 'disabled' : ''}>${isOut ? 'Agotado' : (hasVariants ? 'Elegir' : 'Agregar')}</button></div></div></article>`;
}

function filteredProducts() {
  // Accent-insensitive: "audifonos" also finds "Audífonos".
  const fold = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const query = fold(state.query.trim());
  const category = state.category;
  const products = (state.data?.products || []).filter((product) => {
    const withinCategory = category === 'all' || product.category_slug === category;
    const haystack = `${product.name} ${product.short_description || ''} ${product.category_name || ''} ${product.sku || ''}`;
    return withinCategory && (!query || fold(haystack).includes(query));
  });
  return products.sort((a, b) => {
    if (state.sort === 'price-asc') return productPrice(a).current - productPrice(b).current;
    if (state.sort === 'price-desc') return productPrice(b).current - productPrice(a).current;
    if (state.sort === 'name') return a.name.localeCompare(b.name, 'es');
    return Number(a.sort_order) - Number(b.sort_order);
  });
}

function catalogPageSize() {
  // Keep the catalogue at a maximum of four product rows across breakpoints.
  if (window.matchMedia('(max-width: 780px)').matches) return 8;
  if (window.matchMedia('(max-width: 1020px)').matches) return 12;
  if (window.matchMedia('(max-width: 1280px)').matches) return 16;
  return 20;
}

function catalogPagination(total, page, pageSize) {
  if (total <= pageSize) return '';
  const pageCount = Math.ceil(total / pageSize);
  return `<nav class="catalog-pagination" aria-label="Paginación del catálogo"><p>Mostrando ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total} productos</p><div><button class="button button-secondary button-small" type="button" data-action="catalog-page" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>Anterior</button><span aria-current="page">${page + 1} / ${pageCount}</span><button class="button button-secondary button-small" type="button" data-action="catalog-page" data-page="${page + 1}" ${page >= pageCount - 1 ? 'disabled' : ''}>Siguiente</button></div></nav>`;
}

function renderCatalog(categories) {
  const products = filteredProducts();
  const pageSize = catalogPageSize();
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const page = Math.min(Math.max(0, state.catalogPage), pageCount - 1);
  state.catalogPage = page;
  const visibleProducts = products.slice(page * pageSize, (page + 1) * pageSize);
  const catalogHeading = isCatalogView() ? `<header class="catalog-page-heading"><p class="eyebrow">Tienda</p><h1>Productos para tu día a día.</h1></header>` : '';
  return `<section id="catalogo" class="section catalog-section${isCatalogView() ? ' catalog-page' : ''}"><div class="container">${catalogHeading}<div class="catalog-toolbar"><div class="category-pills" aria-label="Filtrar por categoría"><button type="button" class="pill ${state.category === 'all' ? 'active' : ''}" data-action="filter-category" data-category="all">Todo</button>${categories.map((category) => `<button type="button" class="pill ${state.category === category.slug ? 'active' : ''}" data-action="filter-category" data-category="${escapeAttribute(category.slug)}">${escapeHtml(category.name)}</button>`).join('')}</div><div class="catalog-actions"><label class="search-field"><span class="sr-only">Buscar</span><input id="catalog-search" class="input" type="search" value="${escapeAttribute(state.query)}" placeholder="Buscar productos"></label><select id="catalog-sort" class="select" aria-label="Ordenar catálogo"><option value="featured" ${state.sort === 'featured' ? 'selected' : ''}>Destacados</option><option value="price-asc" ${state.sort === 'price-asc' ? 'selected' : ''}>Menor precio</option><option value="price-desc" ${state.sort === 'price-desc' ? 'selected' : ''}>Mayor precio</option><option value="name" ${state.sort === 'name' ? 'selected' : ''}>Nombre</option></select></div></div><div class="product-grid">${products.length ? visibleProducts.map(renderProductCard).join('') : `<div class="empty-state"><h3>No encontramos productos.</h3><p>Prueba con otra categoría o búsqueda.</p><button type="button" class="button button-secondary" data-action="reset-filters">Ver catálogo completo</button></div>`}</div>${products.length ? catalogPagination(products.length, page, pageSize) : ''}</div></section>`;
}

/** Stars that fill fractionally (4.6 shows four and a half stars). */
function starMeter(rating, size = 18) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const row = Array.from({ length: 5 }, () => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.83 5.73 6.33.92-4.58 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3-4.58-4.46 6.33-.92L12 2.8Z"/></svg>`).join('');
  return `<span class="star-meter" style="--fill:${(value / 5 * 100).toFixed(1)}%"><span class="star-meter__base">${row}</span><span class="star-meter__fill">${row}</span></span>`;
}

function reviewDate(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date) / 86400000);
  if (days < 1) return 'Hoy';
  if (days < 2) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function reviewAvatar(name) {
  const text = String(name || 'Cliente').trim();
  let hash = 0;
  for (const character of text) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return `<span class="review-avatar" style="--hue:${hash}">${escapeHtml(text.charAt(0).toUpperCase() || 'C')}</span>`;
}

function renderReviewCard(review) {
  const product = review.product_id ? productById(Number(review.product_id)) : null;
  const productChip = product
    ? `<button type="button" class="review-product" data-action="view-product" data-id="${Number(product.id)}"><span class="review-product__img">${imageMarkup(product.image_url, product.name, '')}</span><span><small>Opinión sobre</small>${escapeHtml(product.name)}</span>${icon('arrow', 14)}</button>`
    : `<span class="review-product review-product--store">${icon('shield', 15)}<span><small>Opinión sobre</small>La tienda</span></span>`;
  return `<article class="review-card" data-review-kind="${product ? 'product' : 'store'}">
    <header class="review-card__head">${reviewAvatar(review.author_name)}<div><strong>${escapeHtml(review.author_name)}</strong><span>${icon('check', 13)} Compra verificada · ${escapeHtml(reviewDate(review.published_at))}</span></div></header>
    ${starMeter(review.rating, 16)}
    <h3>${escapeHtml(review.title || 'Una compra recomendable')}</h3>
    <p>${escapeHtml(review.body)}</p>
    ${productChip}
  </article>`;
}

function filteredReviews() {
  const reviews = state.data?.reviews || [];
  if (state.reviewFilter === 'store') return reviews.filter((review) => !review.product_id);
  if (state.reviewFilter === 'products') return reviews.filter((review) => review.product_id);
  return reviews;
}

function renderReviewList() {
  const reviews = filteredReviews();
  if (!reviews.length) return `<div class="review-empty">${icon('chat', 26)}<p>Aún no hay opiniones en esta sección.</p></div>`;
  return `<div id="reviews-carousel" class="review-carousel" data-review-carousel tabindex="0" aria-label="Reseñas de clientes">${reviews.map(renderReviewCard).join('')}</div>`;
}

function renderReviews(settings, reviews, summary) {
  if (!settings.reviews_enabled) return '';
  const count = Number(summary?.count) || 0;
  const average = Number(summary?.average) || 0;
  const distribution = summary?.distribution || {};
  const bars = [5, 4, 3, 2, 1].map((stars) => {
    const total = Number(distribution[stars] ?? distribution[String(stars)] ?? 0);
    const share = count ? (total / count) * 100 : 0;
    return `<li><span>${stars} ${icon('star', 12)}</span><span class="rating-bar"><span style="--share:${share.toFixed(1)}%"></span></span><span>${total}</span></li>`;
  }).join('');
  const storeCount = Number(summary?.store) || reviews.filter((review) => !review.product_id).length;
  const productCount = Number(summary?.products) || reviews.filter((review) => review.product_id).length;
  const tab = (key, label, total) => `<button type="button" class="review-tab${state.reviewFilter === key ? ' is-active' : ''}" data-action="review-filter" data-filter="${key}" aria-pressed="${state.reviewFilter === key}">${label}<span>${total}</span></button>`;
  const summaryCard = `<aside class="rating-card reveal" aria-label="Calificación promedio">
      <p class="rating-card__label">Calificación general</p>
      <div class="rating-card__score"><strong data-count-to="${average.toFixed(1)}">${count ? average.toFixed(1) : '—'}</strong><span>de 5</span></div>
      ${starMeter(average, 26)}
      <p class="rating-card__count">${count ? `Basado en ${count} ${count === 1 ? 'opinión' : 'opiniones'}` : 'Sé la primera persona en opinar'}</p>
      <ul class="rating-bars">${bars}</ul>
      ${settings.reviews_form_enabled ? `<button class="button button-dark button-full" type="button" data-action="open-review">${icon('star', 17)} Escribir una opinión</button>` : ''}
    </aside>`;
  const controls = `<div class="review-carousel-controls" aria-label="Controles del carrusel"><button class="icon-button" type="button" data-action="review-slide" data-direction="-1" aria-controls="reviews-carousel" aria-label="Ver reseñas anteriores">${icon('arrow', 18)}</button><button class="icon-button" type="button" data-action="review-slide" data-direction="1" aria-controls="reviews-carousel" aria-label="Ver más reseñas">${icon('arrow', 18)}</button></div>`;
  return `<section id="resenas" class="section reviews-section"><div class="container"><div class="section-heading"><div><p class="eyebrow">Opiniones reales</p><h2>La confianza se gana con cada pedido.</h2></div></div>
    <div class="reviews-layout">${summaryCard}<div class="reviews-feed"><div class="reviews-toolbar"><div class="review-tabs" role="group" aria-label="Filtrar opiniones">${tab('all', 'Todas', count || reviews.length)}${tab('store', 'De la tienda', storeCount)}${tab('products', 'De productos', productCount)}</div>${controls}</div><div data-review-list>${renderReviewList()}</div></div></div>
  </div></section>`;
}

/** Product modal: that product's own reviews, with a shortcut to write one. */
function productReviewsMarkup(product) {
  const settings = state.data?.settings || {};
  if (!settings.reviews_enabled) return '';
  const reviews = (state.data?.reviews || []).filter((review) => Number(review.product_id) === Number(product.id));
  const count = Number(product.review_count) || reviews.length;
  const average = Number(product.rating_average) || (reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0);
  return `<section class="detail-reviews" aria-label="Opiniones del producto"><div class="detail-reviews__head"><div><h3>Opiniones</h3>${count ? `<p>${starMeter(average, 15)} <strong>${average.toFixed(1)}</strong> · ${count} ${count === 1 ? 'opinión' : 'opiniones'}</p>` : '<p>Aún no hay opiniones de este producto.</p>'}</div>${settings.reviews_form_enabled ? `<button type="button" class="button button-secondary button-small" data-action="open-review" data-product-id="${Number(product.id)}">Opinar</button>` : ''}</div>${reviews.slice(0, 4).map((review) => `<article class="detail-review">${reviewAvatar(review.author_name)}<div><p class="detail-review__meta"><strong>${escapeHtml(review.author_name)}</strong>${starMeter(review.rating, 13)}</p>${review.title ? `<h4>${escapeHtml(review.title)}</h4>` : ''}<p>${escapeHtml(review.body)}</p></div></article>`).join('')}</section>`;
}

function socialFooterLinks(settings) {
  const networks = [
    ['WhatsApp', whatsappHref(`Hola ${settings.store_name || ''}, quiero hacer una consulta.`), 'whatsapp'],
    ['Instagram', settings.social_instagram, 'instagram'],
    ['Facebook', settings.social_facebook, 'facebook'],
    ['TikTok', settings.social_tiktok, 'tiktok'],
    ['X', settings.social_x, 'x'],
    ['YouTube', settings.social_youtube, 'youtube'],
  ];
  return networks.map(([label, value, iconName]) => {
    const url = String(value || '').trim();
    if (!/^https:\/\//i.test(url)) return '';
    return `<a class="social-link social-link--${iconName}" href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttribute(`${label} (abre en una pestaña nueva)`)}" title="${escapeAttribute(label)}">${icon(iconName, 18)}</a>`;
  }).filter(Boolean).join('');
}

function prettyPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('593')) return `+593 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  return String(value || '');
}

function renderFooter(settings) {
  const socials = socialFooterLinks(settings);
  const name = escapeHtml(settings.store_name);
  const wa = whatsappHref(`Hola ${settings.store_name || ''}, quiero hacer una consulta.`);
  const phone = settings.store_phone ? `<a href="tel:${escapeAttribute(String(settings.store_phone).replace(/[^+\d]/g, ''))}">${icon('phone', 16)}<span>${escapeHtml(prettyPhone(settings.store_phone))}</span></a>` : '';
  const email = settings.store_email ? `<a href="mailto:${escapeAttribute(settings.store_email)}">${icon('mail', 16)}<span>${escapeHtml(settings.store_email)}</span></a>` : '';
  return `<footer id="soporte" class="cs-footer">
    <span class="cs-footer__aurora" aria-hidden="true"></span>
    <div class="container">
      <div class="cs-footer__cta reveal">
        <div class="cs-footer__cta-copy"><p class="cs-footer__eyebrow">${icon('headset', 16)} Atención personalizada</p><h2>¿Tienes dudas? Te ayudamos a elegir.</h2><p>Escríbenos, confirmamos tu pedido y te enviamos la guía para que sigas tu envío en línea.</p></div>
        <div class="cs-footer__cta-actions">${wa ? `<button type="button" class="button button-primary" data-action="wa-open">${icon('whatsapp', 18)} Escríbenos</button>` : ''}<a class="button cs-footer__ghost" href="${trackingHref()}">${icon('truck', 18)} Rastrear pedido</a></div>
      </div>
      <div class="cs-footer__grid">
        <div class="cs-footer__brand"><a class="cs-footer__logo" href="${homeHref()}"><span class="cs-footer__mark">${logoMarkup(settings, true)}</span><span>${name}</span></a><p>${escapeHtml(settings.store_tagline || 'Una forma más simple de comprar.')}</p>${socials ? `<div class="cs-footer__socials" aria-label="Redes sociales">${socials}</div>` : ''}</div>
        <nav class="cs-footer__col" aria-label="Comprar"><h3>Comprar</h3><a href="${storeHref()}">Tienda</a><a href="${homeHref('#colecciones')}">Categorías</a><a href="${homeHref('#destacados')}">Destacados</a><a href="${homeHref('#promociones')}">Promociones</a></nav>
        <nav class="cs-footer__col" aria-label="Ayuda"><h3>Ayuda</h3><a href="${trackingHref()}">Rastrear pedido</a><a href="${homeHref('#resenas')}">Opiniones</a>${wa ? `<button type="button" data-action="wa-open">Chat por WhatsApp</button>` : ''}</nav>
        <div class="cs-footer__col cs-footer__contact"><h3>Contacto</h3>${phone}${email}<span class="cs-footer__hours">${icon('clock', 16)}<span>Respondemos todos los días</span></span></div>
      </div>
      <div class="cs-footer__badges">${[['shield', 'Compra segura'], ['truck', 'Seguimiento en línea'], ['chat', 'Pedido por WhatsApp'], ['check', 'Productos verificados']].map(([ic, label]) => `<span>${icon(ic, 16)}${label}</span>`).join('')}</div>
      <div class="cs-footer__bottom"><span>© ${new Date().getFullYear()} ${name}. Todos los derechos reservados.</span><span class="copyright-credit">Desarrollado por A.T.</span></div>
    </div>
  </footer>`;
}

function formatTrackingDate(value) {
  if (!value) return 'Actualización reciente';
  const date = new Date(String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function trackingStatusClass(status) {
  const normalized = String(status || 'pending').toLowerCase();
  return ` tracking-status--${normalized.replace(/[^a-z_]/g, '')}`;
}

function formatTrackingDay(value) {
  if (!value) return '';
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).slice(0, 10));
  if (!plain) return formatTrackingDate(value);
  return new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])));
}

function trackingStepper(result) {
  const steps = Array.isArray(result.steps) && result.steps.length ? result.steps : [
    { status: 'pending', label: 'Pedido recibido' }, { status: 'preparing', label: 'En preparación' }, { status: 'shipped', label: 'Enviado' }, { status: 'out_for_delivery', label: 'En reparto' }, { status: 'delivered', label: 'Entregado' },
  ];
  const index = Number(result.step_index) || 0;
  const modifier = result.status === 'issue' ? ' is-issue' : result.status === 'cancelled' ? ' is-cancelled' : result.status === 'delivered' ? ' is-delivered' : '';
  const stepIcons = ['check', 'box', 'truck', 'location', 'gift'];
  return `<ol class="track-stepper${modifier}" style="--progress:${steps.length > 1 ? index / (steps.length - 1) : 0}">${steps.map((step, stepIndex) => `<li class="${stepIndex < index ? 'is-done' : stepIndex === index ? 'is-current' : ''}"><span class="track-stepper__dot">${icon(stepIcons[stepIndex] || 'check', 16)}</span><span class="track-stepper__label">${escapeHtml(step.label)}</span></li>`).join('')}</ol>`;
}

function trackingResultMarkup(result) {
  const events = Array.isArray(result.events) ? result.events : [];
  const timeline = events.length ? events : [{ status: result.status, title: result.status_label, detail: result.status_detail || '', occurred_at: result.updated_at }];
  const carrier = result.carrier_name || '';
  const carrierGuide = result.carrier_tracking_code || '';
  const facts = [
    carrier ? `<div><span>Transportadora</span><strong>${escapeHtml(carrier)}</strong></div>` : '',
    carrierGuide ? `<div><span>Guía de ${escapeHtml(carrier || 'la transportadora')}</span><strong class="track-copy-row">${escapeHtml(carrierGuide)}<button type="button" class="track-copy" data-action="copy-guide" data-guide="${escapeAttribute(carrierGuide)}" aria-label="Copiar guía">${icon('copy', 15)}</button></strong></div>` : '',
    result.destination_city ? `<div><span>Destino</span><strong>${escapeHtml(result.destination_city)}</strong></div>` : '',
    result.delivered_at
      ? `<div><span>Entregado</span><strong>${escapeHtml(formatTrackingDate(result.delivered_at))}</strong></div>`
      : (result.estimated_delivery && result.status !== 'cancelled' ? `<div><span>Entrega estimada</span><strong>${escapeHtml(formatTrackingDay(result.estimated_delivery))}</strong></div>` : ''),
    `<div><span>Pedido realizado</span><strong>${escapeHtml(formatTrackingDate(result.ordered_at))}</strong></div>`,
  ].filter(Boolean).join('');
  const help = whatsappHref(`Hola, tengo una consulta sobre mi pedido ${result.order_reference || ''} (guía ${result.tracking_code || ''}).`);
  return `<div class="tracking-result__header"><div><p class="tracking-result__reference">Pedido ${escapeHtml(result.order_reference || '—')} · Guía ${escapeHtml(result.tracking_code || '—')}</p><h3>${escapeHtml(result.status_label || 'Pedido recibido')}</h3><p class="tracking-result__lead">${escapeHtml(result.status_detail || '')}</p></div><span class="tracking-status${trackingStatusClass(result.status)}">${escapeHtml(result.status_label || 'Pedido recibido')}</span></div>
  ${trackingStepper(result)}
  <div class="tracking-summary">${facts}</div>
  ${result.carrier_tracking_url ? `<a class="tracking-courier-link" href="${escapeAttribute(result.carrier_tracking_url)}" target="_blank" rel="noopener noreferrer">${icon('truck', 16)} Rastrear también en ${escapeHtml(carrier)}${carrierGuide ? ' con tu guía' : ''} ${icon('arrow', 15)}</a>` : ''}
  <h4 class="tracking-history-title">Historial</h4>
  <div class="tracking-timeline" aria-label="Historial de seguimiento">${timeline.map((event, index) => `<article class="tracking-event${index === 0 ? ' is-latest' : ''} is-${escapeAttribute(event.status || '')}"><span class="tracking-event__dot" aria-hidden="true"></span><div><p class="tracking-event__title">${escapeHtml(event.title || event.status_label || 'Actualización del pedido')}</p>${event.detail ? `<p class="tracking-event__detail">${escapeHtml(event.detail)}</p>` : ''}<time class="tracking-event__time">${escapeHtml(formatTrackingDate(event.occurred_at))}${event.location ? ` · ${escapeHtml(event.location)}` : ''}</time></div></article>`).join('')}</div>
  ${help ? `<a class="tracking-help" href="${escapeAttribute(help)}" target="_blank" rel="noopener">${icon('whatsapp', 17)} ¿Dudas sobre tu entrega? Escríbenos</a>` : ''}`;
}

function renderTrackingPage() {
  return `<section class="tracking-page"><div class="container tracking-page__inner"><div class="tracking-intro"><p class="eyebrow">Seguimiento de pedido</p><h1>Tu compra, siempre a la vista.</h1><p>Ingresa la guía que recibiste por WhatsApp al hacer tu pedido. También funciona con la guía de la transportadora (Servientrega, Laar y otras).</p><div class="tracking-principles" aria-label="Características del seguimiento"><div>${icon('shield', 20)}<strong>Sin cuentas ni contraseñas</strong></div><div>${icon('clock', 20)}<strong>Estado en tiempo real</strong></div><div>${icon('truck', 20)}<strong>Guía de la tienda o del courier</strong></div></div><section id="my-orders" class="my-orders" aria-live="polite" hidden></section></div><div class="tracking-panel"><header class="tracking-panel__header"><p class="eyebrow">Rastrear pedido</p><h2>¿Dónde está mi pedido?</h2><p>Ejemplo: CS-261008-AB12CD34</p></header><form id="tracking-form" class="tracking-form" novalidate><label class="sr-only" for="tracking-guide">Número de guía</label><input id="tracking-guide" class="input" name="guide" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" minlength="6" maxlength="60" placeholder="Ingresa tu guía" required><button class="button button-primary" type="submit">Rastrear ${icon('arrow', 17)}</button></form><p id="tracking-form-message" class="tracking-form-message" role="status"></p><div id="tracking-result" class="tracking-result" hidden></div></div></div></section>`;
}

async function loadMyOrders() {
  const holder = document.getElementById('my-orders');
  if (!holder) return;
  const saved = readMyOrders();
  if (!saved.length) {
    holder.hidden = true;
    return;
  }
  holder.hidden = false;
  holder.innerHTML = `<h2>Mis pedidos</h2><p class="my-orders__hint">Pedidos hechos desde este dispositivo.</p><div class="my-orders__list">${saved.map((item) => `<div class="my-order is-loading"><span>${escapeHtml(item.reference || item.code)}</span></div>`).join('')}</div>`;
  let live = [];
  try {
    live = await api.myOrders(saved.map((item) => item.code));
  } catch {
    live = [];
  }
  const byCode = new Map(live.map((item) => [String(item.tracking_code).toUpperCase(), item]));
  holder.innerHTML = `<h2>Mis pedidos</h2><p class="my-orders__hint">Pedidos hechos desde este dispositivo. Toca uno para ver su seguimiento.</p><div class="my-orders__list">${saved.map((item) => {
    const status = byCode.get(item.code);
    return `<div class="my-order"><button type="button" class="my-order__open" data-action="track-guide" data-guide="${escapeAttribute(item.code)}"><span class="my-order__ref">${escapeHtml(item.reference || item.code)}</span><span class="my-order__meta">${escapeHtml(item.code)}${item.total ? ` · ${escapeHtml(currency(item.total))}` : ''}</span>${status ? `<span class="tracking-status${trackingStatusClass(status.status)}">${escapeHtml(status.status_label)}</span>` : '<span class="tracking-status">Sin datos</span>'}</button><button type="button" class="my-order__forget" data-action="forget-guide" data-guide="${escapeAttribute(item.code)}" aria-label="Quitar ${escapeAttribute(item.reference || item.code)} de esta lista">${icon('close', 14)}</button></div>`;
  }).join('')}</div>`;
}

function setTrackingMessage(message = '', type = '') {
  const target = document.getElementById('tracking-form-message');
  if (!target) return;
  target.textContent = message;
  target.classList.toggle('error', type === 'error');
}

async function lookupTrackingGuide(guide) {
  const normalized = String(guide || '').trim().toUpperCase();
  const form = document.getElementById('tracking-form');
  const input = document.getElementById('tracking-guide');
  const submit = form?.querySelector('[type="submit"]');
  const result = document.getElementById('tracking-result');
  if (!normalized || normalized.length < 6) {
    setTrackingMessage('Ingresa una guía válida para consultar el pedido.', 'error');
    input?.focus();
    return;
  }
  if (input) input.value = normalized;
  if (submit) {
    submit.disabled = true;
    submit.dataset.original = submit.innerHTML;
    submit.textContent = 'Consultando…';
  }
  setTrackingMessage('');
  if (result) result.hidden = true;
  try {
    const tracking = await api.trackOrder(normalized);
    if (result) {
      result.innerHTML = trackingResultMarkup(tracking);
      result.hidden = false;
      if (window.matchMedia('(max-width: 900px)').matches) result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const url = new URL(window.location.href);
    url.searchParams.set('guia', normalized);
    window.history.replaceState(null, '', url);
  } catch (exception) {
    setTrackingMessage(exception?.message || 'No encontramos un pedido con esa guía. Revisa el código e inténtalo de nuevo.', 'error');
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = submit.dataset.original || `Consultar ${icon('arrow', 17)}`;
    }
  }
}

function renderStore() {
  const { settings, categories, banners, campaigns, notices, trustCards, reviews, reviewSummary } = state.data;
  const catalogView = isCatalogView();
  const trackingView = isTrackingView();
  document.title = trackingView ? `${settings.store_name} — Seguimiento de pedido` : (catalogView ? `${settings.store_name} — Tienda` : (settings.seo_title || `${settings.store_name} — ${settings.store_tagline || 'Tienda en línea'}`));
  const description = document.querySelector('meta[name="description"]');
  if (description && settings.seo_description) description.content = settings.seo_description;
  if (settings.favicon_url) {
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.append(favicon);
    }
    favicon.href = settings.favicon_url;
  }
  const pageContent = trackingView
    ? renderTrackingPage()
    : (catalogView
      ? `${renderCatalog(categories)}${renderRecentlyViewed()}`
      : `${renderHero(banners, settings)}${renderBenefitStrip(settings)}${renderFeatured()}${renderRecentlyViewed()}${renderTrustCards(settings, trustCards)}${categories.length ? renderCollections(categories) : ''}${renderCampaigns(campaigns)}${renderReviews(settings, reviews, reviewSummary)}`);
  window.requestAnimationFrame(setupReveal);
  const menuWasOpen = document.querySelector('.mobile-sheet.is-open');
  app.innerHTML = `<div class="site-shell">${renderNotice(notices)}${renderHeader(settings)}<main id="main">${pageContent}</main>${renderFooter(settings)}</div>${renderMobileMenu(settings)}${renderWhatsappFab(settings)}`;
  if (menuWasOpen) document.body.classList.remove('menu-open');
}

function setModal(content, className = '') {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal ${className}" role="dialog" aria-modal="true" aria-label="Ventana de tienda"><button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar">${icon('close', 20)}</button>${content}</section></div>`;
  document.body.classList.add('modal-open');
  window.requestAnimationFrame(() => {
    modalRoot.querySelector('.modal-backdrop')?.classList.add('is-open');
    modalRoot.querySelector('.modal')?.classList.add('is-open');
  });
  const focusable = modalRoot.querySelector('button, input, select, textarea, a');
  if (focusable) focusable.focus();
}

function closeModal() {
  if (modalRoot.querySelector('[data-product-detail]')) setProductParam(null);
  modalRoot.innerHTML = '';
  document.body.classList.remove('modal-open');
}

function toast(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  toastRoot.append(node);
  window.setTimeout(() => node.remove(), 4200);
}

function detailPriceMarkup(regular, current) {
  return `<span class="price">${currency(current)}</span>${current < regular ? `<span class="price-original">${currency(regular)}</span>` : ''}`;
}

function detailPromotionMarkup(product, regular, current) {
  const saving = Math.max(0, regular - current);
  if (!saving) return '';
  const promotions = activeProductCampaigns(product);
  const campaignName = promotions[0]?.title || (Number(product.sale_price) ? 'Precio especial' : 'Oferta activa');
  const percentage = Math.round((saving / regular) * 100);
  return `<p id="detail-promotion" class="detail-promotion"><strong>${escapeHtml(campaignName)}</strong><span>Ahorras ${currency(saving)}${percentage ? ` (${percentage}%)` : ''}</span></p>`;
}

function detailGalleryMarkup(product) {
  const images = productImages(product);
  const first = images[0] || { url: product.image_url || '', alt: product.name };
  return `<div class="product-detail-gallery"><div id="detail-main-image" class="product-detail-image">${imageMarkup(first.url, first.alt, 'product-image detail-main-image-content')}</div>${images.length > 1 ? `<div class="product-detail-thumbnails" aria-label="Más imágenes de ${escapeAttribute(product.name)}">${images.map((image, index) => `<button class="product-detail-thumbnail${index === 0 ? ' active' : ''}" type="button" data-action="select-detail-image" data-image-url="${escapeAttribute(image.url)}" data-image-alt="${escapeAttribute(image.alt)}" aria-label="Ver imagen ${index + 1} de ${images.length}" aria-pressed="${index === 0 ? 'true' : 'false'}">${imageMarkup(image.url, image.alt, '')}</button>`).join('')}</div>` : ''}</div>`;
}

function variantOptionLabel(variant, includeGroup) {
  const group = String(variant.option_name || '').trim();
  const value = String(variant.option_value || '').trim();
  const base = includeGroup && group && value ? `${group} · ${value}` : (value || group || 'Opción');
  const adjustment = Number(variant.price_delta || 0);
  const price = adjustment ? ` · ${adjustment > 0 ? '+' : ''}${currency(adjustment)}` : '';
  const availability = Number(variant.stock) <= 0 ? ' · Agotado' : '';
  return `${base}${price}${availability}`;
}

function detailVariantSelectMarkup(product, selectedIds) {
  const variants = productVariants(product);
  if (!variants.length) return '';
  const selectedId = Number(selectedIds[0] || 0);
  const showGroup = new Set(variants.map((variant) => String(variant.option_name || '').trim()).filter(Boolean)).size > 1;
  return `<div class="option-group option-group--select"><label for="detail-variant-select">Variante</label><select id="detail-variant-select" class="option-select" data-variant-select aria-label="Seleccionar variante">${variants.map((variant) => `<option value="${Number(variant.id)}" ${Number(variant.id) === selectedId ? 'selected' : ''}>${escapeHtml(variantOptionLabel(variant, showGroup))}</option>`).join('')}</select></div>`;
}

function selectedDetailVariantIds() {
  const select = modalRoot.querySelector('[data-variant-select]');
  return select?.value ? [Number(select.value)] : [];
}

function selectedDetailQuantity() {
  return Number(modalRoot.querySelector('#detail-quantity')?.textContent || 1);
}

function detailAvailabilityCopy(product, selection) {
  if (!productIsAvailable(product)) return 'Este producto está agotado.';
  if (selection.stock <= 0) return 'Esta variante está agotada.';
  return `Disponible · ${selection.stock} ${Number(selection.stock) === 1 ? 'unidad' : 'unidades'}`;
}

function updateDetailPrice() {
  const detail = modalRoot.querySelector('[data-product-detail]');
  const product = productById(Number(detail?.dataset.productId));
  if (!detail || !product) return;
  const selection = selectedVariantDetails(product, selectedDetailVariantIds());
  const basePrice = productPrice(product);
  const regular = basePrice.regular + selection.delta;
  const current = basePrice.current + selection.delta;
  const canBuy = productIsAvailable(product) && selection.stock > 0;
  const price = detail.querySelector('#detail-price');
  if (price) price.innerHTML = detailPriceMarkup(regular, current);
  const promotion = detail.querySelector('#detail-promotion');
  if (promotion) promotion.outerHTML = detailPromotionMarkup(product, regular, current) || '<span id="detail-promotion" class="sr-only"></span>';

  const stockCopy = detailAvailabilityCopy(product, selection);
  const factAvailability = detail.querySelector('#detail-availability');
  if (factAvailability) {
    factAvailability.textContent = canBuy ? availabilityLabel(selection.stock) : 'Agotado';
    factAvailability.classList.toggle('is-out', !canBuy);
  }
  const sku = detail.querySelector('#detail-sku');
  if (sku) sku.textContent = selection.variants[0]?.sku || product.sku || '—';
  const stock = detail.querySelector('#detail-stock');
  if (stock) {
    stock.textContent = stockCopy;
    stock.classList.toggle('out', !canBuy);
  }
  const quantity = detail.querySelector('.quantity[data-max]');
  const quantityValue = detail.querySelector('#detail-quantity');
  const maximum = Math.max(1, Number(selection.stock) || 1);
  if (quantity) quantity.dataset.max = String(maximum);
  if (quantityValue && Number(quantityValue.textContent) > maximum) quantityValue.textContent = String(maximum);
  const addButton = detail.querySelector('[data-action="add-detail"]');
  if (addButton) {
    addButton.disabled = !canBuy;
    addButton.innerHTML = canBuy ? `${icon('bag', 18)} Agregar` : 'Agotado';
  }
  const checkoutButton = detail.querySelector('[data-action="detail-checkout"]');
  if (checkoutButton) checkoutButton.disabled = !canBuy;
}

function openProduct(productId) {
  const product = productById(productId);
  if (!product) return;
  const selectedIds = defaultDetailVariantIds(product);
  const selection = selectedVariantDetails(product, selectedIds);
  const basePrice = productPrice(product);
  const regular = basePrice.regular + selection.delta;
  const current = basePrice.current + selection.delta;
  const canBuy = productIsAvailable(product) && selection.stock > 0;
  const detailDescription = product.long_description || product.short_description || 'Consulta los detalles de este producto directamente por WhatsApp.';
  setModal(`<div class="modal-body product-detail" data-product-detail data-product-id="${Number(product.id)}">${detailGalleryMarkup(product)}<div class="product-detail-info"><div class="product-detail-heading"><div><p class="product-category">${escapeHtml(product.category_name || 'Producto')}</p><h2 class="modal-title">${escapeHtml(product.name)}</h2></div>${product.badge ? `<span class="detail-badge">${escapeHtml(product.badge)}</span>` : ''}</div><p class="product-detail-lead">${escapeHtml(product.short_description || '')}</p><div id="detail-price" class="price-row detail-price">${detailPriceMarkup(regular, current)}</div>${detailPromotionMarkup(product, regular, current)}<dl class="product-facts"><div><dt>SKU</dt><dd id="detail-sku">${escapeHtml(selection.variants[0]?.sku || product.sku || '—')}</dd></div><div><dt>Disponibilidad</dt><dd id="detail-availability" class="${canBuy ? '' : 'is-out'}">${canBuy ? availabilityLabel(selection.stock) : 'Agotado'}</dd></div><div><dt>Categoría</dt><dd>${escapeHtml(product.category_name || 'General')}</dd></div><div><dt>Pedido</dt><dd>Coordinación por WhatsApp</dd></div></dl><details class="product-description"><summary><span>Sobre este producto</span><span class="product-description-toggle"><span class="when-closed">Ver descripción completa</span><span class="when-open">Contraer descripción</span>${icon('arrow', 16)}</span></summary><p class="long-description">${escapeHtml(detailDescription)}</p></details>${detailVariantSelectMarkup(product, selectedIds)}<p id="detail-stock" class="stock-line ${canBuy ? '' : 'out'}">${detailAvailabilityCopy(product, selection)}</p><div class="detail-add-row"><div class="quantity" aria-label="Cantidad" data-max="${Math.max(1, Number(selection.stock) || 1)}"><button type="button" data-action="detail-quantity" data-delta="-1" aria-label="Reducir">${icon('minus', 16)}</button><span id="detail-quantity">1</span><button type="button" data-action="detail-quantity" data-delta="1" aria-label="Aumentar">${icon('plus', 16)}</button></div><button class="button button-dark" type="button" data-action="add-detail" data-id="${Number(product.id)}" ${canBuy ? '' : 'disabled'}>${canBuy ? `${icon('bag', 18)} Agregar` : 'Agotado'}</button></div><button class="button button-secondary button-full detail-whatsapp-button" type="button" data-action="detail-checkout" data-id="${Number(product.id)}" ${canBuy ? '' : 'disabled'}>Pedir por WhatsApp ${icon('whatsapp', 18)}</button><button class="detail-share-button" type="button" data-action="share-product" data-id="${Number(product.id)}">${icon('share', 16)} Compartir producto</button>${productReviewsMarkup(product)}</div></div>`, 'modal-wide');
  setProductParam(product);
  rememberViewed(product.id);
  const related = relatedProducts(product);
  const detail = modalRoot.querySelector('[data-product-detail]');
  if (detail && related.length) {
    detail.insertAdjacentHTML('afterend', `<section class="related-products"><h3>También te puede interesar</h3><div class="related-grid">${related.map((item) => `<button type="button" class="related-item" data-action="view-product" data-id="${Number(item.id)}"><span class="related-item__image">${imageMarkup(item.image_url, item.name, '')}</span><span class="related-item__name">${escapeHtml(item.name)}</span><strong>${currency(productPrice(item).current)}</strong></button>`).join('')}</div></section>`);
  }
}

function setProductParam(product) {
  try {
    const url = new URL(window.location.href);
    if (product) url.searchParams.set('producto', product.slug || String(product.id));
    else url.searchParams.delete('producto');
    window.history.replaceState(null, '', url);
  } catch { /* URL updates are a convenience only. */ }
}

function productFromParam() {
  const value = new URLSearchParams(window.location.search).get('producto');
  if (!value) return null;
  return (state.data?.products || []).find((product) => product.slug === value || String(product.id) === value) || null;
}

async function shareProduct(productId) {
  const product = productById(productId);
  if (!product) return;
  const url = productShareUrl(product);
  const text = `${product.name} — ${currency(productPrice(product).current)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: product.name, text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('Enlace copiado. Pégalo donde quieras compartirlo.');
  } catch (exception) {
    if (exception?.name === 'AbortError') return;
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('Enlace copiado. Pégalo donde quieras compartirlo.');
    } catch {
      toast(`Copia este enlace: ${url}`);
    }
  }
}

function addToCart(productId, variantIds = [], quantity = 1) {
  const product = productById(productId);
  if (!productIsAvailable(product)) {
    toast('Este producto ya no está disponible.', 'error');
    return false;
  }
  const requested = (variantIds || []).map(Number).filter((id) => productVariants(product).some((variant) => Number(variant.id) === id));
  const selectedIds = requested.length ? [requested[0]] : defaultDetailVariantIds(product);
  const selection = selectedVariantDetails(product, selectedIds);
  if (productVariants(product).length && !selection.ids.length) {
    toast('Selecciona una variante antes de agregar el producto.', 'error');
    return false;
  }
  if (selection.stock <= 0) {
    toast('La variante seleccionada está agotada.', 'error');
    return false;
  }
  const key = cartLineKey(productId, selection.ids);
  const existing = state.cart.find((line) => cartLineKey(line.product_id, line.variant_ids || []) === key);
  const requestedQuantity = Math.max(1, Number(quantity) || 1);
  const nextQuantity = (existing ? Number(existing.quantity) : 0) + requestedQuantity;
  if (nextQuantity > selection.stock) {
    toast(`Solo hay ${selection.stock} ${Number(selection.stock) === 1 ? 'unidad disponible' : 'unidades disponibles'} para esta variante.`, 'error');
    return false;
  }
  if (existing) existing.quantity = nextQuantity;
  else state.cart.push({ product_id: Number(productId), variant_ids: selection.ids, quantity: requestedQuantity });
  persistCart();
  flyToCart(productId);
  updateCartCount(true);
  toast(`${product.name} se agregó al carrito.`);
  return true;
}

function updateCartCount(bump = false) {
  const count = document.querySelector('#cart-count');
  if (count) count.textContent = String(cartCount());
  document.querySelectorAll('[data-cart-count-mirror]').forEach((node) => { node.textContent = String(cartCount()); });
  refreshPromoProgress();
  if (bump) {
    const button = document.querySelector('.cart-button');
    button?.classList.remove('is-bumping');
    void button?.offsetWidth; // restart the animation
    button?.classList.add('is-bumping');
  }
}

/** A small copy of the product image flies into the cart icon. */
function flyToCart(productId) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cart = document.querySelector('.cart-button');
  const source = modalRoot.querySelector('#detail-main-image img') || document.querySelector(`[data-product-card="${Number(productId)}"] img`);
  if (!cart || !source) return;
  const from = source.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const ghost = source.cloneNode();
  ghost.className = 'fly-to-cart';
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = ghost.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.6}px, ${dy * 0.35 - 60}px) scale(.45)`, opacity: .9, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .2 },
  ], { duration: 720, easing: 'cubic-bezier(.45, 0, .2, 1)' });
  animation.onfinish = () => ghost.remove();
}

/** Fade sections and cards in as they enter the viewport. */
let revealObserver = null;
let revealedOnce = false;
function setupReveal() {
  const targets = document.querySelectorAll('.reveal:not(.is-visible), .section-heading:not(.is-visible)');
  // Only the first paint animates; re-renders (search, filters, pages) show instantly.
  const instant = revealedOnce;
  revealedOnce = true;
  if (instant || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  revealObserver ||= new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });
  document.documentElement.classList.add('has-reveal');
  targets.forEach((node, index) => {
    node.style.setProperty('--reveal-delay', `${(index % 4) * 60}ms`);
    revealObserver.observe(node);
  });
}

function openCart() {
  const lines = cartDetails();
  const missing = freeShippingMin() ? Math.max(0, freeShippingMin() - cartSubtotal()) : 0;
  const progress = freeShippingMin() ? Math.min(100, (cartSubtotal() / freeShippingMin()) * 100) : 0;
  const freeShippingBar = freeShippingMin() && Number(shippingCostBase()) > 0
    ? `<div class="free-ship"><p>${missing > 0 ? `Te faltan <strong>${currency(missing)}</strong> para el envío gratis.` : '<strong>¡Tienes envío gratis!</strong>'}</p><span class="free-ship__bar"><span style="width:${progress.toFixed(1)}%"></span></span></div>`
    : '';
  const shippingNotice = `${freeShippingBar}<p class="cart-notice cart-shipping-disclosure">${icon('truck', 16)}<span>${shippingDisclosure()}</span></p>`;
  const configuredShippingNotice = state.data.settings.shipping_notice ? `<p class="cart-notice">${escapeHtml(state.data.settings.shipping_notice)}</p>` : '';
  const cartMarkup = lines.length ? `<div class="drawer-backdrop" data-action="close-cart"><aside class="drawer" aria-label="Carrito"><div class="drawer-header"><div><p class="eyebrow">Tu selección</p><h2>Carrito</h2></div><button class="icon-button" type="button" data-action="close-cart" aria-label="Cerrar carrito">${icon('close', 20)}</button></div><div class="cart-lines">${lines.map((line) => `<article class="cart-line"><div class="cart-line-image">${imageMarkup(line.product.image_url, line.product.name, '')}</div><div><h3>${escapeHtml(line.product.name)}</h3>${line.selected.length ? `<p class="cart-line-variant">${escapeHtml(line.selected.map((variant) => variant.option_value).join(' · '))}</p>` : ''}<p class="cart-line-price">${currency(line.unitPrice)}</p><div class="quantity"><button type="button" data-action="cart-quantity" data-key="${escapeAttribute(line.key)}" data-delta="-1" aria-label="Reducir">${icon('minus', 14)}</button><span>${line.quantity}</span><button type="button" data-action="cart-quantity" data-key="${escapeAttribute(line.key)}" data-delta="1" aria-label="Aumentar" ${line.quantity >= line.maxStock ? 'disabled' : ''}>${icon('plus', 14)}</button></div></div><div class="cart-line-side"><strong>${currency(line.unitPrice * line.quantity)}</strong><button class="text-remove" type="button" data-action="cart-remove" data-key="${escapeAttribute(line.key)}">Quitar</button></div></article>`).join('')}</div><div class="cart-summary"><div class="summary-row"><span>Subtotal</span><strong>${currency(cartSubtotal())}</strong></div><div class="summary-row"><span>Envío</span><strong>${shippingLabel()}</strong></div><div class="summary-total"><span>Total</span><strong>${currency(cartTotal())}</strong></div>${shippingNotice}${configuredShippingNotice}<button class="button button-primary button-full" type="button" data-action="checkout">Finalizar por WhatsApp ${icon('arrow', 17)}</button></div></aside></div>` : `<div class="drawer-backdrop" data-action="close-cart"><aside class="drawer empty-drawer"><button class="icon-button drawer-close" type="button" data-action="close-cart" aria-label="Cerrar">${icon('close', 20)}</button>${icon('bag', 32)}<h2>Tu carrito está vacío.</h2><p>Explora el catálogo y guarda aquí los productos que te interesan.</p><button class="button button-dark" type="button" data-action="close-cart">Ver productos</button></aside></div>`;
  modalRoot.innerHTML = cartMarkup;
  document.body.classList.add('modal-open');
  const backdrop = modalRoot.querySelector('.drawer-backdrop');
  const drawer = modalRoot.querySelector('.drawer');
  // Paint the initial position first so the transition remains smooth, then
  // open both layers synchronously. A delayed animation frame can be paused
  // in an inactive browser tab, which used to leave the cart off-screen.
  void backdrop?.offsetWidth;
  backdrop?.classList.add('is-open');
  drawer?.classList.add('is-open');
}

function closeCart() { closeModal(); }

function updateCartLine(key, delta) {
  const line = state.cart.find((item) => cartLineKey(item.product_id, item.variant_ids || []) === key);
  if (!line) return;
  const product = productById(line.product_id);
  const maximum = selectedVariantDetails(product, line.variant_ids || []).stock;
  line.quantity = Math.max(0, Math.min(maximum, Number(line.quantity) + Number(delta)));
  state.cart = state.cart.filter((item) => Number(item.quantity) > 0 && productById(item.product_id));
  persistCart();
  updateCartCount();
  openCart();
}

function removeCartLine(key) {
  state.cart = state.cart.filter((item) => cartLineKey(item.product_id, item.variant_ids || []) !== key);
  persistCart();
  updateCartCount();
  openCart();
}

function openCheckout() {
  if (!cartDetails().length) return openCart();
  const saved = readCustomer();
  const value = (key) => escapeAttribute(saved[key] || '');
  setModal(`<div class="modal-body"><p class="eyebrow">Último paso</p><h2 class="modal-title">Confirma tu pedido.</h2><p class="modal-subtitle">Prepararemos un mensaje completo para WhatsApp y te daremos una guía para rastrear tu pedido. El pago y la entrega se coordinan contigo.</p><form id="checkout-form" class="checkout-fields"><label class="field"><span>Nombre completo *</span><input class="input" name="customer_name" required maxlength="120" autocomplete="name" value="${value('customer_name')}"></label><label class="field"><span>Celular *</span><input class="input" name="customer_phone" type="tel" inputmode="tel" required minlength="7" maxlength="20" autocomplete="tel" placeholder="0991234567" value="${value('customer_phone')}"></label><label class="field"><span>Ciudad *</span><input class="input" name="shipping_city" required maxlength="120" autocomplete="address-level2" list="checkout-cities" placeholder="Ej.: Quito" value="${value('shipping_city')}"><datalist id="checkout-cities">${EC_CITIES.map((city) => `<option value="${escapeAttribute(city)}"></option>`).join('')}</datalist></label><label class="field"><span>Dirección de entrega</span><input class="input" name="shipping_address" maxlength="255" autocomplete="street-address" placeholder="Calle, número y referencia" value="${value('shipping_address')}"></label><label class="field full"><span>Nota para el pedido</span><textarea class="textarea" name="note" maxlength="800" rows="2" placeholder="Ej.: color preferido, horario de entrega…"></textarea></label><div class="checkout-summary-preview"><span>${cartCount()} ${cartCount() === 1 ? 'producto' : 'productos'} · Envío ${shippingLabel()}</span><strong>${currency(cartTotal())}</strong></div><p class="cart-notice cart-shipping-disclosure">${icon('truck', 16)}<span>${shippingDisclosure()}</span></p><p id="checkout-form-error" class="form-message" role="alert"></p><button class="button button-primary button-full" type="submit">Continuar a WhatsApp ${icon('arrow', 17)}</button></form></div>`);
}

async function submitCheckout(form) {
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector('#checkout-form-error');
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  submit.disabled = true;
  submit.textContent = 'Preparando pedido…';
  error.textContent = '';
  try {
    const lines = cartDetails().map((line) => ({ product_id: line.product.id, variant_ids: line.selected.map((variant) => variant.id), quantity: line.quantity }));
    const order = await api.whatsappOrder({ ...values, lines });
    try {
      const { customer_name, customer_phone, shipping_city, shipping_address } = values;
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ customer_name, customer_phone, shipping_city, shipping_address }));
    } catch { /* storage unavailable */ }
    if (order.tracking_code) rememberOrder({ code: order.tracking_code, reference: order.reference, total: order.total, created_at: new Date().toISOString() });
    const whatsapp = whatsappDigits();
    if (!whatsapp) throw new Error('La tienda aún no configuró el número de WhatsApp. Escríbenos por otro canal.');
    const items = cartDetails().map((line) => `• ${line.quantity} × ${line.product.name}${line.selected.length ? ` (${line.selected.map((item) => item.option_value).join(', ')})` : ''} — ${currency(line.unitPrice * line.quantity)}`).join('\n');
    const subtotal = Number(order.subtotal ?? cartSubtotal());
    const shipping = Number(order.shipping ?? shippingCost());
    const trackingCode = String(order.tracking_code || '').trim();
    // Always absolute so WhatsApp turns it into a tappable link.
    const trackingUrl = trackingCode ? new URL(order.tracking_url || trackingHref(trackingCode), window.location.href).href : '';
    const trackingMessage = trackingCode ? `\n\nGuía de seguimiento: ${trackingCode}${trackingUrl ? `\nConsulta el estado: ${trackingUrl}` : ''}` : '';
    const message = `${state.data.settings.whatsapp_message || 'Hola, quiero realizar el siguiente pedido:'}\n\nPedido: ${order.reference}\n${items}\n\nSubtotal: ${currency(subtotal)}\nEnvío: ${shipping > 0 ? currency(shipping) : 'Sin costo'}\nAviso de envío: ${shippingDisclosure(shipping)}\nTotal: ${currency(order.total)}${trackingMessage}\n\nCliente: ${values.customer_name}${values.customer_phone ? `\nTeléfono: ${values.customer_phone}` : ''}${values.shipping_city ? `\nCiudad: ${values.shipping_city}` : ''}${values.shipping_address ? `\nDirección: ${values.shipping_address}` : ''}${values.note ? `\nNota: ${values.note}` : ''}`;
    state.cart = [];
    persistCart();
    updateCartCount();
    closeModal();
    toast(trackingCode ? `Pedido preparado. Tu guía es ${trackingCode}.` : 'Pedido preparado. Se abrió WhatsApp para que lo envíes.');
    const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    // Embedded previews (the online demo) cannot leave the page: show the
    // result with real links instead of redirecting.
    if (window.CLICKSHOP_CHECKOUT_MODE === 'confirm') {
      setModal(`<div class="modal-body order-done"><span class="order-done__icon">${icon('check', 28)}</span><p class="eyebrow">Pedido ${escapeHtml(order.reference)}</p><h2 class="modal-title">¡Pedido creado!</h2><p class="modal-subtitle">En la tienda real se abriría WhatsApp con este mensaje. Tu guía de seguimiento es:</p><p class="order-done__guide">${escapeHtml(trackingCode)}</p><div class="order-done__actions"><a class="button button-primary button-full" href="${escapeAttribute(trackingHref(trackingCode))}">Rastrear mi pedido ${icon('arrow', 17)}</a><a class="button button-secondary button-full" href="${escapeAttribute(whatsappUrl)}" target="_blank" rel="noopener">Abrir mensaje en WhatsApp ${icon('whatsapp', 17)}</a></div></div>`);
      return;
    }
    // Navigate in the same tab so mobile browsers and popup blockers cannot
    // prevent the checkout from reaching WhatsApp after the API request.
    window.setTimeout(() => {
      window.location.assign(whatsappUrl);
    }, 160);
  } catch (exception) {
    error.textContent = exception.message || 'No se pudo preparar el pedido.';
    error.classList.add('error');
    submit.disabled = false;
    submit.innerHTML = `Continuar a WhatsApp ${icon('arrow', 17)}`;
  }
}

function openReview(productId = 0) {
  const options = (state.data.products || []).map((product) => `<option value="${Number(product.id)}"${Number(product.id) === Number(productId) ? ' selected' : ''}>${escapeHtml(product.name)}</option>`).join('');
  const starInput = `<fieldset class="star-input full"><legend>Calificación *</legend><div class="star-input__row">${[5, 4, 3, 2, 1].map((value) => `<input type="radio" id="rating-${value}" name="rating" value="${value}"${value === 5 ? ' checked' : ''} required><label for="rating-${value}" title="${value} de 5">${icon('star', 30)}<span class="sr-only">${value} estrellas</span></label>`).join('')}</div><p class="star-input__hint" data-star-hint>Excelente</p></fieldset>`;
  setModal(`<div class="modal-body"><p class="eyebrow">Tu experiencia</p><h2 class="modal-title">Comparte una reseña.</h2><p class="modal-subtitle">Se revisará antes de aparecer públicamente.</p><form id="review-form" class="form-grid"><label class="field"><span>Nombre *</span><input class="input" name="author_name" required maxlength="120" autocomplete="name"></label><label class="field"><span>Correo (no público)</span><input class="input" type="email" name="author_email" maxlength="190" autocomplete="email"></label><label class="field full"><span>Producto (opcional)</span><select class="select" name="product_id"><option value="">Opinión general de la tienda</option>${options}</select></label>${starInput}<label class="field full"><span>Título</span><input class="input" name="title" maxlength="150" placeholder="¿Qué destacarías?"></label><label class="field full"><span>Tu opinión *</span><textarea class="textarea" name="body" required maxlength="1600" rows="5"></textarea></label><label class="sr-only" aria-hidden="true">Sitio web<input tabindex="-1" name="website" autocomplete="off"></label><p id="review-form-error" class="form-message full" role="alert"></p><button class="button button-dark full" type="submit">Enviar para revisión</button></form></div>`);
}

async function submitReview(form) {
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector('#review-form-error');
  submit.disabled = true;
  error.textContent = '';
  try {
    const result = await api.review(Object.fromEntries(new FormData(form)));
    closeModal();
    toast(result.message || 'Gracias por compartir tu opinión.');
  } catch (exception) {
    error.textContent = exception.message || 'No se pudo enviar la reseña.';
    error.classList.add('error');
    submit.disabled = false;
  }
}

function setMenu(open) {
  const sheet = document.querySelector('[data-mobile-sheet]');
  if (!sheet) return;
  if (open) {
    // Start the panel right under the header (the announcement bar may push it down).
    const header = document.querySelector('#site-header');
    const bottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 64;
    sheet.style.setProperty('--sheet-top', `${Math.round(bottom)}px`);
  }
  sheet.classList.toggle('is-open', open);
  sheet.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('menu-open', open);
  document.querySelector('#site-header')?.classList.toggle('menu-open', open);
  document.querySelectorAll('.mobile-menu-toggle').forEach((button) => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
}

function toggleMenu() {
  setMenu(!document.querySelector('[data-mobile-sheet]')?.classList.contains('is-open'));
}

function closeMenu() {
  setMenu(false);
}

function dismissNotice(button) {
  const announcement = button.closest('.announcement');
  if (announcement) announcement.remove();
}

function scrollToCatalog() {
  if (!isCatalogView()) {
    window.location.assign(storeHref());
    return;
  }
  document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth' });
}

function openCategory(category = 'all') {
  if (!isCatalogView()) {
    window.location.assign(storeHref(category));
    return;
  }
  state.category = category || 'all';
  state.query = '';
  state.catalogPage = 0;
  renderStore();
  scrollToCatalog();
}

function slideReviews(direction) {
  const carousel = document.querySelector('[data-review-carousel]');
  const firstCard = carousel?.querySelector('.review-card');
  if (!carousel || !firstCard) return;
  const styles = window.getComputedStyle(carousel);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
  carousel.scrollBy({ left: (firstCard.getBoundingClientRect().width + gap) * direction, behavior: 'smooth' });
}

function handleClick(event) {
  if (event.target.closest('[data-menu-link]')) closeMenu();
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action } = button.dataset;
  if ((action === 'close-modal' || action === 'close-cart') && (button.classList.contains('modal-backdrop') || button.classList.contains('drawer-backdrop')) && event.target !== button) return;
  if (action === 'open-cart') { closeMenu(); return openCart(); }
  if (action === 'close-cart') return closeCart();
  if (action === 'close-modal') return closeModal();
  if (action === 'toggle-menu') return toggleMenu();
  if (action === 'close-menu') return closeMenu();
  if (action === 'wa-toggle') return setWaChat(!document.querySelector('[data-wa-widget]')?.classList.contains('is-open'));
  if (action === 'wa-open') return setWaChat(true);
  if (action === 'wa-close') return setWaChat(false);
  if (action === 'wa-topic') {
    const area = document.querySelector('#wa-form textarea');
    if (area) { area.value = button.dataset.topic || ''; area.focus(); }
    return;
  }
  if (action === 'review-filter') {
    state.reviewFilter = button.dataset.filter || 'all';
    document.querySelectorAll('.review-tab').forEach((tab) => { const on = tab.dataset.filter === state.reviewFilter; tab.classList.toggle('is-active', on); tab.setAttribute('aria-pressed', String(on)); });
    const list = document.querySelector('[data-review-list]');
    if (list) { list.innerHTML = renderReviewList(); list.classList.remove('is-swapping'); void list.offsetWidth; list.classList.add('is-swapping'); }
    return;
  }
  if (action === 'copy-code') {
    const code = button.dataset.code || '';
    navigator.clipboard?.writeText(code).then(() => toast(`Código ${code} copiado.`), () => window.prompt('Copia el código:', code));
    return;
  }
  if (action === 'dismiss-notice') return dismissNotice(button);
  if (action === 'review-slide') return slideReviews(Number(button.dataset.direction) || 1);
  if (action === 'scroll-catalog') return scrollToCatalog();
  if (action === 'open-category') { closeMenu(); return openCategory(button.dataset.category || 'all'); }
  if (action === 'select-banner') return swapBanner(Number(button.dataset.index) || 0);
  if (action === 'filter-category') { state.category = button.dataset.category || 'all'; state.query = ''; state.catalogPage = 0; renderStore(); return scrollToCatalog(); }
  if (action === 'reset-filters') { state.category = 'all'; state.query = ''; state.sort = 'featured'; state.catalogPage = 0; return renderStore(); }
  if (action === 'catalog-page') { state.catalogPage = Math.max(0, Number(button.dataset.page) || 0); renderStore(); return scrollToCatalog(); }
  if (action === 'view-product') return openProduct(Number(button.dataset.id));
  if (action === 'share-product') return shareProduct(Number(button.dataset.id));
  if (action === 'track-guide') {
    const input = document.getElementById('tracking-guide');
    if (input) input.value = button.dataset.guide || '';
    lookupTrackingGuide(button.dataset.guide || '');
    document.querySelector('.tracking-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (action === 'forget-guide') { forgetOrder(button.dataset.guide || ''); return loadMyOrders(); }
  if (action === 'copy-guide') {
    navigator.clipboard?.writeText(button.dataset.guide || '').then(() => toast('Guía copiada.'), () => window.prompt('Copia la guía:', button.dataset.guide || ''));
    return;
  }
  if (action === 'quick-add') {
    const product = productById(Number(button.dataset.id));
    return productVariants(product).length ? openProduct(Number(button.dataset.id)) : addToCart(Number(button.dataset.id));
  }
  if (action === 'select-detail-image') {
    const main = modalRoot.querySelector('#detail-main-image');
    if (main) main.innerHTML = imageMarkup(button.dataset.imageUrl || '', button.dataset.imageAlt || '', 'product-image detail-main-image-content');
    modalRoot.querySelectorAll('.product-detail-thumbnail').forEach((thumbnail) => {
      const selected = thumbnail === button;
      thumbnail.classList.toggle('active', selected);
      thumbnail.setAttribute('aria-pressed', String(selected));
    });
    return;
  }
  if (action === 'detail-quantity') {
    const quantity = modalRoot.querySelector('#detail-quantity');
    const max = Number(modalRoot.querySelector('.quantity[data-max]')?.dataset.max || 99);
    if (quantity) quantity.textContent = String(Math.max(1, Math.min(max, Number(quantity.textContent) + Number(button.dataset.delta))));
    return;
  }
  if (action === 'add-detail') {
    if (addToCart(Number(button.dataset.id), selectedDetailVariantIds(), selectedDetailQuantity())) closeModal();
    return;
  }
  if (action === 'detail-checkout') {
    if (addToCart(Number(button.dataset.id), selectedDetailVariantIds(), selectedDetailQuantity())) {
      closeModal();
      openCheckout();
    }
    return;
  }
  if (action === 'cart-quantity') return updateCartLine(button.dataset.key, Number(button.dataset.delta));
  if (action === 'cart-remove') return removeCartLine(button.dataset.key);
  if (action === 'checkout') return openCheckout();
  if (action === 'open-review') return openReview(Number(button.dataset.productId) || 0);
}

function handleInput(event) {
  if (event.target.id === 'catalog-search') {
    state.query = event.target.value;
    state.catalogPage = 0;
    renderStore();
    document.querySelector('#catalog-search')?.focus();
  }
}

const STAR_HINTS = { 1: 'Deficiente', 2: 'Podría mejorar', 3: 'Buena', 4: 'Muy buena', 5: 'Excelente' };

function handleChange(event) {
  if (event.target.matches('.star-input input')) {
    const hint = event.target.closest('form')?.querySelector('[data-star-hint]');
    if (hint) hint.textContent = STAR_HINTS[event.target.value] || '';
  }
  if (event.target.id === 'catalog-sort') { state.sort = event.target.value; state.catalogPage = 0; renderStore(); }
  if (event.target.matches('[data-variant-select]')) updateDetailPrice();
}

function handleSubmit(event) {
  if (event.target.id === 'checkout-form') { event.preventDefault(); submitCheckout(event.target); }
  if (event.target.id === 'review-form') { event.preventDefault(); submitReview(event.target); }
  if (event.target.id === 'wa-form') { event.preventDefault(); sendWaChat(event.target); }
  if (event.target.id === 'tracking-form') {
    event.preventDefault();
    lookupTrackingGuide(new FormData(event.target).get('guide'));
  }
}

function bindEvents() {
  document.addEventListener('click', handleClick);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleChange);
  document.addEventListener('submit', handleSubmit);
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.addEventListener('pointermove', (event) => { handleHeroPointer(event); handleCardTilt(event); }, { passive: true });
  }
  startHeroMotion();
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (document.querySelector('.wa-widget.is-open')) return setWaChat(false);
    if (document.querySelector('.mobile-sheet.is-open')) return closeMenu();
    if (modalRoot.innerHTML) closeModal();
  });
  let scrolled = false;
  const onScroll = () => {
    const next = window.scrollY > 12;
    if (next === scrolled) return;
    scrolled = next;
    document.documentElement.classList.toggle('is-scrolled', next);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  window.matchMedia('(min-width: 981px)').addEventListener?.('change', (query) => { if (query.matches) closeMenu(); });
}

async function start() {
  bindEvents();
  try {
    state.data = await api.publicStore();
    if (isCatalogView()) {
      const requestedCategory = new URLSearchParams(window.location.search).get('categoria');
      if (requestedCategory && state.data.categories.some((category) => category.slug === requestedCategory)) state.category = requestedCategory;
    }
    state.cart = state.cart.filter((line) => {
      const product = (state.data.products || []).find((item) => Number(item.id) === Number(line.product_id));
      return productIsAvailable(product);
    });
    persistCart();
    renderStore();
    // Links such as index.php#colecciones arrive before the page exists: scroll once it does.
    if (window.location.hash && !isTrackingView()) {
      try {
        const target = document.querySelector(window.location.hash);
        if (target) window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
      } catch { /* not a valid selector */ }
    }
    const linkedProduct = productFromParam();
    if (linkedProduct && !isTrackingView()) openProduct(Number(linkedProduct.id));
    if (isTrackingView()) {
      loadMyOrders();
      const guide = new URLSearchParams(window.location.search).get('guia');
      if (guide) lookupTrackingGuide(guide);
    }
  } catch (exception) {
    app.innerHTML = `<main class="fatal-state"><div><p class="eyebrow">Tienda temporalmente no disponible</p><h1>No pudimos cargar el catálogo.</h1><p>${escapeHtml(exception.message || 'Inténtalo de nuevo en unos instantes.')}</p><button type="button" class="button button-dark" data-action="reload">Reintentar</button></div></main>`;
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-action="reload"]')) window.location.reload();
});

start();
