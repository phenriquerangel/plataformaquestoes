import { useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient } from '../api';

export const PAGE_LIMIT = 10;

export function useQuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [offset, setOffset] = useState(0);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [difficultySearch, setDifficultySearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const toast = useToast();

  const fetchQuestions = async (newOffset, { selectedAssuntos, keyword, id, difficulty, order } = {}) => {
    const kw = keyword ?? keywordSearch;
    const ids = id ?? idSearch;
    const diff = difficulty ?? difficultySearch;
    const ord = order ?? sortOrder;
    const assuntos = selectedAssuntos ?? [];

    if (assuntos.length === 0 && !kw && !ids) {
      toast({ title: 'Use um filtro para buscar', description: 'Selecione um assunto, palavra-chave ou ID.', status: 'warning', duration: 4000 });
      return;
    }

    setLoading(true);
    setOffset(newOffset ?? 0);

    const params = new URLSearchParams();
    if (ids) {
      params.append('questao_id', ids);
    } else {
      assuntos.forEach(a => { if (a.id) params.append('assunto_ids', a.id); });
      if (kw) params.append('keyword', kw);
    }
    if (diff) params.append('dificuldade', diff);
    params.append('limit', PAGE_LIMIT);
    params.append('offset', newOffset ?? 0);
    params.append('ordem', ord);

    try {
      const data = await apiClient(`questoes-salvas?${params.toString()}`);
      setQuestions(data.questoes || []);
      setTotalQuestions(data.total || 0);
      toast({ title: 'Questões carregadas!', status: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao buscar questões', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (id, index) => {
    try {
      await apiClient(`questoes/${id}`, 'DELETE');
      setQuestions(prev => prev.filter((_, i) => i !== index));
      toast({ title: 'Questão removida', status: 'info' });
    } catch (err) {
      toast({ title: 'Erro ao excluir', status: 'error' });
    }
  };

  const resetFilters = () => {
    setKeywordSearch('');
    setIdSearch('');
    setDifficultySearch('');
    setSortOrder('desc');
  };

  return {
    questions, loading, totalQuestions, offset,
    keywordSearch, setKeywordSearch,
    idSearch, setIdSearch,
    difficultySearch, setDifficultySearch,
    sortOrder, setSortOrder,
    fetchQuestions, deleteQuestion, resetFilters,
  };
}
