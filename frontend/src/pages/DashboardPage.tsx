import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { dashboardApi } from '../api/endpoints';
import type { DashboardStats } from '../types';
import { RepairStatusBadge, RepairPriorityBadge } from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import PageHeader from '../components/PageHeader';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const STATUS_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats().then(({ data }) => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return null;

  const statusChartData = {
    labels: stats.status_distribution.map((s) => s.label),
    datasets: [{
      data: stats.status_distribution.map((s) => s.count),
      backgroundColor: STATUS_COLORS,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const categoryChartData = {
    labels: stats.category_distribution.map((c) => c.category__name || 'Без категории'),
    datasets: [{
      label: 'Кол-во',
      data: stats.category_distribution.map((c) => c.count),
      backgroundColor: '#3b82f6',
      borderRadius: 6,
    }],
  };

  const locationChartData = {
    labels: stats.assets_by_location.map((x) => x.location__name || '—'),
    datasets: [{
      label: 'Единиц техники',
      data: stats.assets_by_location.map((x) => x.count),
      backgroundColor: '#6366f1',
      borderRadius: 6,
    }],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { ticks: { font: { size: 11 } } },
    },
  };

  return (
    <div>
      <PageHeader title="Дашборд" subtitle="Обзор состояния парка техники" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-3xl font-bold text-brand-700">{stats.total_assets}</div>
            <div className="text-sm text-gray-500 mt-1">Всего техники</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-yellow-600">{stats.active_repairs}</div>
            <div className="text-sm text-gray-500 mt-1">Открытых ремонтов</div>
          </div>
          <Link
            to="/warehouse-stock"
            className="card block hover:ring-2 hover:ring-brand-400 hover:bg-brand-50/40 transition-all cursor-pointer text-inherit no-underline"
          >
            <div className="text-3xl font-bold text-indigo-600">{stats.warehouse_on_stock}</div>
            <div className="text-sm text-gray-500 mt-1">На складе</div>
            <div className="text-xs text-brand-600 mt-2 font-medium">Подробнее по категориям →</div>
          </Link>
          <div className="card">
            <div className="text-3xl font-bold text-green-600">
              {stats.status_distribution.find((s) => s.status === 'in_use')?.count ?? 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">В эксплуатации</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Структура парка по статусам</h3>
            {stats.status_distribution.length > 0 ? (
              <div className="flex justify-center">
                <div style={{ maxWidth: 220 }}>
                  <Doughnut data={statusChartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Нет данных</p>
            )}
          </div>

          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">Техника по категориям</h3>
            {stats.category_distribution.length > 0 ? (
              <Bar data={categoryChartData} options={barOptions} />
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Нет данных</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Техника по локациям (топ-8)</h3>
            <p className="text-xs text-gray-500 mb-3">
              Сколько единиц учёта привязано к каждой локации — удобно видеть размещение парка.
            </p>
            {stats.assets_by_location.length > 0 ? (
              <Bar data={locationChartData} options={barOptions} />
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Локации не заполнены</p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Последние заявки на ремонт</h3>
              <Link to="/repairs" className="text-xs text-brand-700 hover:underline">Все →</Link>
            </div>
            {stats.recent_repairs.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_repairs.map((r) => (
                  <Link
                    key={r.id}
                    to={`/repairs/${r.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{r.asset_name}</div>
                      <div className="text-xs text-gray-400">{r.asset_inventory}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RepairStatusBadge status={r.status as never} />
                      <RepairPriorityBadge priority={r.priority as never} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Заявок пока нет</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
