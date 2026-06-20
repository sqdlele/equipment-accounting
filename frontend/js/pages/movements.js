import { assetsApi, employeesApi, locationsApi, movementsApi } from '../api.js';
import { canWrite } from '../auth.js';
import { navigate } from '../router.js';
import { alert, pageHeader, pagination } from '../ui.js';
import { esc, fmtDateTime, formToObject } from '../utils.js';
import { bindPagination, opt, options, q, setQuery } from './shared.js';

export async function movementsPage() {
  const page = Number(q('page') || 1);
  const [rows, assets, locs, emps] = await Promise.all([
    movementsApi.list({ page, page_size: 25, asset: q('asset') }),
    assetsApi.list({ page_size: 500 }),
    locationsApi.list(),
    employeesApi.list({ page_size: 300, is_active: 'true' }),
  ]);
  setTimeout(() => {
    document.getElementById('movement-filter')?.addEventListener('change', (e) => setQuery({ asset: e.target.value, page: 1 }));
    document.getElementById('open-movement')?.addEventListener('click', () => document.getElementById('move-modal').classList.remove('hidden'));
    document.getElementById('cancel-movement')?.addEventListener('click', () => document.getElementById('move-modal').classList.add('hidden'));
    document.getElementById('movement-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = formToObject(e.currentTarget);
      try {
        await movementsApi.create({
          asset: Number(d.asset),
          to_location: d.to_location ? Number(d.to_location) : null,
          to_responsible_employee: d.to_responsible_employee ? Number(d.to_responsible_employee) : null,
          document_number: d.document_number || '',
          note: d.note || '',
        });
        navigate('/movements');
      } catch (err) {
        document.getElementById('movement-error').innerHTML = alert(err.message);
      }
    });
    bindPagination(rows.count, 25);
  }, 0);
  const actions = canWrite() ? '<button id="open-movement" class="btn-primary">+ Оформить перемещение</button>' : '';
  const moveModal = `<div id="move-modal" class="modal-backdrop hidden"><div class="modal"><h3 class="modal-title">Новая запись в журнале</h3><p class="muted">Укажите новую локацию и/или ответственного.</p><div id="movement-error"></div><form id="movement-form" class="stack">
    <div><label class="label">Техника *</label><select class="input" name="asset" required>${opt('', '- Выберите -', '')}${options(assets.results, '', (x) => `${x.inventory_number} - ${x.name}`)}</select></div>
    <div><label class="label">Локация (куда)</label><select class="input" name="to_location">${opt('', '- Не закреплено -', '')}${options(locs.results)}</select></div>
    <div><label class="label">Ответственный (кому)</label><select class="input" name="to_responsible_employee">${opt('', '- Не назначено -', '')}${options(emps.results, '', (x) => x.full_name)}</select></div>
    <div><label class="label">Номер документа</label><input class="input" name="document_number"></div>
    <div><label class="label">Комментарий</label><textarea class="input" name="note"></textarea></div>
    <div class="row"><button class="btn-primary">Записать</button><button type="button" id="cancel-movement" class="btn-secondary">Отмена</button></div>
  </form></div></div>`;
  return `
    ${pageHeader('Журнал перемещений', 'Передачи между локациями и смена ответственного', actions)}
    <div class="filters"><div><label class="label">Фильтр по единице</label><select id="movement-filter" class="input w-72">${opt('', 'Вся техника', q('asset'))}${options(assets.results, q('asset'), (x) => `${x.inventory_number} - ${x.name}`)}</select></div></div>
    <div class="table-wrap"><table><thead><tr><th class="table-th">Дата</th><th class="table-th">Техника</th><th class="table-th">Откуда -> Куда</th><th class="table-th">Ответственный</th><th class="table-th">Документ</th><th class="table-th">Оформил</th><th class="table-th"></th></tr></thead><tbody>
      ${rows.results.length ? rows.results.map((m) => `<tr class="table-tr"><td class="table-td">${fmtDateTime(m.created_at)}</td><td class="table-td"><b>${esc(m.asset_inventory_number)}</b><div class="tiny">${esc(m.asset_name)}</div></td><td class="table-td">${esc(m.from_location_name || '-')} -> ${esc(m.to_location_name || '-')}</td><td class="table-td"><div class="tiny">${esc(m.from_responsible_name || '-')}</div>-> ${esc(m.to_responsible_name || '-')}</td><td class="table-td">${esc(m.document_number || '-')}<div class="tiny">${esc(m.note || '')}</div></td><td class="table-td">${esc(m.performed_by_name || '-')}</td><td class="table-td"><a data-link class="link" href="/assets/${m.asset}">Карточка</a></td></tr>`).join('') : '<tr><td colspan="7" class="empty">Записей пока нет</td></tr>'}
    </tbody></table>${pagination(page, rows.count, 25)}</div>${moveModal}`;
}
