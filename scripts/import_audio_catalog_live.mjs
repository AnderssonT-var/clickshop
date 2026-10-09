#!/usr/bin/env node
/**
 * Imports the normalized Audio catalogue through the store's own authenticated API.
 *
 * Usage:
 *   CLICKSHOPSE_ADMIN_PASSWORD='…' node scripts/import_audio_catalog_live.mjs --live
 *
 * The state file is written after every upload/save, so a failed connection can be
 * resumed without uploading the same image again.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const apiBase = process.env.CLICKSHOPSE_API_BASE || 'https://clickshopse.com';
const email = process.env.CLICKSHOPSE_ADMIN_EMAIL || 'admin@admin.com';
const password = process.env.CLICKSHOPSE_ADMIN_PASSWORD || '';
const catalogPath = path.join(root, 'catalogs', 'audio-catalog.tsv');
const imagesPath = path.join(root, 'build', 'audio-catalog', 'images');
const statePath = path.join(root, 'build', 'audio-catalog', 'audio-catalog-live-state.json');

if (!args.has('--live')) {
  throw new Error('Safety check: run this importer with --live after reviewing the catalogue.');
}
if (!password) {
  throw new Error('Set CLICKSHOPSE_ADMIN_PASSWORD before running the importer.');
}

const slugify = (value) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const parseCatalog = (content) => {
  const [header, ...lines] = content.trim().split(/\r?\n/);
  const fields = header.split('\t');
  return lines.map((line) => {
    const values = line.split('\t');
    return Object.fromEntries(fields.map((field, index) => [field, values[index] ?? '']));
  });
};

const readState = async () => {
  try {
    return JSON.parse(await fs.readFile(statePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, apiBase, items: {} };
    throw error;
  }
};

const writeState = async (state) => {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
};

let cookie = '';
const request = async (query, options = {}) => {
  const response = await fetch(`${apiBase}/api.php?${query}`, {
    redirect: 'manual',
    ...options,
    headers: { ...(cookie ? { cookie } : {}), ...(options.headers || {}) },
  });
  const setCookies = response.headers.getSetCookie?.() || [];
  if (setCookies.length) cookie = setCookies.map((entry) => entry.split(';', 1)[0]).join('; ');
  const body = await response.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = { ok: false, message: body.slice(0, 240) }; }
  if (!response.ok || !parsed.ok) {
    throw new Error(`${response.status} ${parsed.message || 'The store API rejected the request.'}`);
  }
  return parsed;
};

const jsonRequest = (query, csrf, payload) => request(query, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
  body: JSON.stringify(payload),
});

const uploadImage = async (csrf, imageFile) => {
  const image = await fs.readFile(imageFile);
  const form = new FormData();
  form.append('kind', 'audio-catalog');
  form.append('file', new Blob([image], { type: 'image/jpeg' }), path.basename(imageFile));
  return request('resource=upload', {
    method: 'POST',
    headers: { 'x-csrf-token': csrf },
    body: form,
  });
};

const catalog = parseCatalog(await fs.readFile(catalogPath, 'utf8'));
if (catalog.length !== 85) throw new Error(`Expected 85 Audio products; found ${catalog.length}.`);

const login = await request('resource=auth&action=login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const csrf = login.data.csrf_token;
if (!csrf) throw new Error('The authenticated session did not return a CSRF token.');

const bootstrap = await request('resource=admin&action=bootstrap');
let category = (bootstrap.data.categories || []).find((item) => item.slug === 'audio');
if (!category) {
  const created = await jsonRequest('resource=categories&action=save', csrf, {
    data: { name: 'Audio', slug: 'audio', description: 'Audífonos, auriculares inalámbricos y manos libres.', sort_order: 10, status: 'active' },
  });
  category = { id: created.data.id, slug: 'audio' };
}
const existingProducts = new Map((bootstrap.data.products || []).map((product) => [String(product.sku).toUpperCase(), product]));
const state = await readState();
state.apiBase = apiBase;
state.categoryId = Number(category.id);
state.catalogProducts = catalog.length;
await writeState(state);

let uploaded = 0;
let saved = 0;
for (let index = 0; index < catalog.length; index += 1) {
  const product = catalog[index];
  const sku = product.sku.toUpperCase();
  const imageFile = path.join(imagesPath, `${sku.toLowerCase()}.jpg`);
  let item = state.items[sku] || {};
  if (!item.mediaId) {
    try { await fs.access(imageFile); } catch { throw new Error(`Missing image for ${sku}: ${imageFile}`); }
    const uploadedMedia = await uploadImage(csrf, imageFile);
    item = { ...item, mediaId: Number(uploadedMedia.data.id), mediaPath: uploadedMedia.data.path };
    state.items[sku] = item;
    uploaded += 1;
    await writeState(state);
  }
  const colors = product.colors.split(',').map((color) => color.trim()).filter(Boolean);
  const variants = colors.map((color) => ({
    option_name: 'Color', option_value: color, sku: `${sku}-${slugify(color).toUpperCase()}`, price_delta: 0, stock: 10,
  }));
  const existing = existingProducts.get(sku);
  const result = await jsonRequest('resource=products&action=save', csrf, {
    ...(existing ? { id: Number(existing.id) } : {}),
    data: {
      category_id: Number(category.id),
      name: product.name,
      slug: `audio-${sku.toLowerCase()}-${slugify(product.name)}`,
      short_description: product.short_description,
      long_description: product.long_description,
      regular_price: Number(product.price),
      sale_price: '',
      stock: 10,
      low_stock_threshold: 2,
      sku,
      badge: '',
      sort_order: 100 + index,
      status: 'active',
      image_alt: product.name,
      media_ids: [item.mediaId],
      variants,
    },
  });
  item.productId = Number(result.data.id);
  state.items[sku] = item;
  saved += 1;
  await writeState(state);
  process.stdout.write(`[${index + 1}/${catalog.length}] ${sku} · ${product.name}\n`);
}

state.completedAt = new Date().toISOString();
await writeState(state);
console.log(JSON.stringify({ ok: true, products: saved, uploadedImages: uploaded, statePath }, null, 2));
