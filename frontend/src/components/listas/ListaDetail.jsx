import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Flex, Heading, HStack, Button, VStack, Text, Card, CardBody,
  Badge, Spinner, IconButton, Tag, Collapse, useDisclosure,
  useColorModeValue, useToast, Switch, FormControl, FormLabel,
} from '@chakra-ui/react';
import { ArrowLeft, Download, Globe, Lock, Trash2, ChevronDown, ChevronUp, Link2, Copy, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import MathRenderer from '../shared/MathRenderer';
import { DiagramRenderer } from '../shared/DiagramRenderer';
import { ListaPreviewModal } from './ListaPreviewModal';

const DIFFICULTY_COLOR = { Facil: 'green', Media: 'orange', Dificil: 'red' };
const STATUS_LABELS = { rascunho: 'Rascunho', publicada: 'Publicada' };
const PAGE_SIZE = 20;

function QuestaoRow({ questao, index, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const { isOpen, onToggle } = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const enunciadoColor = useColorModeValue('gray.700', 'gray.200');
  const altColor = useColorModeValue('gray.600', 'gray.400');
  const collapseBg = useColorModeValue('gray.50', 'gray.700');
  const collapseBorder = useColorModeValue('gray.200', 'gray.600');
  const diagramBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Card borderRadius="xl" border="1px" borderColor={borderColor} shadow="sm" bg={cardBg} transition="all 0.15s" _hover={{ shadow: 'md' }}>
      <CardBody>
        <Flex align="flex-start" justify="space-between" gap={3}>
          <VStack spacing={1} flexShrink={0} mt={1}>
            <IconButton size="xs" variant="ghost" icon={<ChevronUp size={13} />} aria-label="Mover para cima" onClick={onMoveUp} isDisabled={isFirst} />
            <Text fontSize="xs" color="gray.400" fontWeight="bold">{index + 1}</Text>
            <IconButton size="xs" variant="ghost" icon={<ChevronDown size={13} />} aria-label="Mover para baixo" onClick={onMoveDown} isDisabled={isLast} />
          </VStack>
          <Box flex={1} minW={0}>
            <HStack mb={2} spacing={2} flexWrap="wrap">
              <Badge variant="outline" colorScheme="gray" fontSize="0.65em">ID: {questao.id}</Badge>
              <Badge colorScheme={DIFFICULTY_COLOR[questao.dificuldade] || 'gray'} fontSize="0.65em">{questao.dificuldade}</Badge>
              {questao.materia && <Badge variant="subtle" colorScheme="blue" fontSize="0.65em">{questao.materia}</Badge>}
              {questao.tags && questao.tags.map(t => (
                <Badge key={t} variant="subtle" colorScheme="purple" fontSize="0.65em">{t}</Badge>
              ))}
            </HStack>
            <Text fontSize="sm" as="div" mb={2} color={enunciadoColor}>
              <MathRenderer parts={questao.enunciado} />
            </Text>
            {questao.diagrama && (
              <Flex justify="center" my={2} p={3} bg={diagramBg} borderRadius="lg" border="1px" borderColor={borderColor}>
                <DiagramRenderer diagrama={questao.diagrama} />
              </Flex>
            )}
            {questao.alternativas && questao.alternativas.length > 0 && (
              <VStack align="stretch" spacing={1} pl={3} mb={2}>
                {questao.alternativas.map((alt, i) => (
                  <Text key={i} fontSize="xs" color={altColor} as="div">
                    <Box as="strong" mr={1}>{String.fromCharCode(65 + i)})</Box>
                    <MathRenderer parts={alt || ''} />
                  </Text>
                ))}
              </VStack>
            )}
            <Button size="xs" variant="link" colorScheme="blue" onClick={onToggle} rightIcon={isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}>
              Ver Resposta
            </Button>
            <Collapse in={isOpen} animateOpacity>
              <Box p={3} mt={2} bg={collapseBg} borderRadius="md" border="1px" borderColor={collapseBorder}>
                <Text fontSize="xs" as="div">
                  <Box as="strong" mr={1}>Resposta:</Box>
                  <MathRenderer parts={questao.resposta_correta} />
                </Text>
                {questao.explicacao && (
                  <Text fontSize="xs" mt={1} as="div">
                    <Box as="strong" mr={1}>Explicação:</Box>
                    <MathRenderer parts={questao.explicacao} />
                  </Text>
                )}
              </Box>
            </Collapse>
          </Box>
          <IconButton size="sm" variant="ghost" colorScheme="red" icon={<Trash2 size={15} />} aria-label="Remover da lista" onClick={() => onRemove(questao.id)} flexShrink={0} />
        </Flex>
      </CardBody>
    </Card>
  );
}

