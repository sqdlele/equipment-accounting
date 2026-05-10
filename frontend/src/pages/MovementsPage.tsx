import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { movementsApi, assetsApi, locationsApi, employeesApi } from '../api/endpoints';
import type { AssetMovement, AssetListItem, Location, Employee } from '../types';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';
import { useAuthStore } from '../store/authStore';

const PAGE_SIZE = 25;

function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU');
}

export default function MovementsPage() {
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role !== 'readonly';

  const [rows, setRows] = useState<AssetMovement[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assetFilter, setAssetFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    asset: '',
    to_location: '',
    to_responsible_employee: '',
    document_number: '',
    note: '',
  });

  useEffect(() => {
    Promise.all([
      assetsApi.list({ page_size: 500 }),
      locationsApi.list(),
      employeesApi.list({ page_size: 300, is_active: 'true' }),
    ]).then(([a, l, e]) => {
      setAssets(a.data.results);
      setLocations(l.data.results);
      setEmployees(e.data.results);
    });
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
    if (assetFilter) params.asset = assetFilter;
    const { data } = await movementsApi.list(params);
    setRows(data.results);
    setCount(data.count);
    setLoading(false);
  }, [page, assetFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openCreate = () => {
    setFormError(null);
    setForm({
      asset: '',
      to_location: '',
      to_responsible_employee: '',
      document_number: '',
      note: '',
    });
    setShowForm(true);
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const assetId = Number(form.asset);
    if (!assetId) {
      setFormError('Выберите технику');
      return;
    }
    setSubmitting(true);
    try {
      await movementsApi.create({
        asset: assetId,
        to_location: form.to_location ? Number(form.to_location) : null,
        to_responsible_employee: form.to_responsible_employee ? Number(form.to_responsible_employee) : null,
        document_number: form.document_number.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      setShowForm(false);
      setPage(1);
      fetchRows();
    } catch (err: unknown) {
      const d = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
      if (typeof d === 'object' && d) {
        const parts = Object.entries(d).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${v}`],
        );
        setFormError(parts.join('\n'));
      } else {
        setFormError('Не удалось сохранить запись.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Журнал перемещений"
        subtitle="Передачи между локациями и смена ответственного"
        actions={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              + Оформить перемещение
            </button>
          ) : undefined
        }
      />

      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Фильтр по единице</label>
          <select
            className="input w-72"
            value={assetFilter}
            onChange={(e) => { setAssetFilter(e.target.value); setPage(1); }}
          >
            <option value="">Вся техника</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.inventory_number} — {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showForm && canWrite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Новая запись в журнале</h3>
            <p className="text-sm text-gray-500 mb-4">
              Укажите новую локацию и/или ответственного. Текущие значения берутся из карточки техники
              и сохраняются в колонках «было».
            </p>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-wrap">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmitMovement} className="space-y-3">
              <div>
                <label className="label">Техника *</label>
                <select
                  className="input"
                  required
                  value={form.asset}
                  onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value }))}
                >
                  <option value="">— Выберите —</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.inventory_number} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Локация (куда)</label>
                <select
                  className="input"
                  value={form.to_location}
                  onChange={(e) => setForm((f) => ({ ...f, to_location: e.target.value }))}
                >
                  <option value="">— Не закреплено —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ответственный (кому)</label>
                <select
                  className="input"
                  value={form.to_responsible_employee}
                  onChange={(e) => setForm((f) => ({ ...f, to_responsible_employee: e.target.value }))}
                >
                  <option value="">— Не назначено —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Номер документа (накладная, акт)</label>
                <input
                  className="input"
                  value={form.document_number}
                  onChange={(e) => setForm((f) => ({ ...f, document_number: e.target.value }))}
                  placeholder="Напр. ТН-0042 от 09.05.2026"
                />
              </div>
              <div>
                <label className="label">Комментарий</label>
                <textarea
                  className="input h-20 resize-none"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Сохранение...' : 'Записать'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white">
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto px-6 py-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Дата</th>
                  <th className="table-th">Техника</th>
                  <th className="table-th">Откуда → Куда</th>
                  <th className="table-th">Ответственный</th>
                  <th className="table-th">Документ</th>
                  <th className="table-th">Оформил</th>
                  <th className="table-th w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      Записей пока нет
                    </td>
                  </tr>
                ) : (
                  rows.map((m) => (
                    <tr key={m.id} className="table-tr">
                      <td className="table-td whitespace-nowrap text-gray-600">{fmtDt(m.created_at)}</td>
                      <td className="table-td">
                        <div className="font-medium text-gray-900">{m.asset_inventory_number}</div>
                        <div className="text-xs text-gray-500">{m.asset_name}</div>
                      </td>
                      <td className="table-td text-gray-700">
                        <span title="Было">{m.from_location_name || '—'}</span>
                        <span className="mx-1 text-brand-600">→</span>
                        <span title="Стало">{m.to_location_name || '—'}</span>
                      </td>
                      <td className="table-td text-gray-600">
                        <div className="text-xs">{m.from_responsible_name || '—'}</div>
                        <div className="text-brand-700">→ {m.to_responsible_name || '—'}</div>
                      </td>
                      <td className="table-td text-gray-600 max-w-[180px]">
                        <div>{m.document_number || '—'}</div>
                        {m.note && <div className="text-xs text-gray-400 mt-0.5 truncate" title={m.note}>{m.note}</div>}
                      </td>
                      <td className="table-td text-gray-500 text-xs">{m.performed_by_name || '—'}</td>
                      <td className="table-td">
                        <Link to={`/assets/${m.asset}`} className="text-brand-700 hover:underline font-medium">
                          Карточка
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
