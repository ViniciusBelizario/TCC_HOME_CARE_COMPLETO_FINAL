// src/services/auth.service.js
import { api } from './http.js';

export async function loginService({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  // data: { token, user }
  return data;
}

export async function changePasswordService({ currentPassword, newPassword, token }) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword }, { headers });
  return data;
}
