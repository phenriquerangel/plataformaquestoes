import React, { useState } from 'react';
import {
  Box, Card, CardBody, VStack, Text, HStack, IconButton, Badge,
  Collapse, useDisclosure, Skeleton, Flex, Button, useColorModeValue,
  Textarea, Input, Wrap, Tag, TagLabel, TagCloseButton, useToast,
} from '@chakra-ui/react';
import { Trash2, Plus, Minus, ChevronDown, ChevronUp, Eye, Bookmark, Pencil, Check, X } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { DiagramRenderer } from './DiagramRenderer';
import { QuestionDetailModal } from './QuestionDetailModal';
import { AddToListaModal } from '../listas/AddToListaModal';
import { apiClient } from '../../api';

// Converte parts array para string editável (com tags [math]...[/math])
function partsToEditString(parts) {
  if (!parts) return '';
  if (typeof parts === 'string') return parts;
  if (Array.isArray(parts)) {
    return parts.map(p => p.type === 'latex' ? `[math]${p.content}[/math]` : (p.content || '')).join('');
  }
  return '';
}

// Converte string editável de volta para parts array
function editStringToParts(str) {
  if (!str) return [{ type: 'text', content: '' }];
  const regex = /(\[math\][\s\S]*?\[\/math\])/g;
  const segments = str.split(regex);
  return segments.filter(s => s !== '').map(s => {
    if (s.match(/^\[math\][\s\S]*\[\/math\]$/)) {
      return { type: 'latex', content: s.slice(6, -7) };
    }
    return { type: 'text', content: s };
  });
}

function InlineEditor({ question, onSaved }) {
  const [enunciado, setEnunciado] = useState(partsToEditString(question.enunciado));
  const [alts, setAlts] = useState([...(question.alternativas || [])]);
  const [resposta, setResposta] = useState(question.resposta_correta || '');
  const [tags, setTags] = useState([...(question.tags || [])]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const inputBg = useColorModeValue('white', 'gray.700');

  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,$/, '');
      if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient(`questoes/${question.id}`, 'PUT', {
        enunciado: editStringToParts(enunciado),
        alternativas: alts,
        resposta_correta: resposta,
        tags,
      });
      toast({ title: 'Questão atualizada', status: 'success', duration: 2000 });
      onSaved({
        ...question,
        enunciado: editStringToParts(enunciado),
        alternativas: alts,
        resposta_correta: resposta,
        tags,
      });
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack align="stretch" spacing={3} mt={2}>
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.500">ENUNCIADO (use [math]...[/math] para LaTeX)</Text>
        <Textarea value={enunciado} onChange={e => setEnunciado(e.target.value)} size="sm" bg={inputBg} rows={3} />
      </Box>
      {alts.length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.500">ALTERNATIVAS</Text>
          <VStack align="stretch" spacing={1}>
            {alts.map((alt, i) => (
              <HStack key={i}>
                <Text fontSize="xs" fontWeight="bold" w="20px">{String.fromCharCode(65 + i)})</Text>
                <Input size="xs" value={alt} onChange={e => { const n = [...alts]; n[i] = e.target.value; setAlts(n); }} bg={inputBg} />
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
      {alts.length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.500">RESPOSTA CORRETA</Text>
          <Input size="sm" value={resposta} onChange={e => setResposta(e.target.value)} bg={inputBg} />
        </Box>
      )}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.500">TAGS</Text>
        <Wrap spacing={1} mb={1}>
          {tags.map(t => (
            <Tag key={t} size="sm" colorScheme="purple" variant="subtle">
              <TagLabel>{t}</TagLabel>
              <TagCloseButton onClick={() => setTags(prev => prev.filter(x => x !== t))} />
            </Tag>
          ))}
        </Wrap>
        <Input size="xs" placeholder="Adicionar tag (Enter para confirmar)" value={tagInput}
          onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} bg={inputBg} />
      </Box>
      <HStack justify="flex-end">
        <Button size="xs" leftIcon={<Check size={13} />} colorScheme="green" onClick={save} isLoading={saving}>Salvar</Button>
      </HStack>
    </VStack>
  );
}

