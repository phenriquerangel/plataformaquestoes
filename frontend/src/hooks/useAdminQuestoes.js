import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient } from '../api';

export const ADMIN_Q_LIMIT = 10;

export function useAdminQuestoes() {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const toast = useToast();

  const fetchQuestoes = useCallback(async (newOffset = 0, filters = {}) => {
    const { materiaId, assuntoId, dificuldade, keyword } = filters;
    setLoading(true);
    setOffset(newOffset);
    const params = new URLSearchParams();
    if (materiaId) params.append('materia_id', materiaId);
    if (assuntoId) params.append('assunto_id', assuntoId);
    if (dificuldade) params.append('dificuldade', dificuldade);
    if (keyword) params.append('keyword', keyword);
    params.append('limit', ADMIN_Q_LIMIT);
    params.append('offset', newOffset);
    try {
      const data = await apiClient(`admin/questoes?${params.toString()}`);
      setQuestoes(data.questoes || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast({ title: 'Erro ao buscar questões', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteQuestao = useCallback(async (id, onSuccess) => {
    try {
      await apiClient(`questoes/${id}`, 'DELETE');
      toast({ title: 'Questão excluída', status: 'info', duration: 3000 });
      onSuccess?.();
    } catch (err) {
      toast({ title: 'Erro ao excluir questão', description: err.message, status: 'error' });
    }
  }, [toast]);

  const editQuestao = useCallback(async (id, body, onSuccess) => {
    try {
      await apiClient(`questoes/${id}`, 'PUT', body);
      toast({ title: 'Questão atualizada', status: 'success', duration: 3000 });
      onSuccess?.();
    } catch (err) {
      toast({ title: 'Erro ao atualizar questão', description: err.message, status: 'error' });
    }
  }, [toast]);

  return { questoes, loading, total, offset, fetchQuestoes, deleteQuestao, editQuestao };
}
