import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  assetsApi, categoriesApi, manufacturersApi, locationsApi, employeesApi,
} from '../api/endpoints';
import type {
  AssetDetail, Category, Manufacturer, Location, Employee,
} from '../types';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';

export default function AssetFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    inventory_number: '',
    serial_number: '',
    name: '',
    model: '',
    category: '',
    manufacturer: '',
    status: 'warehouse',
    location: '',
    manufacture_year: '',
    responsible_employee: '',
    purchase_date: '',
    price: '',
    description: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      categoriesApi.list(),
      manufacturersApi.list(),
      locationsApi.list(),
      employeesApi.list({ page_size: 200, is_active: 'true' }),
    ]).then(([cats, mans, locs, emps]) => {
      setCategories(cats.data.results);
      setManufacturers(mans.data.results);
      setLocations(locs.data.results);
      setEmployees(emps.data.results);
    });

    if (isEdit && id) {
      assetsApi.detail(Number(id)).then(({ data }: { data: AssetDetail }) => {
        setForm({
          inventory_number: data.inventory_number,
          serial_number: data.serial_number || '',
          name: data.name,
          model: data.model || '',
          category: data.category?.toString() ?? '',
          manufacturer: data.manufacturer?.toString() ?? '',
          status: data.status,
          location: data.location?.toString() ?? '',
          manufacture_year: data.manufacture_year?.toString() ?? '',
          responsible_employee: data.responsible_employee?.toString() ?? '',
          purchase_date: data.purchase_date || '',
          price: data.price || '',
          description: data.description || '',
        });
        if (data.photo) setPhotoPreview(data.photo);
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) {
        fd.append(key, val);
      }
    });
    if (photo) fd.append('photo', photo);

    try {
      if (isEdit && id) {
        await assetsApi.update(Number(id), fd);
        navigate(`/assets/${id}`);
      } else {
        const { data } = await assetsApi.create(fd);
        navigate(`/assets/${data.id}`);
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (detail) {
        const msgs = Object.entries(detail).map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join('\n'));
      } else {
        setError('Ошибка при сохранении. Проверьте данные.');
      }
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Редактировать карточку' : 'Новая единица техники'}
        actions={<Link to={isEdit ? `/assets/${id}` : '/assets'} className="btn-secondary">Отмена</Link>}
      />

      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-800">Основная информация</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Инвентарный номер *">
                  <input name="inventory_number" className="input" value={form.inventory_number}
                    onChange={handleChange} required placeholder="IRZ-PC-001" />
                </Field>
                <Field label="Серийный номер">
                  <input name="serial_number" className="input" value={form.serial_number}
                    onChange={handleChange} placeholder="SN123456" />
                </Field>
                <Field label="Наименование *">
                  <input name="name" className="input" value={form.name}
                    onChange={handleChange} required placeholder="ПК рабочая станция" />
                </Field>
                <Field label="Модель">
                  <input name="model" className="input" value={form.model}
                    onChange={handleChange} placeholder="OptiPlex 7090" />
                </Field>
                <Field label="Категория">
                  <select name="category" className="input" value={form.category} onChange={handleChange}>
                    <option value="">— Выберите —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Производитель">
                  <select name="manufacturer" className="input" value={form.manufacturer} onChange={handleChange}>
                    <option value="">— Выберите —</option>
                    {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-800">Размещение и статус</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Статус">
                  <select name="status" className="input" value={form.status} onChange={handleChange}>
                    <option value="warehouse">На складе</option>
                    <option value="in_use">В эксплуатации</option>
                    <option value="repair">В ремонте</option>
                    <option value="written_off">Списан</option>
                  </select>
                </Field>
                <Field label="Локация">
                  <select name="location" className="input" value={form.location} onChange={handleChange}>
                    <option value="">— Выберите —</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </Field>
                <Field label="Год изготовления">
                  <input name="manufacture_year" type="number" className="input" value={form.manufacture_year}
                    onChange={handleChange} placeholder="2022" min={1990} max={2100} />
                </Field>
                <Field label="Ответственный сотрудник">
                  <select name="responsible_employee" className="input" value={form.responsible_employee} onChange={handleChange}>
                    <option value="">— Выберите —</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-800">Финансы</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Дата покупки">
                  <input name="purchase_date" type="date" className="input" value={form.purchase_date} onChange={handleChange} />
                </Field>
                <Field label="Стоимость (₽)">
                  <input name="price" type="number" step="0.01" className="input" value={form.price} onChange={handleChange} placeholder="85000" />
                </Field>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-800">Описание и фото</h3>
              <Field label="Конфигурация / Описание">
                <textarea name="description" className="input h-24 resize-none" value={form.description}
                  onChange={handleChange} placeholder="CPU: Intel Core i7-11700&#10;RAM: 16GB DDR4&#10;SSD: 512GB NVMe" />
              </Field>
              <Field label="Фото">
                <div className="flex items-center gap-4">
                  {photoPreview && (
                    <img src={photoPreview} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm text-gray-600" />
                </div>
              </Field>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать запись'}
              </button>
              <Link to={isEdit ? `/assets/${id}` : '/assets'} className="btn-secondary">Отмена</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
