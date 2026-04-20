import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient } from '../api';

export function useAssuntos() {
  const [assuntosList, setAssuntosList] = useState([]);
  const [assuntosAdminList, setAssuntosAdminList] = useState([]);
  const [selectedAssuntos, setSelectedAssuntos] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const toast = useToast();

  const _fetchAssuntos = useCallback(async (materiaId) => {
    if (!materiaId) return [];
    const data = await apiClient(`assuntos/${materiaId}?t=${Date.now()}`);
    return Array.isArray(data) ? data : [];
  }, []);

  const fetchAssuntosForMateria = useCallback(async (materiaId) => {
    try { setAssuntosList(await _fetchAssuntos(materiaId)); }
    catch (err) { console.error('Erro ao carregar assuntos:', err); }
  }, [_fetchAssuntos]);

  const fetchAssuntosAdmin = useCallback(async (materiaId) => {
    try { setAssuntosAdminList(await _fetchAssuntos(materiaId)); }
    catch (err) { console.error('Erro ao carregar assuntos admin:', err); }
  }, [_fetchAssuntos]);

  const addAssunto = async (nome, materiaId, serie) => {
    if (!nome || nome.trim() === '' || !materiaId) {
      toast({ title: 'Selecione uma matéria e digite o nome do assunto.', status: 'warning', duration: 3000 });
      return false;
    }
    try {
      await apiClient('assuntos', 'POST', { nome: nome.trim(), materia_id: parseInt(materiaId), serie: serie || null });
      await fetchAssuntosAdmin(materiaId);
      toast({ title: 'Assunto cadastrado!', status: 'success' });
      return true;
    } catch (err) {
      toast({ title: 'Erro', description: err.message, status: 'error' });
      return false;
    }
  };

  const editAssunto = async (id, nome, materiaId, serie) => {
    try {
      await apiClient(`assuntos/${id}`, 'PUT', { nome, materia_id: parseInt(materiaId), serie: serie || null });
      toast({ title: 'Atualizado com sucesso!', status: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar', status: 'error' });
    }
  };

  const deleteAssunto = async (id, materiaId) => {
    try {
      await apiClient(`assuntos/${id}`, 'DELETE');
      if (materiaId) await fetchAssuntosAdmin(materiaId);
      toast({ title: 'Assunto removido', status: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao excluir assunto', status: 'error' });
    }
  };

  const toggleAssunto = (assunto) => {
    setSelectedAssuntos(prev =>
      prev.find(a => a.id === assunto.id)
        ? prev.filter(a => a.id !== assunto.id)
        : [...prev, assunto]
    );
    setSubjectSearch('');
  };

  const filteredAssuntos = useMemo(() =>
    assuntosList.filter(a =>
      a.nome.toLowerCase().includes(subjectSearch.toLowerCase()) &&
      !selectedAssuntos.find(sa => sa.id === a.id)
    ),
    [assuntosList, selectedAssuntos, subjectSearch]
  );

  return {
    assuntosList, assuntosAdminList,
    selectedAssuntos, setSelectedAssuntos,
    subjectSearch, setSubjectSearch, filteredAssuntos,
    fetchAssuntosForMateria, fetchAssuntosAdmin,
    addAssunto, editAssunto, deleteAssunto, toggleAssunto,
  };
}
