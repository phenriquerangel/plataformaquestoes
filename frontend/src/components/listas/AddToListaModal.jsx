import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  VStack, HStack, Text, Button, Input, Divider, Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { BookOpen, Plus } from 'lucide-react';

export function AddToListaModal({ isOpen, onClose, question, listas, onAddToLista, onCreateAndAdd }) {
  const [novaLista, setNovaLista] = useState('');
  const [adding, setAdding] = useState(null);
  const [creating, setCreating] = useState(false);

  const modalBg = useColorModeValue('white', 'gray.800');
  const subtleColor = useColorModeValue('gray.400', 'gray.500');
  const nameColor = useColorModeValue('gray.700', 'gray.200');

  const handleAdd = async (listaId) => {
    setAdding(listaId);
    await onAddToLista(listaId, question.id);
    setAdding(null);
    onClose();
  };

  const handleCreate = async () => {
    const nome = novaLista.trim();
    if (!nome) return;
    setCreating(true);
    await onCreateAndAdd(nome, question);
    setCreating(false);
    setNovaLista('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalOverlay />
      <ModalContent borderRadius="2xl" bg={modalBg}>
        <ModalHeader fontSize="md">Adicionar à Lista Salva</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={3}>
            {listas.length === 0 ? (
              <Text fontSize="sm" color={subtleColor} textAlign="center" py={2}>
                Nenhuma lista criada ainda.
              </Text>
            ) : (
              listas.map(lista => (
                <Flex key={lista.id} align="center" justify="space-between">
                  <HStack spacing={2} flex={1} minW={0}>
                    <BookOpen size={14} color="var(--chakra-colors-gray-400)" />
                    <Text fontSize="sm" noOfLines={1} color={nameColor}>{lista.nome}</Text>
                    <Text fontSize="xs" color={subtleColor} flexShrink={0}>({lista.total_questoes})</Text>
                  </HStack>
                  <Button
                    size="xs"
                    colorScheme="brand"
                    variant="outline"
                    ml={2}
                    flexShrink={0}
                    onClick={() => handleAdd(lista.id)}
                    isLoading={adding === lista.id}
                  >
                    Adicionar
                  </Button>
                </Flex>
              ))
            )}
            <Divider />
            <Text fontSize="xs" fontWeight="bold" color={subtleColor} textTransform="uppercase">
              Criar nova lista
            </Text>
            <HStack>
              <Input
                size="sm"
                placeholder="Nome da lista"
                value={novaLista}
                onChange={e => setNovaLista(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                borderRadius="lg"
              />
              <Button
                size="sm"
                colorScheme="brand"
                onClick={handleCreate}
                isLoading={creating}
                leftIcon={<Plus size={14} />}
                flexShrink={0}
              >
                Criar
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
