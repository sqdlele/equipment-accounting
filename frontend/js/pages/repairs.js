import { assetsApi, employeesApi, repairsApi } from '../api.js';
import { canWrite } from '../auth.js';
import { navigate } from '../router.js';
import { alert, pageHeader, pagination, priorityBadge, repairBadge } from '../ui.js';
import { esc, fmtDate, fmtDateTime, formToObject } from '../utils.js';
import { bindPagination, details, opt, options, PAGE_SIZE, q, setQuery } from './shared.js';

export async function repairsPage({ query }) {
  const page = Number(q('page') || 1);
  const [tickets, assets, emps] = await Promise.all([
    repairsApi.list({ page, page_size: PAGE_SIZE, search: q('search'), status: q('status'), priority: q('priority') }),
    assetsApi.list({ page_size: 300 }),
    employeesApi.list({ page_size: 300 }),
  ]);
  setTimeout(() => {
    if (query.get('create') === '1') document.getElementById('repair-modal').classList.remove('hidden');
    document.getElementById('open-repair')?.addEventListener('click', () => document.getElementById('repair-modal').classList.remove('hidden'));
    document.getElementById('cancel-repair')?.addEventListener('click', () => document.getElementById('repair-modal').classList.add('hidden'));
    document.getElementById('repair-filter')?.addEventListener('submit', (e) => { e.preventDefault(); setQuery({ ...formToObject(e.currentTarget), page: 1 }); });
    document.getElementById('repair-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = formToObject(e.currentTarget);
      const created = await repairsApi.create({ asset: Number(d.asset), priority: d.priority, description: d.description, defect_type: d.defect_type, assigned_to: d.assigned_to ? Number(d.assigned_to) : undefined });
      navigate(`/repairs/${created.id}`);
    });
    bindPagination(tickets.count, PAGE_SIZE);
  }, 0);
  const modalHtml = `<div id="repair-modal" class="modal-backdrop hidden"><div class="modal"><h3 class="modal-title">Создать заявку на ремонт</h3><form id="repair-form" class="stack">
    <div><label class="label">Техника *</label><select class="input" name="asset" required>${opt('', '- Выберите технику -', q('asset'))}${options(assets.results, q('asset'), (x) => `${x.inventory_number} - ${x.name}`)}</select></div>
    <div class="grid grid-2"><div><label class="label">Приоритет</label><select class="input" name="priority">${opt('low','Низкий','medium')}${opt('medium','Средний','medium')}${opt('high','Высокий','medium')}${opt('critical','Критический','medium')}</select></div><div><label class="label">Тип дефекта</label><input class="input" name="defect_type"></div></div>
    <div><label class="label">Исполнитель</label><select class="input" name="assigned_to">${opt('', '- Назначить позже -', '')}${options(emps.results, '', (x) => x.full_name)}</select></div>
    <div><label class="label">Описание дефекта *</label><textarea class="input" name="description" required></textarea></div>
    <div class="row"><button class="btn-primary">Создать заявку</button><button type="button" id="cancel-repair" class="btn-secondary">Отмена</button></div>
  </form></div></div>`;
  return `
    ${pageHeader('Заявки на ремонт', `Всего: ${tickets.count}`, canWrite() ? '<button id="open-repair" class="btn-primary">+ Создать заявку</button>' : '')}
    <form id="repair-filter" class="filters"><input class="input w-64" name="search" placeholder="Поиск по описанию, инв. номеру..." value="${esc(q('search'))}"><select class="input w-40" name="status">${opt('', 'Все статусы', q('status'))}${opt('open','Открыт',q('status'))}${opt('in_progress','В работе',q('status'))}${opt('waiting_parts','Ожид. запчастей',q('status'))}${opt('resolved','Решён',q('status'))}${opt('closed','Закрыт',q('status'))}</select><select class="input w-40" name="priority">${opt('', 'Все приоритеты', q('priority'))}${opt('critical','Критический',q('priority'))}${opt('high','Высокий',q('priority'))}${opt('medium','Средний',q('priority'))}${opt('low','Низкий',q('priority'))}</select><button class="btn-primary">Найти</button></form>
    <div class="table-wrap"><table><thead><tr><th class="table-th">#</th><th class="table-th">Техника</th><th class="table-th">Описание дефекта</th><th class="table-th">Статус</th><th class="table-th">Приоритет</th><th class="table-th">Исполнитель</th><th class="table-th">Создан</th><th class="table-th" title="Часы от создания заявки до сейчас (или до решения)">Простой (ч.)</th><th class="table-th"></th></tr></thead><tbody>
      ${tickets.results.length ? tickets.results.map((t) => `<tr class="table-tr"><td class="table-td tiny">${t.id}</td><td class="table-td"><a data-link class="link" href="/assets/${t.asset}">${esc(t.asset_name)}</a><div class="tiny mono">${esc(t.asset_inventory)}</div></td><td class="table-td">${esc(t.description)}<div class="tiny">${esc(t.defect_type || '')}</div></td><td class="table-td">${repairBadge(t.status)}</td><td class="table-td">${priorityBadge(t.priority)}</td><td class="table-td">${esc(t.assigned_to_name || '-')}</td><td class="table-td tiny">${fmtDate(t.created_at)}</td><td class="table-td">${t.downtime_hours}</td><td class="table-td"><a data-link class="link" href="/repairs/${t.id}">Открыть</a></td></tr>`).join('') : '<tr><td colspan="9" class="empty">Заявок не найдено</td></tr>'}
    </tbody></table>${pagination(page, tickets.count, PAGE_SIZE)}</div>${modalHtml}`;
}

