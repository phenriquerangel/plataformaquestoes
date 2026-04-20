import { useState } from 'react';
import { useDisclosure } from '@chakra-ui/react';

export function useEditModal() {
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editSerie, setEditSerie] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const open = (item, type) => {
    setEditingItem({ ...item, type });
    setEditValue(item.nome);
    setEditSerie(item.serie || '');
    onOpen();
  };

  return { isOpen, onClose, editingItem, editValue, setEditValue, editSerie, setEditSerie, open };
}
