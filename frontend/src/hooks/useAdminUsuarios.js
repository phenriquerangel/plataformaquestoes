import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient } from '../api';

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient('admin/usuarios');
      setUsuarios(data);
    } catch (err) {
      toast({ title: 'Erro ao buscar usuários', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const criarUsuario = useCallback(async (body) => {
    try {
      await apiClient('admin/usuarios', 'POST', body);
      toast({ title: 'Usuário criado com sucesso', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Erro ao criar usuário', description: err.message, status: 'error' });
      throw err;
    }
  }, [toast]);

  const editarUsuario = useCallback(async (id, body) => {
    try {
      await apiClient(`admin/usuarios/${id}`, 'PUT', body);
      toast({ title: 'Usuário atualizado', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Erro ao atualizar usuário', description: err.message, status: 'error' });
      throw err;
    }
  }, [toast]);

  const excluirUsuario = useCallback(async (id) => {
    try {
      await apiClient(`admin/usuarios/${id}`, 'DELETE');
      toast({ title: 'Usuário excluído', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Erro ao excluir usuário', description: err.message, status: 'error' });
      throw err;
    }
  }, [toast]);

  return { usuarios, loading, fetchUsuarios, criarUsuario, editarUsuario, excluirUsuario };
}
