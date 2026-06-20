import { esc } from './utils.js';

export function pageHeader(title, subtitle = '', actions = '') {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">${esc(title)}</h1>
        ${subtitle ? `<div class="page-subtitle">${esc(subtitle)}</div>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>
  `;
}

export function spinner() {
  return '<div class="spinner">Загрузка...</div>';
}

export function alert(message, type = 'red') {
  return `<div class="alert ${type}">${esc(message)}</div>`;
}

export function badge(text, tone = 'gray') {
  return `<span class="badge ${tone}">${esc(text)}</span>`;
}

const assetStatus = {
  warehouse: ['На складе', 'green'],
  in_use: ['В эксплуатации', 'blue'],
  repair: ['В ремонте', 'yellow'],
  written_off: ['Списан', 'red'],
};

const repairStatus = {
  open: ['Открыт', 'red'],
  in_progress: ['В работе', 'yellow'],
  waiting_parts: ['Ожид. запчастей', 'purple'],
  resolved: ['Решён', 'green'],
  closed: ['Закрыт', 'gray'],
};

const priority = {
  low: ['Низкий', 'gray'],
  medium: ['Средний', 'blue'],
  high: ['Высокий', 'orange'],
  critical: ['Критический', 'red'],
};

export function assetBadge(status) {
  const [label, tone] = assetStatus[status] || [status, 'gray'];
  return badge(label, tone);
}

export function repairBadge(status) {
  const [label, tone] = repairStatus[status] || [status, 'gray'];
  return badge(label, tone);
}

export function priorityBadge(value) {
  const [label, tone] = priority[value] || [value, 'gray'];
  return badge(label, tone);
}

export function pagination(page, count, pageSize) {
  const total = Math.max(1, Math.ceil((count || 0) / pageSize));
  return `
    <div class="pagination">
      <button class="btn-secondary" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Назад</button>
      <span class="muted">Стр. ${page} из ${total}</span>
      <button class="btn-secondary" data-page="${page + 1}" ${page >= total ? 'disabled' : ''}>Вперёд</button>
    </div>
  `;
}

export function modal(title, body, id = 'modal-root') {
  return `
    <div class="modal-backdrop" id="${id}">
      <div class="modal">
        <h3 class="modal-title">${esc(title)}</h3>
        ${body}
      </div>
    </div>
  `;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
