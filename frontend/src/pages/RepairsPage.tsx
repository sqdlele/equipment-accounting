import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { repairsApi, assetsApi, employeesApi } from '../api/endpoints';
import type { RepairTicket, AssetListItem, Employee } from '../types';
import { RepairStatusBadge, RepairPriorityBadge } from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/authStore';

const PAGE_SIZE = 20;

export default function RepairsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role !== 'readonly';

  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newTicket, setNewTicket] = useState({
    asset: searchParams.get('asset') || '',
    priority: 'medium',
    description: '',
    defect_type: '',
    assigned_to: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === '1') setShowModal(true);
  }, [searchParams]);

  useEffect(() => {
    assetsApi.list({ page_size: 200 }).then(({ data }) => setAssets(data.results));
    employeesApi.list({ page_size: 200 }).then(({ data }) => setEmployees(data.results));
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (search) params.search = search;
    const { data } = await repairsApi.list(params);
    setTickets(data.results);
    setCount(data.count);
    setLoading(false);
  }, [page, statusFilter, priorityFilter, search]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data } = await repairsApi.create({
      asset: Number(newTicket.asset) as never,
      priority: newTicket.priority as never,
      description: newTicket.description,
      defect_type: newTicket.defect_type,
      assigned_to: newTicket.assigned_to ? Number(newTicket.assigned_to) as never : undefined,
    });
    setSaving(false);
    setShowModal(false);
    navigate(`/repairs/${data.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Заявки на ремонт"
        subtitle={`Всего: ${count}`}
        actions={
          canWrite ? (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              + Создать заявку
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            className="input w-64"
            placeholder="Поиск по описанию, инв. номеру..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="input w-40"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Все статусы</option>
            <option value="open">Открыт</option>
            <option value="in_progress">В работе</option>
            <option value="waiting_parts">Ожид. запчастей</option>
            <option value="resolved">Решён</option>
            <option value="closed">Закрыт</option>
          </select>
          <select
            className="input w-36"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          >
            <option value="">Все приоритеты</option>
            <option value="critical">Критический</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th w-12">#</th>
                  <th className="table-th">Техника</th>
                  <th className="table-th">Описание дефекта</th>
                  <th className="table-th">Статус</th>
                  <th className="table-th">Приоритет</th>
                  <th className="table-th">Исполнитель</th>
                  <th className="table-th">Создан</th>
                  <th className="table-th" title="Часы от создания заявки до сейчас (или до решения)">
                    Простой (ч.)
                  </th>
                  <th className="table-th w-16"></th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">Заявок не найдено</td>
                  </tr>
                ) : tickets.map((t) => (
                  <tr key={t.id} className="table-tr">
                    <td className="table-td text-gray-400 text-xs">{t.id}</td>
                    <td className="table-td">
                      <Link to={`/assets/${t.asset}`} className="font-medium text-brand-700 hover:underline">
                        {t.asset_name}
                      </Link>
                      <div className="text-xs text-gray-400 font-mono">{t.asset_inventory}</div>
                    </td>
                    <td className="table-td max-w-xs">
                      <div className="truncate text-sm">{t.description}</div>
                      {t.defect_type && <div className="text-xs text-gray-400">{t.defect_type}</div>}
                    </td>
                    <td className="table-td"><RepairStatusBadge status={t.status} /></td>
                    <td className="table-td"><RepairPriorityBadge priority={t.priority} /></td>
                    <td className="table-td text-gray-500 text-sm">{t.assigned_to_name || '—'}</td>
                    <td className="table-td text-gray-400 text-xs">
                      {new Date(t.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="table-td text-center">
                      <span className={t.downtime_hours > 24 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {t.downtime_hours}
                      </span>
                    </td>
                    <td className="table-td">
                      <Link to={`/repairs/${t.id}`} className="text-brand-700 hover:text-brand-900 text-sm font-medium">
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Создать заявку на ремонт">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Техника *</label>
            <select
              className="input"
              value={newTicket.asset}
              onChange={(e) => setNewTicket((f) => ({ ...f, asset: e.target.value }))}
              required
            >
              <option value="">— Выберите технику —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.inventory_number} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Приоритет</label>
              <select
                className="input"
                value={newTicket.priority}
                onChange={(e) => setNewTicket((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="critical">Критический</option>
              </select>
            </div>
            <div>
              <label className="label">Тип дефекта</label>
              <input
                className="input"
                value={newTicket.defect_type}
                onChange={(e) => setNewTicket((f) => ({ ...f, defect_type: e.target.value }))}
                placeholder="Механическая поломка"
              />
            </div>
          </div>
          <div>
            <label className="label">Исполнитель</label>
            <select
              className="input"
              value={newTicket.assigned_to}
              onChange={(e) => setNewTicket((f) => ({ ...f, assigned_to: e.target.value }))}
            >
              <option value="">— Назначить позже —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Описание дефекта *</label>
            <textarea
              className="input h-24 resize-none"
              value={newTicket.description}
              onChange={(e) => setNewTicket((f) => ({ ...f, description: e.target.value }))}
              required
              placeholder="Опишите неисправность подробно..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Создание...' : 'Создать заявку'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Отмена</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
