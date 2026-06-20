import { assetsApi, categoriesApi, employeesApi, locationsApi, manufacturersApi, repairsApi } from '../api.js';
import { canWrite } from '../auth.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { alert, assetBadge, pageHeader, pagination, priorityBadge, repairBadge } from '../ui.js';
import { esc, fmtDate, fmtDateTime, formToObject, money } from '../utils.js';
import { bindPagination, details, opt, options, PAGE_SIZE, q, setQuery } from './shared.js';

export async function assetsPage() {
  const page = Number(q('page') || 1);
  const params = { page, page_size: PAGE_SIZE, search: q('search'), status: q('status'), category: q('category'), location: q('location') };
  const [assets, cats, locs] = await Promise.all([assetsApi.list(params), categoriesApi.list(), locationsApi.list()]);
  setTimeout(() => {
    document.getElementById('asset-filter')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = formToObject(e.currentTarget);
      setQuery({ ...d, page: 1 });
    });
    document.getElementById('asset-reset')?.addEventListener('click', () => navigate('/assets'));
    bindPagination(assets.count, PAGE_SIZE);
  }, 0);
  const actions = canWrite() ? '<a data-link class="btn-primary" href="/assets/new">+ Добавить</a>' : '';
  return `
    ${pageHeader('Техника', `Всего: ${assets.count}`, actions)}
    <form id="asset-filter" class="filters">
      <input class="input w-64" name="search" placeholder="Поиск по названию, инв. номеру..." value="${esc(q('search'))}">
      <select class="input w-40" name="status">${opt('', 'Все статусы', q('status'))}${opt('warehouse', 'На складе', q('status'))}${opt('in_use', 'В эксплуатации', q('status'))}${opt('repair', 'В ремонте', q('status'))}${opt('written_off', 'Списан', q('status'))}</select>
      <select class="input w-44" name="category">${opt('', 'Все категории', q('category'))}${options(cats.results, q('category'))}</select>
      <select class="input w-44" name="location">${opt('', 'Все локации', q('location'))}${options(locs.results, q('location'))}</select>
      <button class="btn-primary">Найти</button><button type="button" id="asset-reset" class="btn-secondary">Сбросить</button>
    </form>
    <div class="table-wrap">
      <table><thead><tr><th class="table-th">Инв. номер</th><th class="table-th">Наименование</th><th class="table-th">Категория</th><th class="table-th">Статус</th><th class="table-th">Локация</th><th class="table-th">Ответственный</th><th class="table-th"></th></tr></thead>
      <tbody>${assets.results.length ? assets.results.map((a) => `
        <tr class="table-tr"><td class="table-td"><span class="pill mono">${esc(a.inventory_number)}</span></td><td class="table-td"><b>${esc(a.name)}</b><div class="tiny">${esc(a.model || '')}</div></td><td class="table-td">${esc(a.category_name || '-')}</td><td class="table-td">${assetBadge(a.status)}</td><td class="table-td">${esc(a.location_name || '-')}</td><td class="table-td">${esc(a.responsible_employee_name || '-')}</td><td class="table-td"><a data-link class="link" href="/assets/${a.id}">Открыть</a></td></tr>`).join('') : '<tr><td class="empty" colspan="7">Записи не найдены</td></tr>'}</tbody></table>
      ${pagination(page, assets.count, PAGE_SIZE)}
    </div>`;
}

export async function warehousePage() {
  const data = await assetsApi.warehouseSummary();
  setTimeout(() => {
    document.querySelectorAll('[data-acc]').forEach((btn) => btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.acc)?.classList.toggle('hidden');
    }));
  }, 0);
  return `
    ${pageHeader('Техника на складе', `Всего единиц со статусом «На складе»: ${data.total_on_warehouse}`, '<a data-link class="btn-secondary" href="/"><- На дашборд</a>')}
    <div class="content stack" style="max-width:860px">
      ${data.categories.length ? data.categories.map((c, idx) => {
        const id = `cat-${idx}`;
        const total = c.models.reduce((s, m) => s + m.count, 0);
        return `<div class="card compact"><button class="accordion-head" data-acc="${id}"><b>${esc(c.category_name)}</b><span>${total} шт. ▾</span></button><div id="${id}" class="accordion-body hidden"><table><thead><tr><th class="table-th">Модель</th><th class="table-th">Кол-во</th></tr></thead><tbody>${c.models.map((m) => `<tr><td class="table-td">${esc(m.model)}</td><td class="table-td mono">${m.count}</td></tr>`).join('')}</tbody></table></div></div>`;
      }).join('') : '<p class="empty">На складе пока ничего не учитывается.</p>'}
    </div>`;
}

