import { logout, user } from './auth.js';
import { navigate } from './router.js';
import { esc } from './utils.js';

const nav = [
  ['/', '▦', 'Дашборд'],
  ['/assets', '🖥', 'Техника'],
  ['/movements', '📦', 'Перемещения'],
  ['/repairs', '🔧', 'Ремонты'],
  ['/reports', '📊', 'Отчёты'],
  ['/admin', '⚙', 'Справочники'],
];

export function layout(content) {
  const u = user();
  const path = location.pathname;
  const links = nav.map(([href, icon, label]) => {
    const active = href === '/' ? path === '/' : path.startsWith(href);
    return `<a data-link class="nav-link ${active ? 'active' : ''}" href="${href}">
      <span class="nav-icon">${icon}</span><span>${label}</span>
    </a>`;
  }).join('');
  const display = u ? (u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username) : '';
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-logo">ИТ</div>
          <div><div class="brand-title">ИТ-Техника</div><div class="brand-sub">АО «ИРЗ»</div></div>
        </div>
        <nav class="nav">${links}</nav>
        ${u ? `<div class="user-panel">
          <div class="user-row">
            <div class="avatar">${esc((display || u.username || '?')[0]).toUpperCase()}</div>
            <div><div class="user-name">${esc(display)}</div><div class="user-role">${esc(u.role)}</div></div>
          </div>
          <button class="logout" id="logout-btn">Выйти</button>
        </div>` : ''}
      </aside>
      <main class="main">${content}</main>
    </div>
  `;
}

export function bindLayout() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('#logout-btn')) {
      logout();
      navigate('/login', true);
    }
  });
  window.addEventListener('auth:logout', () => navigate('/login', true));
}
