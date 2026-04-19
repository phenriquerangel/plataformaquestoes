import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, Button, Input,
} from '@chakra-ui/react';

export function EditModal({ isOpen, onClose, editingItem, editValue, setEditValue, onSave }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader>Renomear {editingItem?.type === 'materia' ? 'Matéria' : 'Assunto'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Novo nome..." />
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="brand" mr={3} onClick={onSave}>Salvar Alterações</Button>
          <Button onClick={onClose} variant="ghost">Cancelar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
