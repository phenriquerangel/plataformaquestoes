import { useState } from 'react';
import { useDisclosure } from '@chakra-ui/react';

export function useEditModal() {
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const open = (item, type) => {
    setEditingItem({ ...item, type });
    setEditValue(item.nome);
    onOpen();
  };

  return { isOpen, onClose, editingItem, editValue, setEditValue, open };
}
