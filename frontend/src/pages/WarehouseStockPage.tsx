import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetsApi } from '../api/endpoints';
import type { WarehouseSummary } from '../types';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';

function categoryKey(c: WarehouseSummary['categories'][0], index: number) {
  return `${c.category_id ?? 'none'}_${index}`;
}

export default function WarehouseStockPage() {
  const [data, setData] = useState<WarehouseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    assetsApi.warehouseSummary().then(({ data: d }) => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggle = (key: string) => {
    setOpen((o) => ({ ...o, [key]: !o[key] }));
  };

  if (loading) return <Spinner />;
  if (!data) return <div className="p-6 text-gray-400">Не удалось загрузить данные</div>;

  return (
    <div>
      <PageHeader
        title="Техника на складе"
        subtitle={`Всего единиц со статусом «На складе»: ${data.total_on_warehouse}`}
        actions={<Link to="/" className="btn-secondary">← На дашборд</Link>}
      />

      <div className="p-6 max-w-3xl space-y-3">
        {data.categories.length === 0 ? (
          <p className="text-gray-400 text-sm">На складе пока ничего не учитывается.</p>
        ) : (
          data.categories.map((cat, idx) => {
            const key = categoryKey(cat, idx);
            const expanded = open[key];
            const totalInCat = cat.models.reduce((s, m) => s + m.count, 0);
            return (
              <div key={key} className="card p-0 overflow-hidden border border-gray-200">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => toggle(key)}
                >
                  <span className="font-semibold text-gray-900">{cat.category_name}</span>
                  <span className="text-sm text-gray-500">
                    {totalInCat} шт. <span className="text-brand-600 ml-2">{expanded ? '▼' : '▶'}</span>
                  </span>
                </button>
                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                          <th className="pb-2 font-medium">Модель</th>
                          <th className="pb-2 font-medium w-24 text-right">Кол-во</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.models.map((row) => (
                          <tr key={row.model} className="border-t border-gray-100">
                            <td className="py-2 text-gray-800">{row.model}</td>
                            <td className="py-2 text-right font-mono text-gray-700">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
