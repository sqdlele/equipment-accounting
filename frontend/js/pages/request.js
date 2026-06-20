import { assetsApi, repairsApi } from '../api.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { alert, pageHeader } from '../ui.js';
import { esc, formToObject } from '../utils.js';
import { opt, options } from './shared.js';

export async function requestPage() {
  const assets = await assetsApi.list({ page_size: 500, ordering: 'inventory_number' });
  setTimeout(() => {
    document.getElementById('user-request-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const box = document.getElementById('request-result');
      box.innerHTML = '';
      const data = formToObject(event.currentTarget);
      try {
        const ticket = await repairsApi.create({
          asset: Number(data.asset),
          priority: data.priority || 'medium',
          defect_type: data.defect_type || 'Заявка пользователя',
          description: [
            `Заявитель: ${data.requester_name || 'не указан'}`,
            data.requester_contact ? `Контакт: ${data.requester_contact}` : '',
            data.location_note ? `Место/кабинет: ${data.location_note}` : '',
            '',
            data.description,
          ].filter(Boolean).join('\n'),
        });
        box.innerHTML = alert(`Заявка #${ticket.id} создана. Сисадмин увидит её в разделе «Ремонты».`, 'blue');
        event.currentTarget.reset();
        setTimeout(() => navigate(`/repairs/${ticket.id}`), 1200);
      } catch (err) {
        box.innerHTML = alert(err.message || 'Не удалось создать заявку');
      }
    });
  }, 0);

  return `
    ${pageHeader('Заявка пользователя', 'Сообщите о неисправности техники или необходимости проверки')}
    <div class="content stack request-page">
      <div class="grid grid-4 request-flow">
        ${flowStep('request', '1. Пользователь', 'Описывает проблему и указывает технику.')}
        ${flowStep('repair', '2. Сисадмин', 'Проверяет проблему, принимает технику и назначает действия.')}
        ${flowStep('settings', '3. Мастерская', 'Выполняет ремонт или замену БП, диска, кабеля и других узлов.')}
        ${flowStep('check', '4. Возврат', 'Сисадмин связывается с техником и возвращает исправную технику пользователю.')}
      </div>

      <div class="grid grid-3">
        <form id="user-request-form" class="card stack span-2">
          <div id="request-result"></div>
          <div>
            <label class="label">Техника *</label>
            <select class="input" name="asset" required>
              ${opt('', '- Выберите технику -', '')}
              ${options(assets.results || [], '', (x) => `${x.inventory_number} - ${x.name}${x.model ? ` (${x.model})` : ''}`)}
            </select>
            <p class="tiny">Если нужной техники нет в списке, укажите это в описании проблемы.</p>
          </div>
          <div class="grid grid-2">
            <div><label class="label">Ваше ФИО</label><input class="input" name="requester_name" placeholder="Например, Иванов Иван"></div>
            <div><label class="label">Контакт</label><input class="input" name="requester_contact" placeholder="Телефон, почта или кабинет"></div>
          </div>
          <div class="grid grid-2">
            <div><label class="label">Тип проблемы</label><input class="input" name="defect_type" placeholder="Не включается, шумит, нет изображения..."></div>
            <div><label class="label">Приоритет</label><select class="input" name="priority">${opt('low', 'Низкий', 'medium')}${opt('medium', 'Средний', 'medium')}${opt('high', 'Высокий', 'medium')}${opt('critical', 'Критический', 'medium')}</select></div>
          </div>
          <div><label class="label">Где находится техника</label><input class="input" name="location_note" placeholder="Кабинет, отдел, рабочее место"></div>
          <div><label class="label">Описание проблемы *</label><textarea class="input" name="description" required placeholder="Опишите, что случилось, когда началась проблема, что уже пробовали сделать..."></textarea></div>
          <div class="row"><button class="btn-primary">Отправить заявку</button><a data-link class="btn-secondary" href="/repairs">К журналу ремонтов</a></div>
        </form>

        <div class="card info">
          <h3>Что будет дальше</h3>
          <p>После отправки заявка попадает в журнал ремонтов со статусом «Открыт».</p>
          <p>Сисадмин проверяет технику, при необходимости передаёт её в мастерскую, фиксирует выполненные работы и закрывает заявку после возврата пользователю.</p>
        </div>
      </div>
    </div>
  `;
}

function flowStep(iconName, title, text) {
  return `
    <div class="card request-step">
      <div class="request-step-icon">${icon(iconName, 'icon-lg')}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
    </div>
  `;
}
