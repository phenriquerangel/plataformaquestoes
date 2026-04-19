import React from 'react';
import {
  AlertDialog, AlertDialogBody, AlertDialogFooter,
  AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Button,
} from '@chakra-ui/react';

export function DeleteDialog({ isOpen, onClose, cancelRef, deleteName, deleteType, onConfirm }) {
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent borderRadius="2xl">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">Excluir Permanente</AlertDialogHeader>
          <AlertDialogBody>
            Você tem certeza que deseja excluir <strong>{deleteName}</strong>?
            <br /><br />
            Esta ação não pode ser desfeita e removerá todos os{' '}
            {deleteType === 'materia' ? 'assuntos e questões' : 'dados'} vinculados.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} variant="ghost">Cancelar</Button>
            <Button colorScheme="red" onClick={onConfirm} ml={3} borderRadius="xl">Excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