export async function repairDetailPage({ params }) {
  const [ticket, emps] = await Promise.all([repairsApi.detail(params.id), employeesApi.list({ page_size: 300 })]);
  const active = !['resolved', 'closed'].includes(ticket.status);
  setTimeout(() => {
    document.querySelectorAll('[data-status]').forEach((btn) => btn.addEventListener('click', async () => {
      await repairsApi.update(ticket.id, { status: btn.dataset.status });
      navigate(`/repairs/${ticket.id}`);
    }));
    document.getElementById('assigned')?.addEventListener('change', async (e) => {
      await repairsApi.update(ticket.id, { assigned_to: e.target.value ? Number(e.target.value) : null });
      navigate(`/repairs/${ticket.id}`);
    });
    document.getElementById('work-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await repairsApi.addWork(ticket.id, formToObject(e.currentTarget));
      navigate(`/repairs/${ticket.id}`);
    });
    const replaceBox = document.getElementById('replace-box');
    const loadCandidates = async () => {
      const candidates = await repairsApi.replacementCandidates(ticket.id, document.getElementById('all-stock')?.checked);
      document.getElementById('replacement_asset_id').innerHTML = opt('', '- Выберите -', '') + candidates.map((a) => opt(a.id, `${a.inventory_number} - ${a.name}${a.model ? ` (${a.model})` : ''}`, '')).join('');
      document.getElementById('no-candidates').classList.toggle('hidden', candidates.length > 0);
    };
    document.getElementById('toggle-replace')?.addEventListener('click', async () => {
      replaceBox.classList.toggle('hidden');
      if (!replaceBox.classList.contains('hidden')) await loadCandidates();
    });
    document.getElementById('all-stock')?.addEventListener('change', loadCandidates);
    document.getElementById('replace-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = formToObject(e.currentTarget);
      try {
        await repairsApi.replaceFromWarehouse(ticket.id, { replacement_asset_id: Number(d.replacement_asset_id), parts_note: d.parts_note });
        navigate(`/repairs/${ticket.id}`);
      } catch (err) {
        document.getElementById('replace-error').innerHTML = alert(err.message);
      }
    });
  }, 0);
  const next = {
    open: [['in_progress', 'Взять в работу', 'btn-primary']],
    in_progress: [['waiting_parts', 'Ожидание запчастей', 'btn-secondary'], ['resolved', 'Отметить решённой', 'btn-success']],
    waiting_parts: [['in_progress', 'Вернуть в работу', 'btn-primary']],
    resolved: [['closed', 'Закрыть заявку', 'btn-secondary']],
    closed: [],
  }[ticket.status] || [];
  return `
    ${pageHeader(`Заявка #${ticket.id}`, `${ticket.asset_inventory} - ${ticket.asset_name}`, '<a data-link class="btn-secondary" href="/repairs"><- К заявкам</a>')}
    <div class="content grid grid-3">
      <div class="span-2 stack">
        <div class="card">
          <div class="row-between"><div>${repairBadge(ticket.status)} ${priorityBadge(ticket.priority)}</div><div class="row">${canWrite() && active ? next.map(([s,l,c]) => `<button class="${c}" data-status="${s}">${l}</button>`).join('') : ''}</div></div>
          <div class="stack" style="margin-top:16px">
            <div><div class="tiny">Описание дефекта</div><div class="card" style="background:#f9fafb;padding:12px">${esc(ticket.description)}</div></div>
            ${ticket.defect_type ? `<div><div class="tiny">Тип дефекта</div><b>${esc(ticket.defect_type)}</b></div>` : ''}
            <div class="grid grid-2">${details([['Зарегистрировал', ticket.reported_by_name || '-'], ['Создана', fmtDateTime(ticket.created_at)], ['Решена', fmtDateTime(ticket.resolved_at)], ['Время простоя', `${ticket.downtime_hours} ч.`]])}</div>
            <p class="tiny">Время простоя считается от момента создания заявки до текущего времени; после закрытия заявки - до отметки «Решена».</p>
          </div>
        </div>
        ${canWrite() && active ? `<div class="card soft"><div class="row-between"><div><h3>Замена со склада</h3><p class="muted">Выданная со склада техника получает локацию и ответственного неисправной; неисправная возвращается на склад.</p></div><button id="toggle-replace" class="btn-primary">Заменить технику</button></div><div id="replace-box" class="hidden" style="margin-top:16px"><div id="replace-error"></div><label class="row"><input type="checkbox" id="all-stock"> Показывать весь склад</label><p id="no-candidates" class="alert amber hidden">На складе нет подходящей техники.</p><form id="replace-form" class="stack"><div><label class="label">Техника со склада</label><select id="replacement_asset_id" class="input" name="replacement_asset_id" required></select></div><div><label class="label">Комментарий</label><input class="input" name="parts_note"></div><button class="btn-success">Подтвердить замену</button></form></div></div>` : ''}
        <div class="card"><h3>Журнал выполненных работ</h3>${ticket.works.length ? `<div class="stack">${ticket.works.map((w) => `<div class="card" style="padding:12px"><div class="row-between tiny"><span>${esc(w.performed_by_name || 'Не указан')}</span><span>${fmtDateTime(w.performed_at)}</span></div><div>${esc(w.work_description)}</div>${w.parts_used ? `<div class="tiny"><b>Запчасти / примечание:</b> ${esc(w.parts_used)}</div>` : ''}</div>`).join('')}</div>` : '<p class="muted">Работы ещё не внесены</p>'}
          ${canWrite() && active ? `<form id="work-form" class="stack" style="margin-top:16px"><textarea class="input" name="work_description" placeholder="Описание выполненных работ..." required></textarea><input class="input" name="parts_used" placeholder="Использованные запчасти (необязательно)"><button class="btn-primary">Добавить запись</button></form>` : ''}
        </div>
      </div>
      <div class="stack"><div class="card"><h4>Исполнитель</h4>${canWrite() && active ? `<select id="assigned" class="input">${opt('', '- Не назначен -', ticket.assigned_to)}${options(emps.results, ticket.assigned_to, (x) => x.full_name)}</select>` : esc(ticket.assigned_to_name || 'Не назначен')}</div><div class="card"><h4>Техника по заявке</h4><a data-link class="link" href="/assets/${ticket.asset}">${esc(ticket.asset_name)}</a><div class="tiny mono">${esc(ticket.asset_inventory)}</div></div></div>
    </div>`;
}
