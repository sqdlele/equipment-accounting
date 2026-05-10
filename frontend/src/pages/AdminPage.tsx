import { useEffect, useState } from 'react';
import {
  categoriesApi, manufacturersApi, locationsApi, departmentsApi,
  employeesApi, usersApi,
} from '../api/endpoints';
import type { Category, Manufacturer, Location, Department, Employee, User } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/authStore';

type Tab = 'categories' | 'manufacturers' | 'locations' | 'departments' | 'employees' | 'users';

export default function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.is_superuser;

  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const loadData = async (tab: Tab) => {
    setLoading(true);
    switch (tab) {
      case 'categories': { const { data } = await categoriesApi.list(); setCategories(data.results); break; }
      case 'manufacturers': { const { data } = await manufacturersApi.list(); setManufacturers(data.results); break; }
      case 'locations': {
        const [l, d] = await Promise.all([locationsApi.list(), departmentsApi.list()]);
        setLocations(l.data.results); setDepartments(d.data.results); break;
      }
      case 'departments': { const { data } = await departmentsApi.list(); setDepartments(data.results); break; }
      case 'employees': {
        const [e, d] = await Promise.all([employeesApi.list({ page_size: 200 }), departmentsApi.list()]);
        setEmployees(e.data.results); setDepartments(d.data.results); break;
      }
      case 'users': { const { data } = await usersApi.list(); setUsers(data.results); break; }
    }
    setLoading(false);
  };

  useEffect(() => { loadData(activeTab); }, [activeTab]);

  const openCreate = () => { setEditItem(null); setFormData({}); setModalOpen(true); };
  const openEdit = (item: Record<string, unknown>) => {
    setEditItem(item);
    setFormData(Object.fromEntries(Object.entries(item).map(([k, v]) => [k, String(v ?? '')])));
    setModalOpen(true);
  };

  const handleSave = async () => {
    const id = editItem ? (editItem.id as number) : null;
    switch (activeTab) {
      case 'categories':
        if (id) await categoriesApi.update(id, formData as never);
        else await categoriesApi.create(formData as never);
        break;
      case 'departments':
        if (id) { /* no update endpoint, recreate */ } else await departmentsApi.create(formData as never);
        break;
      case 'locations':
        if (id) await locationsApi.update(id, formData as never);
        else await locationsApi.create(formData as never);
        break;
      case 'employees':
        if (id) await employeesApi.update(id, formData as never);
        else await employeesApi.create(formData as never);
        break;
      case 'users':
        if (id) await usersApi.update(id, formData as never);
        else await usersApi.create(formData as unknown as { password: string } & Partial<User>);
        break;
      case 'manufacturers':
        if (!id) await manufacturersApi.create(formData as never);
        break;
    }
    setModalOpen(false);
    loadData(activeTab);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return;
    switch (activeTab) {
      case 'categories': await categoriesApi.delete(id); break;
      case 'manufacturers': await manufacturersApi.delete(id); break;
      case 'locations': await locationsApi.delete(id); break;
      case 'departments': await departmentsApi.delete(id); break;
      case 'employees': await employeesApi.delete(id); break;
      case 'users': if (isAdmin) await usersApi.delete(id); break;
    }
    loadData(activeTab);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'categories', label: 'Категории' },
    { key: 'manufacturers', label: 'Производители' },
    { key: 'departments', label: 'Подразделения' },
    { key: 'locations', label: 'Локации' },
    { key: 'employees', label: 'Сотрудники' },
    ...(isAdmin ? [{ key: 'users' as Tab, label: 'Пользователи' }] : []),
  ];

  const renderRows = () => {
    if (loading) return <tr><td colSpan={10}><Spinner /></td></tr>;

    const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'engineer';

    const row = (id: number, cells: React.ReactNode[], item: Record<string, unknown>) => (
      <tr key={id} className="table-tr">
        {cells.map((c, i) => <td key={i} className="table-td">{c}</td>)}
        <td className="table-td">
          <div className="flex gap-2">
            <button onClick={() => openEdit(item)} className="text-xs text-brand-700 hover:underline">Изм.</button>
            {canDelete && (
              <button onClick={() => handleDelete(id)} className="text-xs text-red-600 hover:underline">Удалить</button>
            )}
          </div>
        </td>
      </tr>
    );

    switch (activeTab) {
      case 'categories': return categories.map((c) => row(c.id, [c.name, c.asset_count, c.description || '—'], c as never));
      case 'manufacturers': return manufacturers.map((m) => row(m.id, [m.name, m.asset_count], m as never));
      case 'departments': return departments.map((d) => row(d.id, [d.name, d.description || '—'], d as never));
      case 'locations': return locations.map((l) => row(l.id, [
        l.name, l.room_code || '—', l.type_display, l.department_name || '—',
      ], l as never));
      case 'employees': return employees.map((e) => row(e.id, [
        e.full_name, e.position || '—', e.department_name || '—', e.email || '—',
        <span className={`badge ${e.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
          {e.is_active ? 'Активен' : 'Неактивен'}
        </span>
      ], e as never));
      case 'users': return users.map((u) => row(u.id, [u.username, `${u.first_name} ${u.last_name}`.trim() || '—', u.role, u.email || '—'], u as never));
      default: return null;
    }
  };

  const tableHeaders: Record<Tab, string[]> = {
    categories: ['Название', 'Единиц', 'Описание', ''],
    manufacturers: ['Название', 'Единиц', ''],
    departments: ['Название', 'Описание', ''],
    locations: ['Название', 'Код каб.', 'Тип', 'Подразделение', ''],
    employees: ['ФИО', 'Должность', 'Подразделение', 'Email', 'Статус', ''],
    users: ['Логин', 'ФИО', 'Роль', 'Email', ''],
  };

  const renderForm = () => {
    const F = ({ label, name, type = 'text', children }: {
      label: string; name: string; type?: string; children?: React.ReactNode
    }) => (
      <div>
        <label className="label">{label}</label>
        {children || (
          <input
            type={type}
            className="input"
            value={formData[name] || ''}
            onChange={(e) => setFormData((f) => ({ ...f, [name]: e.target.value }))}
          />
        )}
      </div>
    );

    switch (activeTab) {
      case 'categories': return (
        <>
          <F label="Название *" name="name" />
          <F label="Описание" name="description" />
        </>
      );
      case 'manufacturers': return <F label="Название *" name="name" />;
      case 'departments': return (
        <>
          <F label="Название *" name="name" />
          <F label="Описание" name="description" />
        </>
      );
      case 'locations': return (
        <>
          <F label="Название *" name="name" />
          <F label="Код кабинета (для номеров техники)" name="room_code" />
          <F label="Тип" name="type">
            <select className="input" value={formData.type || 'office'} onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}>
              <option value="warehouse">Склад</option>
              <option value="office">Офис/Кабинет</option>
              <option value="workshop">Цех</option>
              <option value="server_room">Серверная</option>
            </select>
          </F>
          <F label="Подразделение" name="department">
            <select className="input" value={formData.department || ''} onChange={(e) => setFormData((f) => ({ ...f, department: e.target.value }))}>
              <option value="">— Не указано —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </F>
        </>
      );
      case 'employees': return (
        <>
          <F label="ФИО *" name="full_name" />
          <F label="Должность" name="position" />
          <F label="Подразделение" name="department">
            <select className="input" value={formData.department || ''} onChange={(e) => setFormData((f) => ({ ...f, department: e.target.value }))}>
              <option value="">— Не указано —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </F>
          <F label="Email" name="email" type="email" />
          <F label="Телефон" name="phone" />
        </>
      );
      case 'users': return (
        <>
          <F label="Логин *" name="username" />
          <F label="Имя" name="first_name" />
          <F label="Фамилия" name="last_name" />
          <F label="Email" name="email" type="email" />
          {!editItem && <F label="Пароль *" name="password" type="password" />}
          <F label="Роль" name="role">
            <select className="input" value={formData.role || 'readonly'} onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}>
              <option value="admin">Администратор</option>
              <option value="engineer">ИТ-инженер</option>
              <option value="warehouse">Кладовщик</option>
              <option value="readonly">Читатель</option>
            </select>
          </F>
        </>
      );
    }
  };

  return (
    <div>
      <PageHeader title="Справочники" subtitle="Управление основными данными системы" />

      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="card p-0 overflow-hidden">
          <div className="flex justify-end p-4 border-b border-gray-200">
            <button onClick={openCreate} className="btn-primary">+ Добавить</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {tableHeaders[activeTab].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{renderRows()}</tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Редактировать' : 'Создать'}
      >
        <div className="space-y-4">
          {renderForm()}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="btn-primary">Сохранить</button>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Отмена</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
