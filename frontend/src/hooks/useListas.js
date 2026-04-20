import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient } from '../api';

export function useListas() {
  const [listas, setListas] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchListas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient('listas');
      setListas(data);
    } catch (err) {
      toast({ title: 'Erro ao carregar listas', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createLista = async (nome) => {
    try {
      const nova = await apiClient('listas', 'POST', { nome });
      setListas(prev => [nova, ...prev]);
      toast({ title: `Lista "${nome}" criada`, status: 'success', duration: 2000 });
      return nova;
    } catch (err) {
      toast({ title: 'Erro ao criar lista', description: err.message, status: 'error' });
      return null;
    }
  };

  const updateLista = async (id, updates) => {
    try {
      const atualizada = await apiClient(`listas/${id}`, 'PUT', updates);
      setListas(prev => prev.map(l => l.id === id ? atualizada : l));
      return atualizada;
    } catch (err) {
      toast({ title: 'Erro ao atualizar lista', description: err.message, status: 'error' });
      return null;
    }
  };

  const deleteLista = async (id) => {
    try {
      await apiClient(`listas/${id}`, 'DELETE');
      setListas(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Lista excluída', status: 'info', duration: 2000 });
    } catch (err) {
      toast({ title: 'Erro ao excluir lista', description: err.message, status: 'error' });
    }
  };

  const fetchListaQuestoes = async (listaId) => {
    try {
      return await apiClient(`listas/${listaId}/questoes`);
    } catch (err) {
      toast({ title: 'Erro ao carregar questões', description: err.message, status: 'error' });
      return { questoes: [], total: 0 };
    }
  };

  const addQuestaoToLista = async (listaId, questaoId) => {
    try {
      await apiClient(`listas/${listaId}/questoes`, 'POST', { questao_id: questaoId });
      setListas(prev => prev.map(l => l.id === listaId ? { ...l, total_questoes: l.total_questoes + 1 } : l));
      return true;
    } catch (err) {
      if (err.status === 409) {
        toast({ title: 'Questão já está nesta lista', status: 'warning', duration: 2000 });
      } else {
        toast({ title: 'Erro ao adicionar questão', description: err.message, status: 'error' });
      }
      return false;
    }
  };

  const removeQuestaoFromLista = async (listaId, questaoId) => {
    try {
      await apiClient(`listas/${listaId}/questoes/${questaoId}`, 'DELETE');
      setListas(prev => prev.map(l => l.id === listaId ? { ...l, total_questoes: Math.max(0, l.total_questoes - 1) } : l));
    } catch (err) {
      toast({ title: 'Erro ao remover questão', description: err.message, status: 'error' });
    }
  };

  const saveCurrentListAs = async (nome, questoes) => {
    const nova = await createLista(nome);
    if (!nova) return null;
    for (const q of questoes) {
      await addQuestaoToLista(nova.id, q.id);
    }
    toast({ title: `${questoes.length} questões salvas em "${nome}"`, status: 'success' });
    return nova;
  };

  return {
    listas,
    loading,
    fetchListas,
    createLista,
    updateLista,
    deleteLista,
    fetchListaQuestoes,
    addQuestaoToLista,
    removeQuestaoFromLista,
    saveCurrentListAs,
  };
}
