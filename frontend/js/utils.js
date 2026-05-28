export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString('ru-RU') : '-';
}

export function fmtDateTime(value) {
  return value ? new Date(value).toLocaleString('ru-RU') : '-';
}

export function money(value) {
  return value ? `${Number(value).toLocaleString('ru-RU')} ₽` : '-';
}

export function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function errorText(data) {
  if (!data) return 'Ошибка выполнения запроса';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (Array.isArray(data)) return data.join('\n');
  return Object.entries(data).map(([key, val]) => {
    const msg = Array.isArray(val) ? val.join(', ') : String(val);
    return `${key}: ${msg}`;
  }).join('\n');
}

export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
