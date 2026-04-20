import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, CardBody, Flex, Heading, HStack, IconButton,
  Input, Spinner, Tag, Text, VStack, useDisclosure,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay,
} from '@chakra-ui/react';
import { BookOpen, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const STATUS_COLORS = {
  rascunho: 'gray',
  publicada: 'green',
};

const STATUS_LABELS = {
  rascunho: 'Rascunho',
  publicada: 'Publicada',
};

function ListaCard({ lista, onDelete, onRename, onOpen }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(lista.nome);

  const handleSave = () => {
    if (nome.trim() && nome !== lista.nome) onRename(lista.id, nome.trim());
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setNome(lista.nome); setEditing(false); }
  };

  return (
    <Card borderRadius="xl" border="1px" borderColor="gray.100" shadow="sm" _hover={{ shadow: 'md' }} transition="all 0.15s">
      <CardBody>
        <Flex align="center" justify="space-between" gap={3}>
          <Flex align="center" gap={3} flex={1} minW={0}>
            <Box bg="brand.50" p={2} borderRadius="lg" flexShrink={0}>
              <BookOpen size={18} color="var(--chakra-colors-brand-600)" />
            </Box>
            <Box flex={1} minW={0}>
              {editing ? (
                <HStack>
                  <Input
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="sm"
                    autoFocus
                    borderRadius="md"
                  />
                  <IconButton icon={<Check size={14} />} size="xs" colorScheme="green" onClick={handleSave} aria-label="Salvar" />
                  <IconButton icon={<X size={14} />} size="xs" variant="ghost" onClick={() => { setNome(lista.nome); setEditing(false); }} aria-label="Cancelar" />
                </HStack>
              ) : (
                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>{lista.nome}</Text>
              )}
              <HStack mt={1} spacing={2}>
                <Tag size="sm" colorScheme={STATUS_COLORS[lista.status] || 'gray'} borderRadius="full">
                  {STATUS_LABELS[lista.status] || lista.status}
                </Tag>
                <Text fontSize="xs" color="gray.400">{lista.total_questoes} questão{lista.total_questoes !== 1 ? 'ões' : ''}</Text>
              </HStack>
            </Box>
          </Flex>
          <HStack spacing={1} flexShrink={0}>
            <Button size="xs" variant="ghost" colorScheme="brand" onClick={() => onOpen(lista)}>
              Abrir
            </Button>
            {!editing && (
              <IconButton icon={<Edit2 size={13} />} size="xs" variant="ghost" onClick={() => setEditing(true)} aria-label="Renomear" />
            )}
            <IconButton icon={<Trash2 size={13} />} size="xs" variant="ghost" colorScheme="red" onClick={() => onDelete(lista)} aria-label="Excluir" />
          </HStack>
        </Flex>
      </CardBody>
    </Card>
  );
}

export function MinhasListas({ listas, loading, onFetch, onCreate, onDelete, onRename, onOpenLista }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();
  const [listaParaExcluir, setListaParaExcluir] = useState(null);
  const [novaLista, setNovaLista] = useState('');

  useEffect(() => { onFetch(); }, [onFetch]);

  const handleDelete = (lista) => {
    setListaParaExcluir(lista);
    onOpen();
  };

  const confirmDelete = () => {
    if (listaParaExcluir) onDelete(listaParaExcluir.id);
    onClose();
  };

  const handleCreate = () => {
    const nome = novaLista.trim() || 'Nova Lista';
    onCreate(nome);
    setNovaLista('');
  };

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="md">Minhas Listas</Heading>
        <HStack>
          <Input
            placeholder="Nome da nova lista"
            size="sm"
            value={novaLista}
            onChange={e => setNovaLista(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            borderRadius="lg"
            w="200px"
          />
          <Button leftIcon={<Plus size={16} />} colorScheme="brand" size="sm" onClick={handleCreate}>
            Nova Lista
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner color="brand.500" /></Flex>
      ) : listas.length === 0 ? (
        <Flex direction="column" align="center" py={16} gap={3} color="gray.400">
          <BookOpen size={40} />
          <Text>Nenhuma lista salva ainda.</Text>
          <Text fontSize="sm">Crie uma lista e adicione questões do banco ou do gerador.</Text>
        </Flex>
      ) : (
        <VStack spacing={3} align="stretch">
          {listas.map(lista => (
            <ListaCard
              key={lista.id}
              lista={lista}
              onDelete={handleDelete}
              onRename={onRename}
              onOpen={onOpenLista}
            />
          ))}
        </VStack>
      )}

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="2xl">
            <AlertDialogHeader>Excluir lista</AlertDialogHeader>
            <AlertDialogBody>
              Tem certeza que deseja excluir <strong>"{listaParaExcluir?.nome}"</strong>? As questões não serão apagadas.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>Cancelar</Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>Excluir</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
