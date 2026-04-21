import { useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { apiClient, apiStream } from '../api';

export function useQuestionGenerator() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const generate = async ({ materia, materiaId, serie, selectedAssuntos, freeAssunto, difficulty, quantity, tipo = 'multipla_escolha', onAssuntoCriado }) => {
    const assuntoNome = selectedAssuntos.length > 0
      ? selectedAssuntos.map(a => a.nome).join(', ')
      : freeAssunto?.trim();
    if (!assuntoNome) {
      toast({ title: 'Informe um assunto', status: 'warning' });
      return;
    }
    setLoading(true);
    setQuestions([]);
    try {
      let assuntoId = selectedAssuntos.length > 0 ? selectedAssuntos[0].id : null;

      if (!assuntoId && assuntoNome && materiaId) {
        const novoAssunto = await apiClient('assuntos', 'POST', {
          nome: assuntoNome,
          materia_id: materiaId,
          serie: serie || null,
        });
        assuntoId = novoAssunto.id;
        if (onAssuntoCriado) onAssuntoCriado(novoAssunto);
        toast({ title: `Assunto "${assuntoNome}" cadastrado`, status: 'info', duration: 2000 });
      }

      const body = {
        materia,
        assunto: assuntoNome,
        dificuldade: difficulty,
        quantidade: parseInt(quantity),
        tipo,
        ...(serie ? { serie } : {}),
        ...(assuntoId ? { assunto_id: assuntoId } : {}),
      };
      const reader = await apiStream('generate', body);

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
          try {
            const parsed = JSON.parse(line);
            if (parsed.error) {
              toast({ title: 'Erro na geração', description: parsed.error, status: 'error', duration: 5000 });
            } else {
              setQuestions(prev => [...prev, parsed]);
            }
          } catch (e) { console.error('Erro ao parsear linha do stream:', line, e); }
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
