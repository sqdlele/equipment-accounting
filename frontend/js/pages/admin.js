import {
  categoriesApi, departmentsApi, employeesApi, locationsApi, manufacturersApi, usersApi,
} from '../api.js';
import { isAdmin } from '../auth.js';
import { navigate } from '../router.js';
import { alert, badge, modal, pageHeader } from '../ui.js';
import { esc, formToObject } from '../utils.js';
import { opt, options, q } from './shared.js';

const adminTabs = {
  categories: {
    label: 'Категории',
    api: categoriesApi,
    headers: ['Название', 'Единиц', 'Описание', ''],
    row: (x) => [x.name, x.asset_count, x.description || '-'],
    fields: () => [{ name: 'name', label: 'Название *', required: true }, { name: 'description', label: 'Описание' }],
  },
  manufacturers: {
    label: 'Производители',
    api: manufacturersApi,
    headers: ['Название', 'Единиц', ''],
    row: (x) => [x.name, x.asset_count],
    fields: () => [{ name: 'name', label: 'Название *', required: true }],
  },
  departments: {
    label: 'Подразделения',
    api: departmentsApi,
    headers: ['Название', 'Описание', ''],
    row: (x) => [x.name, x.description || '-'],
    fields: () => [{ name: 'name', label: 'Название *', required: true }, { name: 'description', label: 'Описание' }],
  },
  locations: {
    label: 'Локации',
    api: locationsApi,
    headers: ['Название', 'Код каб.', 'Тип', 'Подразделение', ''],
    row: (x) => [x.name, x.room_code || '-', x.type_display, x.department_name || '-'],
  },
  employees: {
    label: 'Сотрудники',
    api: employeesApi,
    headers: ['ФИО', 'Должность', 'Подразделение', 'Email', 'Статус', ''],
    row: (x) => [x.full_name, x.position || '-', x.department_name || '-', x.email || '-', x.is_active ? badge('Активен', 'green') : badge('Неактивен', 'gray')],
  },
  users: {
    label: 'Пользователи',
    api: usersApi,
    headers: ['Логин', 'ФИО', 'Роль', 'Email', ''],
    row: (x) => [x.username, `${x.first_name || ''} ${x.last_name || ''}`.trim() || '-', x.role, x.email || '-'],
  },
};

function fieldHtml(field, value = '', deps = {}) {
  if (field.type === 'select') {
    return `<div><label class="label">${esc(field.label)}</label><select class="input" name="${field.name}">${field.options(value, deps)}</select></div>`;
  }
  return `<div><label class="label">${esc(field.label)}</label><input class="input" name="${field.name}" type="${field.inputType || 'text'}" value="${esc(value || '')}" ${field.required ? 'required' : ''}></div>`;
}

function adminFields(tab, item, deps) {
  const common = {
    locations: [
      { name: 'name', label: 'Название *', required: true },
      { name: 'room_code', label: 'Код кабинета (для номеров техники)' },
      { name: 'type', label: 'Тип', type: 'select', options: (v) => opt('warehouse','Склад',v || 'office') + opt('office','Офис/Кабинет',v || 'office') + opt('workshop','Цех',v) + opt('server_room','Серверная',v) },
      { name: 'department', label: 'Подразделение', type: 'select', options: (v, d) => opt('', '- Не указано -', v) + options(d.departments.results, v) },
      { name: 'description', label: 'Описание' },
    ],
    employees: [
      { name: 'full_name', label: 'ФИО *', required: true },
      { name: 'position', label: 'Должность' },
      { name: 'department', label: 'Подразделение', type: 'select', options: (v, d) => opt('', '- Не указано -', v) + options(d.departments.results, v) },
      { name: 'email', label: 'Email', inputType: 'email' },
      { name: 'phone', label: 'Телефон' },
    ],
    users: [
      { name: 'username', label: 'Логин *', required: true },
      { name: 'first_name', label: 'Имя' },
      { name: 'last_name', label: 'Фамилия' },
      { name: 'email', label: 'Email', inputType: 'email' },
      ...(item ? [] : [{ name: 'password', label: 'Пароль *', inputType: 'password', required: true }]),
      { name: 'role', label: 'Роль', type: 'select', options: (v) => opt('admin','Администратор',v || 'readonly') + opt('engineer','ИТ-инженер',v) + opt('warehouse','Кладовщик',v) + opt('readonly','Читатель',v || 'readonly') },
    ],
  };
  const fields = adminTabs[tab].fields ? adminTabs[tab].fields() : common[tab];
  return fields.map((f) => fieldHtml(f, item?.[f.name] ?? '', deps)).join('');
}

