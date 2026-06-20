import { authApi } from './api.js';

let currentUser = null;

export function user() {
  return currentUser;
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('access_token'));
}

export function canWrite() {
  return currentUser && currentUser.role !== 'readonly';
}

export function isAdmin() {
  return currentUser && (currentUser.role === 'admin' || currentUser.is_superuser);
}

export async function login(username, password) {
  const data = await authApi.login(username, password);
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  currentUser = data.user;
  return currentUser;
}

export function logout() {
  currentUser = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export async function loadMe() {
  if (!isAuthenticated()) return null;
  try {
    currentUser = await authApi.me();
    return currentUser;
  } catch {
    logout();
    return null;
  }
}
