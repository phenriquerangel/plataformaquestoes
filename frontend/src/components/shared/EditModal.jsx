import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, Button, Input, Select, VStack, FormLabel, FormControl,
} from '@chakra-ui/react';
import { SERIES_OPTIONS } from '../../constants/series';

export function EditModal({ isOpen, onClose, editingItem, editValue, setEditValue, editSerie, setEditSerie, onSave }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader>Editar {editingItem?.type === 'materia' ? 'Matéria' : 'Assunto'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">Nome</FormLabel>
              <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Nome..." />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Série / Ano</FormLabel>
              <Select value={editSerie} onChange={(e) => setEditSerie(e.target.value)} placeholder="Sem série">
                {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="brand" mr={3} onClick={onSave}>Salvar Alterações</Button>
          <Button onClick={onClose} variant="ghost">Cancelar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