export async function adminPage() {
  const tab = q('tab') || 'categories';
  const cfg = adminTabs[tab] || adminTabs.categories;
  if (tab === 'users' && !isAdmin()) return `${pageHeader('Справочники')}<div class="content">${alert('Недостаточно прав')}</div>`;
  const deps = {};
  if (tab === 'locations' || tab === 'employees') deps.departments = await departmentsApi.list();
  const data = await cfg.api.list(tab === 'employees' ? { page_size: 200 } : undefined);
  const rows = data.results || [];
  const tabs = Object.entries(adminTabs)
    .filter(([key]) => key !== 'users' || isAdmin())
    .map(([key, x]) => `<a data-link class="tab ${tab === key ? 'active' : ''}" href="/admin?tab=${key}">${x.label}</a>`).join('');
  setTimeout(() => {
    document.getElementById('admin-add')?.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', modal('Создать', `<form id="admin-form" class="stack">${adminFields(tab, null, deps)}<div id="admin-error"></div><div class="row"><button class="btn-primary">Сохранить</button><button type="button" id="admin-cancel" class="btn-secondary">Отмена</button></div></form>`));
      bindAdminForm(tab, cfg, null);
    });
    document.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
      const item = rows.find((x) => String(x.id) === btn.dataset.edit);
      document.body.insertAdjacentHTML('beforeend', modal('Редактировать', `<form id="admin-form" class="stack">${adminFields(tab, item, deps)}<div id="admin-error"></div><div class="row"><button class="btn-primary">Сохранить</button><button type="button" id="admin-cancel" class="btn-secondary">Отмена</button></div></form>`));
      bindAdminForm(tab, cfg, item);
    }));
    document.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
      if (confirm('Удалить запись?')) {
        await cfg.api.delete(btn.dataset.delete);
        navigate(`/admin?tab=${tab}`);
      }
    }));
  }, 0);
  return `
    ${pageHeader('Справочники', 'Управление основными данными системы')}
    <div class="tabs">${tabs}</div>
    <div class="content"><div class="card compact">
      <div class="row-between" style="padding:16px;border-bottom:1px solid #e5e7eb"><span></span><button id="admin-add" class="btn-primary">+ Добавить</button></div>
      <div class="table-wrap"><table><thead><tr>${cfg.headers.map((h) => `<th class="table-th">${esc(h)}</th>`).join('')}</tr></thead><tbody>
        ${rows.map((row) => `<tr class="table-tr">${cfg.row(row).map((c) => `<td class="table-td">${typeof c === 'string' || typeof c === 'number' ? esc(c) : c}</td>`).join('')}<td class="table-td"><button class="link" data-edit="${row.id}">Изм.</button> <button class="link link-danger" data-delete="${row.id}">Удалить</button></td></tr>`).join('') || `<tr><td class="empty" colspan="${cfg.headers.length}">Нет данных</td></tr>`}
      </tbody></table></div>
    </div></div>`;
}

function bindAdminForm(tab, cfg, item) {
  document.getElementById('admin-cancel')?.addEventListener('click', () => document.getElementById('modal-root')?.remove());
  document.getElementById('modal-root')?.addEventListener('click', (e) => { if (e.target.id === 'modal-root') e.currentTarget.remove(); });
  document.getElementById('admin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = formToObject(e.currentTarget);
      if (item) await cfg.api.update(item.id, data);
      else await cfg.api.create(data);
      document.getElementById('modal-root')?.remove();
      navigate(`/admin?tab=${tab}`);
    } catch (err) {
      document.getElementById('admin-error').innerHTML = alert(err.message);
    }
  });
}
