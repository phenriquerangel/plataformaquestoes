import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient } from '../api';

export function useMaterias() {
  const [materiasList, setMateriasList] = useState([]);
  const toast = useToast();

  const fetchMaterias = useCallback(async () => {
    try {
      const data = await apiClient(`materias?t=${Date.now()}`);
      setMateriasList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar matérias:', err);
    }
  }, []);

  const addMateria = async (nome, serie) => {
    if (!nome || nome.trim().length < 2) {
      toast({ title: 'O nome deve ter pelo menos 2 caracteres.', status: 'warning', duration: 3000 });
      return false;
    }
    try {
      await apiClient('materias', 'POST', { nome: nome.trim(), serie: serie || null });
      await fetchMaterias();
      toast({ title: 'Matéria adicionada!', status: 'success' });
      return true;
    } catch (err) {
      toast({ title: 'Erro', description: err.message, status: 'error' });
      return false;
    }
  };

  const editMateria = async (id, nome, serie) => {
    try {
      await apiClient(`materias/${id}`, 'PUT', { nome, serie: serie || null });
      await fetchMaterias();
      toast({ title: 'Atualizado com sucesso!', status: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar', status: 'error' });
    }
  };

  const deleteMateria = async (id) => {
    try {
      await apiClient(`materias/${id}`, 'DELETE');
      await fetchMaterias();
      toast({ title: 'Matéria removida', status: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao excluir matéria', status: 'error' });
    }
  };

  return { materiasList, fetchMaterias, addMateria, editMateria, deleteMateria };
}
