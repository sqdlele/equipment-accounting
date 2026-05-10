import api from './client';
import type {
  User, AssetListItem, AssetDetail, Category, Manufacturer,
  Location, Department, Employee, RepairTicket, DashboardStats,
  PaginatedResponse, AssetMovement, WarehouseSummary,
} from '../types';

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ access: string; refresh: string; user: User }>('/auth/token/', { username, password }),
  me: () => api.get<User>('/auth/me/'),
};

// Assets
export const assetsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<AssetListItem>>('/assets/', { params }),
  detail: (id: number) => api.get<AssetDetail>(`/assets/${id}/`),
  create: (data: FormData) =>
    api.post<AssetListItem>('/assets/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: FormData) =>
    api.patch<AssetDetail>(`/assets/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: number) => api.delete(`/assets/${id}/`),
  exportExcel: () => api.get('/reports/export/assets/excel/', { responseType: 'blob' }),
  exportPdf: () => api.get('/reports/export/assets/pdf/', { responseType: 'blob' }),
  importTemplate: () =>
    api.get('/assets/import-template/', { responseType: 'blob' }),
  importExcel: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<{ created: number; updated: number; errors: { row: number | null; message: string }[] }>(
      '/assets/import-excel/',
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
  warehouseSummary: () => api.get<WarehouseSummary>('/assets/warehouse-summary/'),
};

// Repairs
export const repairsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<RepairTicket>>('/repairs/', { params }),
  detail: (id: number) => api.get<RepairTicket>(`/repairs/${id}/`),
  create: (data: Partial<RepairTicket>) => api.post<RepairTicket>('/repairs/', data),
  update: (id: number, data: Partial<RepairTicket>) => api.patch<RepairTicket>(`/repairs/${id}/`, data),
  addWork: (ticketId: number, data: object) =>
    api.post(`/repairs/${ticketId}/add-work/`, data),
  replacementCandidates: (ticketId: number, opts?: { all?: boolean }) =>
    api.get<AssetListItem[]>(`/repairs/${ticketId}/replacement-candidates/`, {
      params: opts?.all ? { all: 1 } : {},
    }),
  replaceFromWarehouse: (ticketId: number, body: { replacement_asset_id: number; parts_note?: string }) =>
    api.post<RepairTicket>(`/repairs/${ticketId}/replace-from-warehouse/`, body),
  exportExcel: () => api.get('/reports/export/repairs/excel/', { responseType: 'blob' }),
};

// Reference data
export const categoriesApi = {
  list: () => api.get<PaginatedResponse<Category>>('/categories/', { params: { page_size: 100 } }),
  create: (data: Partial<Category>) => api.post<Category>('/categories/', data),
  update: (id: number, data: Partial<Category>) => api.patch<Category>(`/categories/${id}/`, data),
  delete: (id: number) => api.delete(`/categories/${id}/`),
};

export const manufacturersApi = {
  list: () => api.get<PaginatedResponse<Manufacturer>>('/manufacturers/', { params: { page_size: 100 } }),
  create: (data: Partial<Manufacturer>) => api.post<Manufacturer>('/manufacturers/', data),
  delete: (id: number) => api.delete(`/manufacturers/${id}/`),
};

export const locationsApi = {
  list: () => api.get<PaginatedResponse<Location>>('/locations/', { params: { page_size: 200 } }),
  create: (data: Partial<Location>) => api.post<Location>('/locations/', data),
  update: (id: number, data: Partial<Location>) => api.patch<Location>(`/locations/${id}/`, data),
  delete: (id: number) => api.delete(`/locations/${id}/`),
};

export const departmentsApi = {
  list: () => api.get<PaginatedResponse<Department>>('/departments/', { params: { page_size: 100 } }),
  create: (data: Partial<Department>) => api.post<Department>('/departments/', data),
  delete: (id: number) => api.delete(`/departments/${id}/`),
};

export const employeesApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Employee>>('/employees/', { params }),
  create: (data: Partial<Employee>) => api.post<Employee>('/employees/', data),
  update: (id: number, data: Partial<Employee>) => api.patch<Employee>(`/employees/${id}/`, data),
  delete: (id: number) => api.delete(`/employees/${id}/`),
};

export const usersApi = {
  list: () => api.get<PaginatedResponse<User>>('/users/', { params: { page_size: 100 } }),
  create: (data: Partial<User> & { password: string }) => api.post<User>('/users/', data),
  update: (id: number, data: Partial<User>) => api.patch<User>(`/users/${id}/`, data),
  delete: (id: number) => api.delete(`/users/${id}/`),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats/'),
};

export const movementsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<AssetMovement>>('/movements/', { params }),
  create: (data: {
    asset: number;
    to_location: number | null;
    to_responsible_employee: number | null;
    document_number?: string;
    note?: string;
  }) => api.post<AssetMovement>('/movements/', data),
};

