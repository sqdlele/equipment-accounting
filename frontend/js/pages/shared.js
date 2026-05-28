import { navigate } from '../router.js';
import { esc } from '../utils.js';

export const PAGE_SIZE = 20;

export function q(name) {
  return new URLSearchParams(location.search).get(name) || '';
}

export function setQuery(params) {
  const url = new URL(location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v === '' || v === null || v === undefined) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  navigate(url.pathname + url.search);
}

export function opt(value, label, selected) {
  return `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;
}

export function options(items, selected, labelFn = (x) => x.name) {
  return items.map((x) => opt(x.id, labelFn(x), selected)).join('');
}

export function bindPagination(count, pageSize) {
  document.addEventListener('click', function handler(e) {
    const btn = e.target.closest('[data-page]');
    if (!btn) return;
    const next = Number(btn.dataset.page);
    if (next > 0 && next <= Math.max(1, Math.ceil(count / pageSize))) setQuery({ page: next });
    document.removeEventListener('click', handler);
  });
}

export function details(items) {
  return items.map(([label, value]) => `
    <div>
      <div class="tiny">${esc(label)}</div>
      <div class="font-bold">${esc(value ?? '-')}</div>
    </div>
  `).join('');
}

export function chartLater(id, type, data, options = {}) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    new window.Chart(el, { type, data, options });
  }, 0);
}
