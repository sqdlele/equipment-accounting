import { errorText } from './utils.js';

const BASE = window.API_BASE || (location.port === '5173' ? 'http://localhost:8000/api' : '/api');

function token() {
  return localStorage.getItem('access_token');
}

function refreshToken() {
  return localStorage.getItem('refresh_token');
}

async function refreshAccessToken() {
  const refresh = refreshToken();
  if (!refresh) throw new Error('No refresh token');
  const res = await fetch(`${BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  localStorage.setItem('access_token', data.access);
  return data.access;
}

function buildUrl(path, params) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url;
}

async function request(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  const body = options.body;
  if (!(body instanceof FormData) && body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const access = token();
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const res = await fetch(buildUrl(path, options.params), { ...options, headers });
  if (res.status === 401 && retry && refreshToken()) {
    try {
      await refreshAccessToken();
      return request(path, options, false);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch { data = await res.text(); }
    const err = new Error(errorText(data));
    err.data = data;
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.blob();
}

const jsonBody = (data) => JSON.stringify(data || {});

export const authApi = {
  login: (username, password) => request('/auth/token/', {
    method: 'POST',
    body: jsonBody({ username, password }),
  }),
  me: () => request('/auth/me/'),
};

export const assetsApi = {
  list: (params) => request('/assets/', { params }),
  detail: (id) => request(`/assets/${id}/`),
  create: (fd) => request('/assets/', { method: 'POST', body: fd }),
  update: (id, fd) => request(`/assets/${id}/`, { method: 'PATCH', body: fd }),
  delete: (id) => request(`/assets/${id}/`, { method: 'DELETE' }),
  exportExcel: () => request('/reports/export/assets/excel/'),
  exportPdf: () => request('/reports/export/assets/pdf/'),
  importTemplate: () => request('/assets/import-template/'),
  importExcel: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/assets/import-excel/', { method: 'POST', body: fd });
  },
  warehouseSummary: () => request('/assets/warehouse-summary/'),
};

export const repairsApi = {
  list: (params) => request('/repairs/', { params }),
  detail: (id) => request(`/repairs/${id}/`),
  create: (data) => request('/repairs/', { method: 'POST', body: jsonBody(data) }),
  update: (id, data) => request(`/repairs/${id}/`, { method: 'PATCH', body: jsonBody(data) }),
  addWork: (id, data) => request(`/repairs/${id}/add-work/`, { method: 'POST', body: jsonBody(data) }),
  replacementCandidates: (id, all = false) => request(`/repairs/${id}/replacement-candidates/`, { params: all ? { all: 1 } : {} }),
  replaceFromWarehouse: (id, data) => request(`/repairs/${id}/replace-from-warehouse/`, { method: 'POST', body: jsonBody(data) }),
  exportExcel: () => request('/reports/export/repairs/excel/'),
};

export const categoriesApi = {
  list: () => request('/categories/', { params: { page_size: 100 } }),
  create: (data) => request('/categories/', { method: 'POST', body: jsonBody(data) }),
  update: (id, data) => request(`/categories/${id}/`, { method: 'PATCH', body: jsonBody(data) }),
  delete: (id) => request(`/categories/${id}/`, { method: 'DELETE' }),
};

export const manufacturersApi = {
  list: () => request('/manufacturers/', { params: { page_size: 100 } }),
  create: (data) => request('/manufacturers/', { method: 'POST', body: jsonBody(data) }),
  update: (id, data) => request(`/manufacturers/${id}/`, { method: 'PATCH', body: jsonBody(data) }),
  delete: (id) => request(`/manufacturers/${id}/`, { method: 'DELETE' }),
};

export const locationsApi = {
  list: () => request('/locations/', { params: { page_size: 200 } }),
  create: (data) => request('/locations/', { method: 'POST', body: jsonBody(data) }),
  update: (id, data) => request(`/locations/${id}/`, { method: 'PATCH', body: jsonBody(data) }),
  delete: (id) => request(`/locations/${id}/`, { method: 'DELETE' }),
};

export const departmentsApi = {
  list: () => request('/departments/', { params: { page_size: 100 } }),
  create: (data) => request('/departments/', { method: 'POST', body: jsonBody(data) }),
  update: (id, data) => request(`/departments/${id}/`, { method: 'PATCH', body: jsonBody(data) }),
  delete: (id) => request(`/departments/${id}/`, { method: 'DELETE' }),
};

export const employeesApi = {
  list: (params) => request('/employees/', { params }),
  create: (data) => request('/employees/', { method: 'POST', body: jsonBody(data) }),
  update: (id, data) => request(`/employees/${id}/`, { method: 'PATCH', body: jsonBody(data) }),
  delete: (id) => request(`/employees/${id}/`, { method: 'DELETE' }),
};

export const usersApi = {
  list: () => request('/users/', { params: { page_size: 100 } }),
  create: (data) => request('/users/', { method: 'POST', body: jsonBody(data) }),
  update: (id, data) => request(`/users/${id}/`, { method: 'PATCH', body: jsonBody(data) }),
  delete: (id) => request(`/users/${id}/`, { method: 'DELETE' }),
};

export const dashboardApi = {
  stats: () => request('/dashboard/stats/'),
};

export const movementsApi = {
  list: (params) => request('/movements/', { params }),
  create: (data) => request('/movements/', { method: 'POST', body: jsonBody(data) }),
};
