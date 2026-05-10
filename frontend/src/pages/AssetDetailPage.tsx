import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assetsApi, repairsApi } from '../api/endpoints';
import type { AssetDetail, RepairTicket } from '../types';
import { AssetStatusBadge, RepairStatusBadge, RepairPriorityBadge } from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/authStore';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role !== 'readonly';

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'repairs'>('info');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      assetsApi.detail(Number(id)),
      repairsApi.list({ asset: Number(id), page_size: 50 }),
    ]).then(([assetRes, repairsRes]) => {
      setAsset(assetRes.data);
      setRepairs(repairsRes.data.results);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!asset) return;
    await assetsApi.delete(asset.id);
    navigate('/assets');
  };

  if (loading) return <Spinner />;
  if (!asset) return (
    <div className="p-6 text-center text-gray-400">Запись не найдена</div>
  );

  const tabs = [
    { key: 'info', label: 'Информация' },
    { key: 'history', label: `История (${asset.history.length})` },
    { key: 'repairs', label: `Ремонты (${repairs.length})` },
  ] as const;

  return (
    <div>
      <PageHeader
        title={asset.name}
        subtitle={`Инв. №${asset.inventory_number}`}
        actions={
          <div className="flex gap-2">
            <Link to="/assets" className="btn-secondary">← Назад</Link>
            {canWrite && (
              <>
                <Link to={`/assets/${asset.id}/edit`} className="btn-secondary">Редактировать</Link>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="btn-danger"
                >
                  Удалить
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Delete confirm */}
        {confirmDelete && (
          <div className="card border-red-200 bg-red-50">
            <p className="text-red-800 font-medium mb-3">Удалить «{asset.name}»? Это действие необратимо.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="btn-danger">Да, удалить</button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">Отмена</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: photo + QR */}
          <div className="space-y-4">
            <div className="card flex flex-col items-center">
              {asset.photo ? (
                <img src={asset.photo} alt={asset.name} className="w-full h-48 object-cover rounded-lg mb-4" />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-5xl text-gray-300">🖥</span>
                </div>
              )}
              <AssetStatusBadge status={asset.status} />
            </div>

            {asset.qr_code && (
              <div className="card flex flex-col items-center">
                <p className="text-xs text-gray-500 mb-3 font-medium">QR-код</p>
                <img src={asset.qr_code} alt="QR" className="w-40 h-40" />
                <a
                  href={asset.qr_code}
                  download={`qr_${asset.inventory_number}.png`}
                  className="btn-secondary mt-3 text-xs"
                >
                  Скачать QR
                </a>
              </div>
            )}
          </div>

          {/* Right: tabs */}
          <div className="lg:col-span-2">
            <div className="card p-0 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'border-b-2 border-brand-700 text-brand-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'info' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['Инвентарный номер', asset.inventory_number],
                      ['Серийный номер', asset.serial_number || '—'],
                      ['Модель', asset.model || '—'],
                      ['Категория', asset.category_name || '—'],
                      ['Производитель', asset.manufacturer_name || '—'],
                      ['Статус', asset.status_display],
                      ['Локация', asset.location_name || '—'],
                      ['Год изготовления', asset.manufacture_year?.toString() ?? '—'],
                      ['Ответственный', asset.responsible_employee_name || '—'],
                      ['Дата покупки', asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('ru-RU') : '—'],
                      ['Стоимость', asset.price ? `${Number(asset.price).toLocaleString('ru-RU')} ₽` : '—'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                      </div>
                    ))}
                    {asset.description && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-400 mb-1">Описание/Конфигурация</div>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                          {asset.description}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    {asset.history.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">История пуста</p>
                    ) : (
                      <div className="space-y-3">
                        {asset.history.map((h) => (
                          <div key={h.id} className="flex gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-800">{h.field_changed}</span>
                                {h.old_value && (
                                  <>
                                    <span className="text-gray-400 line-through text-xs">{h.old_value}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-gray-700 text-xs">{h.new_value}</span>
                                  </>
                                )}
                              </div>
                              {h.note && <div className="text-xs text-gray-500 mt-0.5">{h.note}</div>}
                              <div className="text-xs text-gray-400 mt-0.5">
                                {h.changed_by_name || 'Система'} · {new Date(h.changed_at).toLocaleString('ru-RU')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'repairs' && (
                  <div>
                    {canWrite && (
                      <Link
                        to={`/repairs?create=1&asset=${asset.id}`}
                        className="btn-primary mb-4 inline-flex"
                      >
                        + Создать заявку
                      </Link>
                    )}
                    {repairs.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">Ремонтов не было</p>
                    ) : (
                      <div className="space-y-3">
                        {repairs.map((r) => (
                          <Link
                            key={r.id}
                            to={`/repairs/${r.id}`}
                            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-sm">Заявка #{r.id}</span>
                              <div className="flex gap-1">
                                <RepairStatusBadge status={r.status} />
                                <RepairPriorityBadge priority={r.priority} />
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2">{r.description}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(r.created_at).toLocaleDateString('ru-RU')} · Простой: {r.downtime_hours} ч.
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
