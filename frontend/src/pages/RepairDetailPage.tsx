import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { repairsApi, employeesApi } from '../api/endpoints';
import type { RepairTicket, Employee, AssetListItem } from '../types';
import { RepairStatusBadge, RepairPriorityBadge } from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/authStore';

export default function RepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role !== 'readonly';

  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [workDesc, setWorkDesc] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [addingWork, setAddingWork] = useState(false);

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [candidates, setCandidates] = useState<AssetListItem[]>([]);
  const [candLoading, setCandLoading] = useState(false);
  const [showAllWarehouse, setShowAllWarehouse] = useState(false);
  const [replacementId, setReplacementId] = useState('');
  const [replacePartsNote, setReplacePartsNote] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [replaceErr, setReplaceErr] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const [ticketRes, empRes] = await Promise.all([
      repairsApi.detail(Number(id)),
      employeesApi.list({ page_size: 200 }),
    ]);
    setTicket(ticketRes.data);
    setEmployees(empRes.data.results);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!replaceOpen || !id) return;
    let cancelled = false;
    setCandLoading(true);
    setReplaceErr(null);
    repairsApi.replacementCandidates(Number(id), { all: showAllWarehouse }).then(({ data }) => {
      if (!cancelled) {
        setCandidates(data);
        setReplacementId('');
      }
    }).finally(() => {
      if (!cancelled) setCandLoading(false);
    });
    return () => { cancelled = true; };
  }, [replaceOpen, showAllWarehouse, id]);

  const updateStatus = async (status: string) => {
    if (!ticket) return;
    const { data } = await repairsApi.update(ticket.id, { status: status as never });
    setTicket(data);
  };

  const updateAssigned = async (empId: string) => {
    if (!ticket) return;
    const { data } = await repairsApi.update(ticket.id, {
      assigned_to: empId ? Number(empId) as never : null,
    });
    setTicket(data);
  };

  const addWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setAddingWork(true);
    await repairsApi.addWork(ticket.id, {
      work_description: workDesc,
      parts_used: partsUsed,
    });
    setWorkDesc('');
    setPartsUsed('');
    setAddingWork(false);
    load();
  };

  const submitReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replacementId) return;
    setReplacing(true);
    setReplaceErr(null);
    try {
      const { data } = await repairsApi.replaceFromWarehouse(ticket.id, {
        replacement_asset_id: Number(replacementId),
        parts_note: replacePartsNote.trim() || undefined,
      });
      setTicket(data);
      setReplaceOpen(false);
      setReplacementId('');
      setReplacePartsNote('');
    } catch (err: unknown) {
      const d = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
      if (d && typeof d === 'object') {
        const msg = Object.entries(d).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${v}`],
        ).join('\n');
        setReplaceErr(msg || 'Ошибка замены');
      } else {
        setReplaceErr('Не удалось выполнить замену.');
      }
    } finally {
      setReplacing(false);
    }
  };

  if (loading) return <Spinner />;
  if (!ticket) return <div className="p-6 text-center text-gray-400">Заявка не найдена</div>;

  const isActive = !['resolved', 'closed'].includes(ticket.status);

  const nextStatuses: Record<string, { value: string; label: string; className: string }[]> = {
    open: [{ value: 'in_progress', label: 'Взять в работу', className: 'btn-primary' }],
    in_progress: [
      { value: 'waiting_parts', label: 'Ожидание запчастей', className: 'btn-secondary' },
      { value: 'resolved', label: 'Отметить решённой', className: 'btn-success' },
    ],
    waiting_parts: [{ value: 'in_progress', label: 'Вернуть в работу', className: 'btn-primary' }],
    resolved: [{ value: 'closed', label: 'Закрыть заявку', className: 'btn-secondary' }],
    closed: [],
  };

  return (
    <div>
      <PageHeader
        title={`Заявка #${ticket.id}`}
        subtitle={`${ticket.asset_inventory} — ${ticket.asset_name}`}
        actions={<Link to="/repairs" className="btn-secondary">← К заявкам</Link>}
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex gap-2">
                <RepairStatusBadge status={ticket.status} />
                <RepairPriorityBadge priority={ticket.priority} />
              </div>
              {canWrite && isActive && (
                <div className="flex gap-2 flex-wrap justify-end">
                  {(nextStatuses[ticket.status] || []).map((s) => (
                    <button key={s.value} type="button" onClick={() => updateStatus(s.value)} className={s.className}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Описание дефекта</div>
                <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{ticket.description}</div>
              </div>
              {ticket.defect_type && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Тип дефекта</div>
                  <div className="text-sm text-gray-700">{ticket.defect_type}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400">Зарегистрировал</div>
                  <div className="font-medium">{ticket.reported_by_name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Создана</div>
                  <div className="font-medium">{new Date(ticket.created_at).toLocaleString('ru-RU')}</div>
                </div>
                {ticket.resolved_at && (
                  <div>
                    <div className="text-xs text-gray-400">Решена</div>
                    <div className="font-medium">{new Date(ticket.resolved_at).toLocaleString('ru-RU')}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Время простоя</div>
                  <div className={`font-medium ${ticket.downtime_hours > 24 ? 'text-red-600' : ''}`}>
                    {ticket.downtime_hours} ч.
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Считается от момента создания заявки до текущего времени; после закрытия заявки —
                    до отметки «Решена». Показывает, сколько часов техника была в простое по этой заявке.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {canWrite && isActive && (
            <div className="card border-indigo-100 bg-indigo-50/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Замена со склада</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Выданная со склада техника получает локацию и ответственного неисправной;
                    неисправная возвращается на склад (учёт запаса). Заявка дальше ведётся уже по новой единице.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary whitespace-nowrap"
                  onClick={() => { setReplaceOpen((v) => !v); setReplaceErr(null); }}
                >
                  {replaceOpen ? 'Скрыть' : 'Заменить технику'}
                </button>
              </div>

              {replaceOpen && (
                <form onSubmit={submitReplace} className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllWarehouse}
                      onChange={(e) => setShowAllWarehouse(e.target.checked)}
                    />
                    Показывать весь склад (не только ту же категорию)
                  </label>
                  {replaceErr && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2 whitespace-pre-wrap">
                      {replaceErr}
                    </div>
                  )}
                  {candLoading ? (
                    <p className="text-sm text-gray-500">Загрузка списка…</p>
                  ) : candidates.length === 0 ? (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      На складе нет подходящей техники
                      {!showAllWarehouse ? ' в этой категории. Включите «весь склад» или заведите новую единицу.' : '.'}
                    </p>
                  ) : (
                    <>
                      <div>
                        <label className="label">Техника со склада</label>
                        <select
                          className="input"
                          required
                          value={replacementId}
                          onChange={(e) => setReplacementId(e.target.value)}
                        >
                          <option value="">— Выберите —</option>
                          {candidates.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.inventory_number} — {a.name}{a.model ? ` (${a.model})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Комментарий к замене (необязательно)</label>
                        <input
                          className="input"
                          value={replacePartsNote}
                          onChange={(e) => setReplacePartsNote(e.target.value)}
                          placeholder="Напр. № расходной накладной"
                        />
                      </div>
                      <button type="submit" className="btn-success" disabled={replacing || !replacementId}>
                        {replacing ? 'Выполняется…' : 'Подтвердить замену'}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Журнал выполненных работ</h3>
            {ticket.works.length === 0 ? (
              <p className="text-gray-400 text-sm">Работы ещё не внесены</p>
            ) : (
              <div className="space-y-3 mb-4">
                {ticket.works.map((w) => (
                  <div key={w.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{w.performed_by_name || 'Не указан'}</span>
                      <span>{new Date(w.performed_at).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="text-sm text-gray-800">{w.work_description}</div>
                    {w.parts_used && (
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Запчасти / примечание:</span> {w.parts_used}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canWrite && isActive && (
              <form onSubmit={addWork} className="border-t border-gray-100 pt-4 space-y-3">
                <div className="text-sm font-medium text-gray-700">Добавить запись о работе</div>
                <textarea
                  className="input h-20 resize-none"
                  placeholder="Описание выполненных работ..."
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder="Использованные запчасти (необязательно)"
                  value={partsUsed}
                  onChange={(e) => setPartsUsed(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={addingWork}>
                  {addingWork ? 'Добавление...' : 'Добавить запись'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Исполнитель</h4>
            {canWrite && isActive ? (
              <select
                className="input"
                value={ticket.assigned_to?.toString() || ''}
                onChange={(e) => updateAssigned(e.target.value)}
              >
                <option value="">— Не назначен —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            ) : (
              <div className="text-sm text-gray-700">{ticket.assigned_to_name || 'Не назначен'}</div>
            )}
          </div>

          <div className="card">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Техника по заявке</h4>
            <Link
              to={`/assets/${ticket.asset}`}
              className="text-sm text-brand-700 hover:underline font-medium"
            >
              {ticket.asset_name}
            </Link>
            <div className="text-xs text-gray-400 font-mono mt-1">{ticket.asset_inventory}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
