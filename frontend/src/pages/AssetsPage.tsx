import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assetsApi, categoriesApi, locationsApi } from '../api/endpoints';
import type { AssetListItem, Category, Location } from '../types';
import { AssetStatusBadge } from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/authStore';

const PAGE_SIZE = 20;

export default function AssetsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role !== 'readonly';

  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    categoriesApi.list().then(({ data }) => setCategories(data.results));
    locationsApi.list().then(({ data }) => setLocations(data.results));
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (locationFilter) params.location = locationFilter;
    const { data } = await assetsApi.list(params);
    setAssets(data.results);
    setCount(data.count);
    setLoading(false);
  }, [page, search, statusFilter, categoryFilter, locationFilter]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  return (
    <div>
      <PageHeader
        title="Техника"
        subtitle={`Всего: ${count}`}
        actions={
          canWrite ? (
            <Link to="/assets/new" className="btn-primary">
              + Добавить
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input
            type="text"
            className="input w-64"
            placeholder="Поиск по названию, инв. номеру..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input w-40"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Все статусы</option>
            <option value="warehouse">На складе</option>
            <option value="in_use">В эксплуатации</option>
            <option value="repair">В ремонте</option>
            <option value="written_off">Списан</option>
          </select>
          <select
            className="input w-44"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="input w-44"
            value={locationFilter}
            onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
          >
            <option value="">Все локации</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Найти</button>
          {(search || statusFilter || categoryFilter || locationFilter) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearch(''); setStatusFilter(''); setCategoryFilter(''); setLocationFilter(''); setPage(1);
              }}
            >
              Сбросить
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Инв. номер</th>
                  <th className="table-th">Наименование</th>
                  <th className="table-th">Категория</th>
                  <th className="table-th">Статус</th>
                  <th className="table-th">Локация</th>
                  <th className="table-th">Ответственный</th>
                  <th className="table-th w-16"></th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      Записи не найдены
                    </td>
                  </tr>
                ) : assets.map((asset) => (
                  <tr key={asset.id} className="table-tr">
                    <td className="table-td">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {asset.inventory_number}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="font-medium text-gray-900">{asset.name}</div>
                      {asset.model && <div className="text-xs text-gray-400">{asset.model}</div>}
                    </td>
                    <td className="table-td text-gray-500">{asset.category_name || '—'}</td>
                    <td className="table-td">
                      <AssetStatusBadge status={asset.status} />
                    </td>
                    <td className="table-td text-gray-500">{asset.location_name || '—'}</td>
                    <td className="table-td text-gray-500">{asset.responsible_employee_name || '—'}</td>
                    <td className="table-td">
                      <button
                        onClick={() => navigate(`/assets/${asset.id}`)}
                        className="text-brand-700 hover:text-brand-900 text-sm font-medium"
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
