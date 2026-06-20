import { assetsApi, repairsApi } from '../api.js';
import { pageHeader, downloadBlob } from '../ui.js';

export async function reportsPage() {
  setTimeout(() => {
    document.getElementById('export-assets-xlsx')?.addEventListener('click', async () => downloadBlob(await assetsApi.exportExcel(), 'инвентаризация.xlsx'));
    document.getElementById('export-assets-pdf')?.addEventListener('click', async () => downloadBlob(await assetsApi.exportPdf(), 'инвентаризация.pdf'));
    document.getElementById('export-repairs-xlsx')?.addEventListener('click', async () => downloadBlob(await repairsApi.exportExcel(), 'журнал_ремонтов.xlsx'));
    document.getElementById('import-template')?.addEventListener('click', async () => downloadBlob(await assetsApi.importTemplate(), 'шаблон_импорта_техники.xlsx'));
    document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const data = await assetsApi.importExcel(file);
      const err = data.errors?.length ? `\nПредупреждения:\n${data.errors.map((x) => `${x.row ? `Стр. ${x.row}: ` : ''}${x.message}`).join('\n')}` : '';
      document.getElementById('import-msg').textContent = `Создано: ${data.created}, обновлено: ${data.updated}.${err}`;
    });
  }, 0);
  return `
    ${pageHeader('Отчёты и экспорт', 'Формирование инвентаризационных ведомостей и журналов')}
    <div class="content stack" style="max-width:900px">
      <div class="card"><h3>Инвентаризационная ведомость</h3><p class="muted">Полный список техники с характеристиками, статусами, локациями и ответственными.</p><div class="row"><button id="export-assets-xlsx" class="btn-primary">Скачать Excel</button><button id="export-assets-pdf" class="btn-secondary">Скачать PDF</button></div></div>
      <div class="card"><h3>Импорт техники из Excel</h3><p class="muted">Создание и обновление по инвентарному номеру.</p><div class="row"><button id="import-template" class="btn-secondary">Скачать шаблон</button><button id="import-btn" class="btn-primary">Загрузить .xlsx</button><input id="import-file" class="hidden" type="file" accept=".xlsx"></div><pre id="import-msg" class="alert blue" style="margin-top:12px"></pre></div>
      <div class="card"><h3>Журнал ремонтов</h3><p class="muted">Все заявки на ремонт: техника, дефект, исполнитель, время простоя, статус.</p><button id="export-repairs-xlsx" class="btn-primary">Скачать Excel</button></div>
      <div class="card info"><h3>Как используются отчёты</h3><ul><li>Excel-ведомость открывается в Microsoft Excel или LibreOffice Calc</li><li>PDF-ведомость подходит для печати</li><li>Данные актуальны на момент формирования</li></ul></div>
    </div>`;
}
