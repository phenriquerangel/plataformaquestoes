const API_BASE = '/api';
const TOKEN_KEY = 'eduquest_token';

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('auth:logout'));
}

export async function apiClient(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}/${endpoint}`;
  const options = { method, headers: { ...authHeaders() } };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  console.log(`%c[API] ${method} ${url}`, 'color:blue;font-weight:bold', body || '');

  const response = await fetch(url, options);
  const text = await response.text();

  if (response.status === 401) { handleUnauthorized(); }

  if (!response.ok) {
    console.error(`%c[API] ${response.status} ${response.statusText}`, 'color:red;font-weight:bold', text);
    let detail = `Erro ${response.status}`;
    try { detail = JSON.parse(text).detail || text; } catch { detail = text.slice(0, 200) || detail; }
    const err = new Error(detail);
    err.status = response.status;
    throw err;
  }

  const parsed = JSON.parse(text);
  console.log(`%c[API] ${response.status} OK`, 'color:green;font-weight:bold', parsed);
  return parsed;
}

export async function apiStream(endpoint, body) {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
  return response.body.getReader();
}

export async function apiDownload(endpoint, body, filename) {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Falha ao gerar arquivo.');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename, style: 'display:none' });
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
