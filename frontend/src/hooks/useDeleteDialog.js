import { useState, useRef } from 'react';
import { useDisclosure } from '@chakra-ui/react';

export function useDeleteDialog() {
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  const open = (id, type, name) => {
    setDeleteId(id);
    setDeleteType(type);
    setDeleteName(name);
    onOpen();
  };

  return { isOpen, onClose, cancelRef, deleteId, deleteType, deleteName, open };
}