export function ListaDetail({ lista, onBack, fetchQuestoes, onRemoveQuestao, onUpdateStatus, onExportPDF, onDuplicateLista, onReorderQuestoes }) {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lista.status);
  const [incluirGabarito, setIncluirGabarito] = useState(lista.incluir_gabarito ?? true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const previewDisclosure = useDisclosure();

  const emptyColor = useColorModeValue('gray.400', 'gray.500');
  const toast = useToast();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?lista=${lista.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: 'Compartilhe com seus alunos.', status: 'success', duration: 3000 });
  };

  const loadPage = useCallback(async (p) => {
    setLoading(true);
    const data = await fetchQuestoes(lista.id, PAGE_SIZE, p * PAGE_SIZE);
    setQuestoes(data.questoes || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [lista.id, fetchQuestoes]);

  useEffect(() => {
    setCurrentStatus(lista.status);
    setPage(0);
    loadPage(0);
  }, [lista.id]);

  const handleRemove = async (questaoId) => {
    await onRemoveQuestao(lista.id, questaoId);
    setQuestoes(prev => prev.filter(q => q.id !== questaoId));
    setTotal(prev => prev - 1);
  };

  const handleMove = async (idx, dir) => {
    const next = dir === 'up' ? idx - 1 : idx + 1;
    if (next < 0 || next >= questoes.length) return;
    const updated = [...questoes];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    setQuestoes(updated);
    const ordens = updated.map((q, i) => ({ questao_id: q.id, ordem: page * PAGE_SIZE + i }));
    await onReorderQuestoes(lista.id, ordens);
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    const novoStatus = currentStatus === 'publicada' ? 'rascunho' : 'publicada';
    const updated = await onUpdateStatus(lista.id, { status: novoStatus });
    if (updated) setCurrentStatus(novoStatus);
    setToggling(false);
  };

  const handleToggleGabarito = async (e) => {
    const valor = e.target.checked;
    setIncluirGabarito(valor);
    await onUpdateStatus(lista.id, { incluir_gabarito: valor });
  };

  const handleExportPDF = () => {
    onExportPDF(questoes, lista.nome, incluirGabarito);
  };

  const handleDuplicate = async () => {
    await onDuplicateLista(lista.id);
    onBack();
  };

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={6} wrap="wrap" gap={3}>
        <HStack spacing={3}>
          <IconButton icon={<ArrowLeft size={18} />} variant="ghost" onClick={onBack} aria-label="Voltar" />
          <Box>
            <Heading size="md">{lista.nome}</Heading>
            <HStack mt={1} spacing={2}>
              <Tag size="sm" colorScheme={currentStatus === 'publicada' ? 'green' : 'gray'} borderRadius="full">
                {STATUS_LABELS[currentStatus] || currentStatus}
              </Tag>
              <Text fontSize="xs" color={emptyColor}>{total} {total === 1 ? 'questão' : 'questões'}</Text>
            </HStack>
          </Box>
        </HStack>
        <HStack spacing={2} flexWrap="wrap">
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel htmlFor="gabarito-toggle" mb={0} fontSize="xs" mr={2} whiteSpace="nowrap">Gabarito</FormLabel>
            <Switch id="gabarito-toggle" size="sm" isChecked={incluirGabarito} onChange={handleToggleGabarito} colorScheme="brand" />
          </FormControl>
          <Button size="sm" variant="outline" colorScheme={currentStatus === 'publicada' ? 'gray' : 'green'} leftIcon={currentStatus === 'publicada' ? <Lock size={15} /> : <Globe size={15} />} onClick={handleToggleStatus} isLoading={toggling}>
            {currentStatus === 'publicada' ? 'Despublicar' : 'Publicar'}
          </Button>
          {currentStatus === 'publicada' && (
            <Button size="sm" variant="outline" colorScheme="blue" leftIcon={<Link2 size={15} />} onClick={handleCopyLink}>Copiar link</Button>
          )}
          <Button size="sm" variant="outline" colorScheme="purple" leftIcon={<Copy size={15} />} onClick={handleDuplicate}>Duplicar</Button>
          <Button size="sm" variant="outline" leftIcon={<Eye size={15} />} onClick={previewDisclosure.onOpen} isDisabled={questoes.length === 0}>Prévia</Button>
          <Button size="sm" leftIcon={<Download size={15} />} onClick={handleExportPDF} variant="outline" isDisabled={questoes.length === 0}>Exportar PDF</Button>
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner color="brand.500" /></Flex>
      ) : questoes.length === 0 && total === 0 ? (
        <Flex direction="column" align="center" py={16} gap={3} color={emptyColor}>
          <Text>Nenhuma questão nesta lista.</Text>
          <Text fontSize="sm">Adicione questões do Banco ou do Gerador usando o ícone de favorito.</Text>
        </Flex>
      ) : (
        <>
          <VStack spacing={3} align="stretch">
            {questoes.map((q, i) => (
              <QuestaoRow
                key={q.id}
                questao={q}
                index={i}
                onRemove={handleRemove}
                onMoveUp={() => handleMove(i, 'up')}
                onMoveDown={() => handleMove(i, 'down')}
                isFirst={i === 0 && page === 0}
                isLast={i === questoes.length - 1 && page === totalPages - 1}
              />
            ))}
          </VStack>
          {totalPages > 1 && (
            <Flex justify="space-between" align="center" mt={6}>
              <Button size="sm" leftIcon={<ChevronLeft size={14} />} onClick={() => { setPage(p => p - 1); loadPage(page - 1); }} isDisabled={page === 0}>Anterior</Button>
              <Text fontSize="sm" color={emptyColor}>Página {page + 1} de {totalPages}</Text>
              <Button size="sm" rightIcon={<ChevronRight size={14} />} onClick={() => { setPage(p => p + 1); loadPage(page + 1); }} isDisabled={page >= totalPages - 1}>Próxima</Button>
            </Flex>
          )}
        </>
      )}

      <ListaPreviewModal
        isOpen={previewDisclosure.isOpen}
        onClose={previewDisclosure.onClose}
        lista={lista}
        questoes={questoes}
        incluirGabarito={incluirGabarito}
        onExportPDF={handleExportPDF}
      />
    </Box>
  );
}
