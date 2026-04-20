import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'eduquest_token';

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = parseToken(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

export function useAuth() {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    return t && isTokenValid(t) ? t : null;
  });

  const payload = token ? parseToken(token) : null;

  useEffect(() => {
    const onForceLogout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); };
    window.addEventListener('auth:logout', onForceLogout);
    return () => window.removeEventListener('auth:logout', onForceLogout);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erro ao fazer login');
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  return {
    token,
    isAuthenticated: !!token,
    username: payload?.sub ?? null,
    role: payload?.role ?? null,
    isAdmin: payload?.role === 'admin',
    login,
    logout,
  };
}
