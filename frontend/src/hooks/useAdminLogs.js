import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient } from '../api';

export const LOGS_LIMIT = 50;

export function useAdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const toast = useToast();

  const fetchLogs = useCallback(async (newOffset = 0, tipo = '') => {
    setLoading(true);
    setOffset(newOffset);
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    params.append('limit', LOGS_LIMIT);
    params.append('offset', newOffset);
    try {
      const data = await apiClient(`admin/logs?${params.toString()}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast({ title: 'Erro ao buscar logs', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { logs, loading, total, offset, fetchLogs };
}
