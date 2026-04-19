import { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';

export function useCustomList() {
  const [customList, setCustomList] = useState([]);
  const [customListTitle, setCustomListTitle] = useState('Minha Lista de Exercícios');
  const toast = useToast();

  useEffect(() => {
    const list = localStorage.getItem('eduquest_custom_list');
    const title = localStorage.getItem('eduquest_custom_list_title');
    if (list) setCustomList(JSON.parse(list));
    if (title) setCustomListTitle(title);
  }, []);

  useEffect(() => {
    localStorage.setItem('eduquest_custom_list', JSON.stringify(customList));
    localStorage.setItem('eduquest_custom_list_title', customListTitle);
  }, [customList, customListTitle]);

  const toggleQuestion = (q) => {
    if (customList.find(item => item.id === q.id)) {
      setCustomList(prev => prev.filter(item => item.id !== q.id));
      toast({ title: 'Removida da lista', status: 'info', duration: 2000 });
    } else {
      setCustomList(prev => [...prev, q]);
      toast({ title: 'Adicionada à lista', status: 'success', duration: 2000 });
    }
  };

  const addAll = (questions) => {
    const newItems = questions.filter(q => !customList.some(item => item.id === q.id));
    if (newItems.length > 0) {
      setCustomList(prev => [...prev, ...newItems]);
      toast({ title: `${newItems.length} questões adicionadas`, status: 'success' });
    }
  };

  const moveQuestion = (index, direction) => {
    const next = direction === 'up' ? index - 1 : index + 1;
    if (next < 0 || next >= customList.length) return;
    const list = [...customList];
    [list[index], list[next]] = [list[next], list[index]];
    setCustomList(list);
  };

  return { customList, customListTitle, setCustomListTitle, toggleQuestion, addAll, moveQuestion, clear: () => setCustomList([]) };
}