export async function assetFormPage({ params }) {
  const isEdit = Boolean(params.id);
  const [cats, mans, locs, emps, asset] = await Promise.all([
    categoriesApi.list(), manufacturersApi.list(), locationsApi.list(), employeesApi.list({ page_size: 300, is_active: 'true' }),
    isEdit ? assetsApi.detail(params.id) : Promise.resolve(null),
  ]);
  const a = asset || {};
  setTimeout(() => {
    const form = document.getElementById('asset-form');
    const preview = document.getElementById('photo-preview');
    document.getElementById('photo')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && preview) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
      }
    });
    const qtyInput = document.getElementById('asset-quantity');
    const invLabel = document.getElementById('inv-label');
    const invHint = document.getElementById('inv-hint');
    const serialHint = document.getElementById('serial-hint');
    const syncBulkHints = () => {
      const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10) || 1);
      if (!qtyInput || isEdit) return;
      const bulk = qty > 1;
      if (invLabel) invLabel.textContent = bulk ? 'Инвентарный номер первой единицы *' : 'Инвентарный номер *';
      if (invHint) {
        invHint.textContent = bulk
          ? `Будет создано ${qty} единиц с теми же данными; номера: …-002, …-003 (или продолжение цифр в конце).`
          : '';
        invHint.classList.toggle('hidden', !bulk);
      }
      if (serialHint) {
        serialHint.textContent = bulk
          ? 'Если указан - к каждой единице добавится суффикс -001, -002…'
          : '';
        serialHint.classList.toggle('hidden', !bulk);
      }
    };
    qtyInput?.addEventListener('input', syncBulkHints);
    syncBulkHints();
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      for (const [k, v] of [...fd.entries()]) if (v === '' || (v instanceof File && !v.name)) fd.delete(k);
      if (!isEdit) {
        const qty = Math.min(50, Math.max(1, parseInt(fd.get('quantity') || '1', 10) || 1));
        fd.set('quantity', String(qty));
      } else {
        fd.delete('quantity');
      }
      try {
        const saved = isEdit ? await assetsApi.update(params.id, fd) : await assetsApi.create(fd);
        if (!isEdit && saved.quantity > 1) {
          navigate('/assets');
          window.alert(`Добавлено единиц техники: ${saved.quantity}`);
        } else {
          navigate(`/assets/${isEdit ? params.id : saved.id}`);
        }
      } catch (err) {
        document.getElementById('asset-error').innerHTML = alert(err.message);
      }
    });
  }, 0);
  return `
    ${pageHeader(isEdit ? 'Редактировать карточку' : 'Поступление техники', isEdit ? '' : 'Одинаковые модели - укажите количество', `<a data-link class="btn-secondary" href="${isEdit ? `/assets/${params.id}` : '/assets'}">Отмена</a>`)}
    <div class="content">
      <form id="asset-form" class="grid grid-2 asset-form-page">
        <div id="asset-error" class="span-2"></div>
        <div class="card"><h3>Основная информация</h3><div class="grid grid-2">
          ${isEdit ? '' : `<div class="span-2"><label class="label">Количество одинаковых единиц</label><input class="input" id="asset-quantity" name="quantity" type="number" min="1" max="50" value="1"><p class="tiny">Одна модель и характеристики - несколько инвентарных номеров (например, партия мониторов).</p></div>`}
          <div><label class="label" id="inv-label">Инвентарный номер *</label><input class="input" name="inventory_number" required value="${esc(a.inventory_number || '')}"><p id="inv-hint" class="tiny hidden"></p></div>
          <div><label class="label">Серийный номер</label><input class="input" name="serial_number" value="${esc(a.serial_number || '')}"><p id="serial-hint" class="tiny hidden"></p></div>
          <div><label class="label">Наименование *</label><input class="input" name="name" required value="${esc(a.name || '')}"></div>
          <div><label class="label">Модель</label><input class="input" name="model" value="${esc(a.model || '')}"></div>
          <div><label class="label">Категория</label><select class="input" name="category">${opt('', '- Выберите -', a.category)}${options(cats.results, a.category)}</select></div>
          <div><label class="label">Производитель</label><select class="input" name="manufacturer">${opt('', '- Выберите -', a.manufacturer)}${options(mans.results, a.manufacturer)}</select></div>
        </div></div>
        <div class="card"><h3>Размещение и статус</h3><div class="grid grid-2">
          <div><label class="label">Статус</label><select class="input" name="status">${opt('warehouse','На складе',a.status || 'warehouse')}${opt('in_use','В эксплуатации',a.status)}${opt('repair','В ремонте',a.status)}${opt('written_off','Списан',a.status)}</select></div>
          <div><label class="label">Локация</label><select class="input" name="location">${opt('', '- Выберите -', a.location)}${options(locs.results, a.location)}</select></div>
          <div><label class="label">Год изготовления</label><input class="input" name="manufacture_year" type="number" min="1990" max="2100" value="${esc(a.manufacture_year || '')}"></div>
          <div><label class="label">Ответственный сотрудник</label><select class="input" name="responsible_employee">${opt('', '- Выберите -', a.responsible_employee)}${options(emps.results, a.responsible_employee, (x) => x.full_name)}</select></div>
        </div></div>
        <div class="card"><h3>Финансы</h3><div class="grid grid-2">
          <div><label class="label">Дата покупки</label><input class="input" name="purchase_date" type="date" value="${esc(a.purchase_date || '')}"></div>
          <div><label class="label">Стоимость (₽)</label><input class="input" name="price" type="number" step="0.01" value="${esc(a.price || '')}"></div>
        </div></div>
        <div class="card"><h3>Описание и фото</h3>
          <label class="label">Конфигурация / Описание</label><textarea class="input" name="description">${esc(a.description || '')}</textarea>
          <div style="margin-top:12px"><label class="label">Фото</label><img id="photo-preview" class="photo ${a.photo ? '' : 'hidden'}" src="${esc(a.photo || '')}" alt=""><input id="photo" class="input" name="photo" type="file" accept="image/*"></div>
        </div>
        <div class="row span-2"><button class="btn-primary">Сохранить</button><a data-link class="btn-secondary" href="${isEdit ? `/assets/${params.id}` : '/assets'}">Отмена</a></div>
      </form>
    </div>`;
}

