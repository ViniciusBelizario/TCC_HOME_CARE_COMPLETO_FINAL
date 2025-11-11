// src/services/api.service.js
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = process.env.API_BASE_URL?.replace(/\/+$/,'') || 'http://localhost:3333/api';

function buildUrl(path, query) {
  const clean = String(path || '').replace(/^\s*/,'').replace(/^\/+/, '');
  const url = `${API_BASE}/${clean}`;
  if (!query || typeof query !== 'object') return url;
  const usp = new URLSearchParams();
  for (const [k,v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    usp.append(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${url}?${qs}` : url;
}

async function doRequest(method, path, token, body, query) {
  const url = buildUrl(path, query);
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload;
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) {
    // mantém o formato usado nos controllers para parse de erro
    throw new Error(`API ${method} ${url} => ${res.status}: ${text}`);
  }
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function apiGet(path, token, query) {
  return doRequest('GET', path, token, undefined, query);
}

export async function apiPost(path, token, body, query) {
  return doRequest('POST', path, token, body, query);
}

export async function apiPatch(path, token, body, query) {
  return doRequest('PATCH', path, token, body, query);
}
