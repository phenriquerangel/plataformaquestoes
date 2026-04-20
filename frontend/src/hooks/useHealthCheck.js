import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api';

const INTERVAL_MS = 30000;

export function useHealthCheck() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const check = useCallback(async () => {
    try {
      const data = await apiClient('health');
      setHealth(data);
    } catch {
      setHealth({ status: 'error', components: {} });
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  return { health, loading, lastChecked, refresh: check };
}