export async function assetDetailPage({ params }) {
  const [a, repairs] = await Promise.all([assetsApi.detail(params.id), repairsApi.list({ asset: params.id, page_size: 50 })]);
  const tab = q('tab') || 'info';
  setTimeout(() => {
    document.getElementById('delete-asset')?.addEventListener('click', async () => {
      if (confirm(`Удалить «${a.name}»?`)) {
        await assetsApi.delete(a.id);
        navigate('/assets');
      }
    });
  }, 0);
  const tabs = [
    ['info', 'Информация'],
    ['history', `История (${a.history.length})`],
    ['repairs', `Ремонты (${repairs.results.length})`],
  ].map(([key, label]) => `<a data-link class="tab ${tab === key ? 'active' : ''}" href="/assets/${a.id}?tab=${key}">${esc(label)}</a>`).join('');
  let body = '';
  if (tab === 'history') {
    body = a.history.length ? `<div class="stack">${a.history.map((h) => `<div class="card" style="padding:12px"><b>${esc(h.field_changed)}</b> <span class="tiny">${esc(h.old_value || '')} -> ${esc(h.new_value || '')}</span><div class="tiny">${esc(h.note || '')}</div><div class="tiny">${esc(h.changed_by_name || 'Система')} · ${fmtDateTime(h.changed_at)}</div></div>`).join('')}</div>` : '<p class="empty">История пуста</p>';
  } else if (tab === 'repairs') {
    body = `${canWrite() ? `<a data-link class="btn-primary" href="/repairs?create=1&asset=${a.id}">+ Создать заявку</a>` : ''}<div class="stack" style="margin-top:12px">${repairs.results.length ? repairs.results.map((r) => `<a data-link class="card" style="padding:12px" href="/repairs/${r.id}"><div class="row-between"><b>Заявка #${r.id}</b><span>${repairBadge(r.status)} ${priorityBadge(r.priority)}</span></div><div class="tiny">${esc(r.description)}</div><div class="tiny">${fmtDate(r.created_at)} · Простой: ${r.downtime_hours} ч.</div></a>`).join('') : '<p class="empty">Ремонтов не было</p>'}</div>`;
  } else {
    body = `<div class="grid grid-2">${details([
      ['Инвентарный номер', a.inventory_number], ['Серийный номер', a.serial_number || '-'], ['Модель', a.model || '-'], ['Категория', a.category_name || '-'],
      ['Производитель', a.manufacturer_name || '-'], ['Статус', a.status_display], ['Локация', a.location_name || '-'], ['Год изготовления', a.manufacture_year || '-'],
      ['Ответственный', a.responsible_employee_name || '-'], ['Дата покупки', fmtDate(a.purchase_date)], ['Стоимость', money(a.price)],
    ])}${a.description ? `<div class="span-2"><div class="tiny">Описание/Конфигурация</div><div class="card" style="background:#f9fafb">${esc(a.description)}</div></div>` : ''}</div>`;
  }
  const actions = `<a data-link class="btn-secondary" href="/assets"><- Назад</a>${canWrite() ? `<a data-link class="btn-secondary" href="/assets/${a.id}/edit">Редактировать</a><button id="delete-asset" class="btn-danger">Удалить</button>` : ''}`;
  return `
    ${pageHeader(a.name, `Инв. №${a.inventory_number}`, actions)}
    <div class="content grid grid-3">
      <div class="stack">
        <div class="card" style="text-align:center">${a.photo ? `<img class="photo" src="${esc(a.photo)}" alt="${esc(a.name)}">` : `<div class="photo photo-placeholder">${icon('photo', 'icon-xl')}</div>`}<div style="margin-top:12px">${assetBadge(a.status)}</div></div>
        ${a.qr_code ? `<div class="card" style="text-align:center"><div class="tiny">QR-код</div><img class="qr" src="${esc(a.qr_code)}" alt="QR"><br><a class="btn-secondary" href="${esc(a.qr_code)}" download="qr_${esc(a.inventory_number)}.png">Скачать QR</a></div>` : ''}
      </div>
      <div class="span-2"><div class="card compact"><div class="tabs">${tabs}</div><div class="content">${body}</div></div></div>
    </div>`;
}
