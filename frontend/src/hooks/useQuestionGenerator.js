import { useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient, apiStream } from '../api';

export function useQuestionGenerator() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const generate = async ({ materia, selectedAssuntos, difficulty, quantity, tipo = 'multipla_escolha' }) => {
    if (selectedAssuntos.length === 0) {
      toast({ title: 'Assunto obrigatório', status: 'warning' });
      return;
    }
    setLoading(true);
    setQuestions([]);
    try {
      const reader = await apiStream('generate', {
        materia,
        assunto: selectedAssuntos.map(a => a.nome).join(', '),
        assunto_id: selectedAssuntos[0].id,
        dificuldade: difficulty,
        quantidade: parseInt(quantity),
        tipo,
      });

      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try { setQuestions(prev => [...prev, JSON.parse(line)]); }
          catch (e) { console.error('Erro ao parsear linha do stream:', line, e); }
        }
      }
      toast({ title: 'Geração concluída!', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Erro na Geração', description: err.message, status: 'error', duration: 5000 });
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

  return { questions, loading, generate, deleteQuestion };
}
