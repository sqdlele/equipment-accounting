import { dashboardApi } from '../api.js';
import { pageHeader, priorityBadge, repairBadge } from '../ui.js';
import { esc } from '../utils.js';
import { chartLater } from './shared.js';

export async function dashboardPage() {
  const stats = await dashboardApi.stats();
  const inUse = stats.status_distribution.find((x) => x.status === 'in_use')?.count || 0;
  chartLater('status-chart', 'doughnut', {
    labels: stats.status_distribution.map((x) => x.label),
    datasets: [{ data: stats.status_distribution.map((x) => x.count), backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'] }],
  }, { plugins: { legend: { position: 'bottom' } } });
  chartLater('cat-chart', 'bar', {
    labels: stats.category_distribution.map((x) => x.category__name || 'Без категории'),
    datasets: [{ label: 'Кол-во', data: stats.category_distribution.map((x) => x.count), backgroundColor: '#3b82f6' }],
  }, { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });
  chartLater('loc-chart', 'bar', {
    labels: stats.assets_by_location.map((x) => x.location__name || '-'),
    datasets: [{ label: 'Единиц техники', data: stats.assets_by_location.map((x) => x.count), backgroundColor: '#6366f1' }],
  }, { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });
  return `
    ${pageHeader('Дашборд', 'Обзор состояния парка техники')}
    <div class="content stack">
      <div class="grid grid-4">
        <div class="card"><div class="text-3xl font-bold text-blue">${stats.total_assets}</div><div class="muted">Всего техники</div></div>
        <div class="card"><div class="text-3xl font-bold text-yellow">${stats.active_repairs}</div><div class="muted">Открытых ремонтов</div></div>
        <a data-link href="/warehouse-stock" class="card"><div class="text-3xl font-bold text-indigo">${stats.warehouse_on_stock}</div><div class="muted">На складе</div><div class="tiny">Подробнее по категориям -></div></a>
        <div class="card"><div class="text-3xl font-bold text-green">${inUse}</div><div class="muted">В эксплуатации</div></div>
      </div>
      <div class="grid grid-3">
        <div class="card"><h3>Структура парка по статусам</h3><div class="chart-box"><canvas id="status-chart"></canvas></div></div>
        <div class="card span-2"><h3>Техника по категориям</h3><div class="chart-box"><canvas id="cat-chart"></canvas></div></div>
      </div>
      <div class="grid grid-2">
        <div class="card"><h3>Техника по локациям (топ-8)</h3><p class="tiny">Сколько единиц учёта привязано к каждой локации.</p><div class="chart-box"><canvas id="loc-chart"></canvas></div></div>
        <div class="card">
          <div class="row-between"><h3>Последние заявки на ремонт</h3><a data-link class="link" href="/repairs">Все -></a></div>
          <div class="stack">
            ${stats.recent_repairs.length ? stats.recent_repairs.map((r) => `
              <a data-link class="card" style="padding:12px" href="/repairs/${r.id}">
                <div class="row-between"><div><b>${esc(r.asset_name)}</b><div class="tiny mono">${esc(r.asset_inventory)}</div></div><div>${repairBadge(r.status)} ${priorityBadge(r.priority)}</div></div>
              </a>`).join('') : '<p class="empty">Заявок пока нет</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
}
