import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Card, CardBody, CardHeader, Heading, HStack, VStack,
  Flex, Text, Select, Input, Button, Badge,
  TableContainer, Table, Thead, Tbody, Tr, Th, Td, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay,
  useDisclosure, Spinner, FormLabel, FormControl,
} from '@chakra-ui/react';
import { FileQuestion, Trash2, Edit3, ChevronLeft, ChevronRight, Search, Eye } from 'lucide-react';
import { useAdminQuestoes, ADMIN_Q_LIMIT } from '../../hooks/useAdminQuestoes';
import { apiClient } from '../../api';
import { QuestionDetailModal } from '../shared/QuestionDetailModal';

const DIFICULDADES = ['Facil', 'Media', 'Dificil'];

export function QuestoesAdmin({ materias, onStatsRefresh }) {
  const [filterMateria, setFilterMateria] = useState('');
  const [filterAssunto, setFilterAssunto] = useState('');
  const [filterDificuldade, setFilterDificuldade] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [assuntosFilter, setAssuntosFilter] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});

  const [editingQuestao, setEditingQuestao] = useState(null);
  const [editDificuldade, setEditDificuldade] = useState('');
  const [editResposta, setEditResposta] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [detailQuestao, setDetailQuestao] = useState(null);

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const cancelRef = useRef();

  const { questoes, loading, total, offset, fetchQuestoes, deleteQuestao, editQuestao } = useAdminQuestoes();

  useEffect(() => {
    if (!filterMateria) { setAssuntosFilter([]); setFilterAssunto(''); return; }
    apiClient(`assuntos/${filterMateria}`)
      .then(data => setAssuntosFilter(data || []))
      .catch(() => setAssuntosFilter([]));
    setFilterAssunto('');
  }, [filterMateria]);

  const buildFilters = useCallback(() => ({
    materiaId: filterMateria || null,
    assuntoId: filterAssunto || null,
    dificuldade: filterDificuldade || null,
    keyword: filterKeyword || null,
  }), [filterMateria, filterAssunto, filterDificuldade, filterKeyword]);

  const handleSearch = (newOffset = 0) => {
    const filters = buildFilters();
    setActiveFilters(filters);
    fetchQuestoes(newOffset, filters);
  };

  const handleDelete = (id) => { setDeleteId(id); onDeleteOpen(); };

  const confirmDelete = () => {
    deleteQuestao(deleteId, () => {
      onDeleteClose();
      fetchQuestoes(offset, activeFilters);
      onStatsRefresh?.();
    });
  };

  const handleViewDetail = async (q) => {
    try {
      const data = await apiClient(`questoes-salvas?questao_id=${q.id}`);
      const full = data.questoes?.[0];
      if (full) {
        setDetailQuestao({ ...full, assunto_nome: q.assunto_nome, materia_nome: q.materia_nome });
        onDetailOpen();
      }
    } catch {
      // silencioso — questão pode ter sido deletada
    }
  };

  const handleEdit = (q) => {
    setEditingQuestao(q);
    setEditDificuldade(q.dificuldade === '—' ? '' : q.dificuldade);
    setEditResposta(q.resposta_correta === '—' ? '' : q.resposta_correta);
    onEditOpen();
  };

  const confirmEdit = () => {
    editQuestao(editingQuestao.id, { dificuldade: editDificuldade || null, resposta_correta: editResposta || null }, () => {
      onEditClose();
      fetchQuestoes(offset, activeFilters);
    });
  };

  const totalPages = Math.ceil(total / ADMIN_Q_LIMIT);
  const currentPage = Math.floor(offset / ADMIN_Q_LIMIT) + 1;

  return (
    <>
      <Card borderRadius="2xl" mt={8}>
        <CardHeader borderBottom="1px" borderColor="gray.100">
          <HStack spacing={3}>
            <FileQuestion size={18} />
            <Heading size="sm">Gestão de Questões</Heading>
            {total > 0 && <Badge colorScheme="brand" borderRadius="full">{total} questões</Badge>}
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Filtros */}
            <Flex gap={3} wrap="wrap">
              <Select
                placeholder="Todas as matérias"
                value={filterMateria}
                onChange={e => setFilterMateria(e.target.value)}
                maxW="200px"
                size="sm"
                borderRadius="md"
              >
                {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </Select>
              <Select
                placeholder="Todos os assuntos"
                value={filterAssunto}
                onChange={e => setFilterAssunto(e.target.value)}
                maxW="200px"
                size="sm"
                borderRadius="md"
                isDisabled={!filterMateria}
              >
                {assuntosFilter.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </Select>
              <Select
                placeholder="Dificuldade"
                value={filterDificuldade}
                onChange={e => setFilterDificuldade(e.target.value)}
                maxW="160px"
                size="sm"
                borderRadius="md"
              >
                {DIFICULDADES.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
              <Input
                placeholder="Palavra-chave..."
                value={filterKeyword}
                onChange={e => setFilterKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                maxW="220px"
                size="sm"
                borderRadius="md"
              />
              <Button
                size="sm"
                colorScheme="blue"
                leftIcon={<Search size={14} />}
                onClick={() => handleSearch()}
                isLoading={loading}
              >
                Buscar
              </Button>
            </Flex>

            {/* Tabela */}
            {questoes.length === 0 && !loading ? (
              <Flex justify="center" py={8} color="gray.400">
                <Text fontSize="sm">Use os filtros acima para buscar questões.</Text>
              </Flex>
            ) : (
              <>
                <TableContainer border="1px" borderColor="gray.100" borderRadius="md">
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th width="50px">ID</Th>
                        <Th>Enunciado</Th>
                        <Th width="100px">Dificuldade</Th>
                        <Th width="80px">Resposta</Th>
                        <Th width="140px">Assunto / Matéria</Th>
                        <Th width="80px" textAlign="right">Ações</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {loading ? (
                        <Tr><Td colSpan={6} textAlign="center" py={6}><Spinner size="sm" /></Td></Tr>
                      ) : (
                        questoes.map(q => (
                          <Tr key={q.id} _hover={{ bg: 'gray.50' }}>
                            <Td color="gray.400" fontFamily="mono" fontSize="xs">{q.id}</Td>
                            <Td maxW="320px">
                              <Text noOfLines={2} fontSize="sm" title={q.enunciado_preview}>
                                {q.enunciado_preview}
                              </Text>
                            </Td>
                            <Td>
                              <Badge
                                colorScheme={q.dificuldade === 'Facil' ? 'green' : q.dificuldade === 'Dificil' ? 'red' : 'orange'}
                                borderRadius="full"
                                fontSize="xs"
                              >
                                {q.dificuldade}
                              </Badge>
                            </Td>
                            <Td fontWeight="bold" fontSize="sm">{q.resposta_correta}</Td>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="xs" fontWeight="medium">{q.assunto_nome}</Text>
                                <Text fontSize="xs" color="gray.400">{q.materia_nome}</Text>
                              </VStack>
                            </Td>
                            <Td textAlign="right">
                              <HStack justify="flex-end" spacing={1}>
                                <IconButton
                                  size="xs" icon={<Eye size={14} />} colorScheme="gray" variant="ghost"
                                  onClick={() => handleViewDetail(q)}
                                />
                                <IconButton
                                  size="xs" icon={<Edit3 size={14} />} colorScheme="blue" variant="ghost"
                                  onClick={() => handleEdit(q)}
                                />
                                <IconButton
                                  size="xs" icon={<Trash2 size={14} />} colorScheme="red" variant="ghost"
                                  onClick={() => handleDelete(q.id)}
                                />
                              </HStack>
                            </Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>

                {/* Paginação */}
                {total > ADMIN_Q_LIMIT && (
                  <Flex justify="space-between" align="center" pt={1}>
                    <Text fontSize="xs" color="gray.500">
                      {offset + 1}–{Math.min(offset + ADMIN_Q_LIMIT, total)} de {total} questões
                    </Text>
                    <HStack spacing={2}>
                      <IconButton
                        size="xs" icon={<ChevronLeft size={14} />} variant="outline"
                        isDisabled={offset === 0}
                        onClick={() => handleSearch(offset - ADMIN_Q_LIMIT)}
                      />
                      <Text fontSize="xs" color="gray.600">{currentPage} / {totalPages}</Text>
                      <IconButton
                        size="xs" icon={<ChevronRight size={14} />} variant="outline"
                        isDisabled={offset + ADMIN_Q_LIMIT >= total}
                        onClick={() => handleSearch(offset + ADMIN_Q_LIMIT)}
                      />
                    </HStack>
                  </Flex>
                )}
              </>
            )}
          </VStack>
        </CardBody>
      </Card>

      <QuestionDetailModal isOpen={isDetailOpen} onClose={onDetailClose} question={detailQuestao} />

      {/* Modal de edição */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalHeader fontSize="md">Editar Questão #{editingQuestao?.id}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Dificuldade</FormLabel>
                <Select value={editDificuldade} onChange={e => setEditDificuldade(e.target.value)} borderRadius="md">
                  <option value="">— sem alteração —</option>
                  {DIFICULDADES.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Resposta Correta</FormLabel>
                <Input
                  value={editResposta}
                  onChange={e => setEditResposta(e.target.value)}
                  placeholder="Ex: A, B, C..."
                  borderRadius="md"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onEditClose}>Cancelar</Button>
            <Button colorScheme="blue" onClick={confirmEdit}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="2xl">
            <AlertDialogHeader fontSize="md">Excluir Questão</AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              Tem certeza que deseja excluir a questão #{deleteId}? Esta ação não pode ser desfeita.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} variant="ghost" onClick={onDeleteClose}>Cancelar</Button>
              <Button colorScheme="red" onClick={confirmDelete}>Excluir</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