function QuestionCard({ question: initialQuestion, onDelete, onAddToList, customList, showDelete, highlight, index, listas, onAddToLista, onCreateAndAdd }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [editing, setEditing] = useState(false);
  const { isOpen, onToggle } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isListaModalOpen, onOpen: onListaModalOpen, onClose: onListaModalClose } = useDisclosure();
  const isInList = customList.some(item => item.id === question.id);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = isInList
    ? useColorModeValue('brand.400', 'brand.500') // eslint-disable-line react-hooks/rules-of-hooks
    : useColorModeValue('gray.200', 'gray.700'); // eslint-disable-line react-hooks/rules-of-hooks
  const collapseBg = useColorModeValue('gray.50', 'gray.700');
  const collapseBorder = useColorModeValue('gray.200', 'gray.600');
  const enunciadoColor = useColorModeValue('gray.700', 'gray.100');
  const altColor = useColorModeValue('gray.600', 'gray.300');
  const diagramBg = useColorModeValue('gray.50', 'gray.700');
  const diagramBorder = useColorModeValue('gray.200', 'gray.600');

  return (
    <>
      <QuestionDetailModal isOpen={isDetailOpen} onClose={onDetailClose} question={question} />
      {listas && (
        <AddToListaModal
          isOpen={isListaModalOpen}
          onClose={onListaModalClose}
          question={question}
          listas={listas}
          onAddToLista={onAddToLista}
          onCreateAndAdd={onCreateAndAdd}
        />
      )}
      <Card borderRadius="xl" w="full" shadow="sm" border="1.5px solid" borderColor={borderColor} bg={cardBg} transition="all 0.18s" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}>
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontWeight="bold" fontSize="md" color={enunciadoColor} flex={1} minW={0}>
                <MathRenderer parts={question.enunciado} highlight={highlight} />
              </Text>
              <HStack flexShrink={0} flexWrap="wrap" justify="flex-end">
                <Badge variant="outline" colorScheme="gray" fontSize="0.7em">ID: {question.id}</Badge>
                <Badge colorScheme={question.dificuldade === 'Facil' ? 'green' : question.dificuldade === 'Media' ? 'orange' : 'red'}>
                  {question.dificuldade}
                </Badge>
                {question.vezes_usada > 0 && (
                  <Badge variant="subtle" colorScheme="teal" fontSize="0.65em">usado {question.vezes_usada}×</Badge>
                )}
                <IconButton size="sm" variant="ghost" colorScheme="gray" aria-label="Ver detalhes" icon={<Eye size={16} />} onClick={onDetailOpen} />
                <IconButton size="sm" variant={editing ? 'solid' : 'ghost'} colorScheme="yellow" aria-label="Editar questão" icon={editing ? <X size={16} /> : <Pencil size={16} />} onClick={() => setEditing(e => !e)} />
                {showDelete && (
                  <IconButton size="sm" variant="ghost" colorScheme="red" aria-label="Excluir questão" icon={<Trash2 size={16} />} onClick={() => onDelete(question.id, index)} />
                )}
                {listas && (
                  <IconButton size="sm" variant="ghost" colorScheme="purple" aria-label="Adicionar a uma lista salva" icon={<Bookmark size={16} />} onClick={onListaModalOpen} />
                )}
                <IconButton
                  size="sm"
                  variant={isInList ? 'solid' : 'outline'}
                  colorScheme="brand"
                  aria-label={isInList ? 'Remover da lista temporária' : 'Adicionar à lista temporária'}
                  icon={isInList ? <Minus size={16} /> : <Plus size={16} />}
                  onClick={() => onAddToList(question)}
                />
              </HStack>
            </HStack>

            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <Wrap spacing={1}>
                {question.tags.map(t => (
                  <Tag key={t} size="sm" colorScheme="purple" variant="subtle"><TagLabel>{t}</TagLabel></Tag>
                ))}
              </Wrap>
            )}

            {editing && (
              <InlineEditor question={question} onSaved={(updated) => { setQuestion(updated); setEditing(false); }} />
            )}

            {!editing && (
              <>
                {question.diagrama && (
                  <Flex justify="center" my={2} p={4} bg={diagramBg} borderRadius="lg" border="1px" borderColor={diagramBorder}>
                    <DiagramRenderer diagrama={question.diagrama} />
                  </Flex>
                )}
                <VStack align="stretch" spacing={2} pl={4}>
                  {question.alternativas.map((alt, i) => (
                    <Text key={i} fontSize="sm" color={altColor} as="div">
                      <Box as="strong" mr={1}>{`${String.fromCharCode(65 + i)})`}</Box>
                      <MathRenderer parts={alt || ''} highlight={highlight} />
                    </Text>
                  ))}
                </VStack>
                <Button size="sm" variant="link" colorScheme="blue" onClick={onToggle} rightIcon={isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}>
                  Ver Resposta e Explicação
                </Button>
                <Collapse in={isOpen} animateOpacity>
                  <Box p={4} mt={2} bg={collapseBg} borderRadius="md" border="1px" borderColor={collapseBorder}>
                    <Text fontSize="sm" as="div">
                      <Box as="strong" mr={1}>Resposta Correta:</Box>
                      <MathRenderer parts={question.resposta_correta} />
                    </Text>
                    <Text fontSize="sm" mt={2} as="div">
                      <Box as="strong" mr={1}>Explicação:</Box>
                      <MathRenderer parts={question.explicacao} highlight={highlight} />
                    </Text>
                  </Box>
                </Collapse>
              </>
            )}
          </VStack>
        </CardBody>
      </Card>
    </>
  );
}

export const QuestionList = ({ questions, onDelete, onAddToList, customList, showDelete = false, highlight = '', loading = false, listas, onAddToLista, onCreateAndAdd }) => {
  const skeletonBg = useColorModeValue('white', 'gray.800');

  if (loading) {
    return (
      <VStack spacing={4} align="stretch">
        {[...Array(3)].map((_, i) => (
          <Card key={i} borderRadius="xl" w="full" p={5} shadow="sm" bg={skeletonBg}>
            <Skeleton height="20px" mb={4} />
            <Skeleton height="15px" mb={2} />
            <Skeleton height="15px" mb={2} />
            <Skeleton height="15px" />
          </Card>
        ))}
      </VStack>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Flex justify="center" align="center" p={10} bg={skeletonBg} borderRadius="xl">
        <Text color="gray.500">Nenhuma questão para exibir. Gere novas questões ou ajuste sua busca.</Text>
      </Flex>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {questions.map((q, index) => (
        <QuestionCard
          key={q.id || index}
          question={q}
          onDelete={onDelete}
          onAddToList={onAddToList}
          customList={customList}
          showDelete={showDelete}
          highlight={highlight}
          index={index}
          listas={listas}
          onAddToLista={onAddToLista}
          onCreateAndAdd={onCreateAndAdd}
        />
      ))}
    </VStack>
  );
};
