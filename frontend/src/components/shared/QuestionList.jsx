import React from 'react';
import {
  Box,
  Card,
  CardBody,
  VStack,
  Text,
  HStack,
  IconButton,
  Badge,
  Collapse,
  useDisclosure,
  Skeleton,
  Flex,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { Trash2, Plus, Minus, ChevronDown, ChevronUp, Eye, Bookmark } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { DiagramRenderer } from './DiagramRenderer';
import { QuestionDetailModal } from './QuestionDetailModal';
import { AddToListaModal } from '../listas/AddToListaModal';

function QuestionCard({ question, onDelete, onAddToList, customList, showDelete, highlight, index, listas, onAddToLista, onCreateAndAdd }) {
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
      <Card
        borderRadius="xl"
        w="full"
        shadow="sm"
        border="1.5px solid"
        borderColor={borderColor}
        bg={cardBg}
        transition="all 0.18s"
        _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
      >
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontWeight="bold" fontSize="md" color={enunciadoColor} flex={1} minW={0}>
                <MathRenderer parts={question.enunciado} highlight={highlight} />
              </Text>
              <HStack flexShrink={0}>
                <Badge variant="outline" colorScheme="gray" fontSize="0.7em">
                  ID: {question.id}
                </Badge>
                <Badge colorScheme={question.dificuldade === 'Facil' ? 'green' : question.dificuldade === 'Media' ? 'orange' : 'red'}>
                  {question.dificuldade}
                </Badge>
                <IconButton
                  size="sm"
                  variant="ghost"
                  colorScheme="gray"
                  aria-label="Ver detalhes"
                  icon={<Eye size={16} />}
                  onClick={onDetailOpen}
                />
                {showDelete && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    aria-label="Excluir questão"
                    icon={<Trash2 size={16} />}
                    onClick={() => onDelete(question.id, index)}
                  />
                )}
                {listas && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="purple"
                    aria-label="Adicionar a uma lista salva"
                    icon={<Bookmark size={16} />}
                    onClick={onListaModalOpen}
                    title="Adicionar a uma lista salva"
                  />
                )}
                <IconButton
                  size="sm"
                  variant={isInList ? 'solid' : 'outline'}
                  colorScheme="brand"
                  aria-label={isInList ? 'Remover da lista temporária' : 'Adicionar à lista temporária'}
                  icon={isInList ? <Minus size={16} /> : <Plus size={16} />}
                  onClick={() => onAddToList(question)}
                  title={isInList ? 'Remover da lista temporária' : 'Adicionar à lista temporária'}
                />
              </HStack>
            </HStack>
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
          <Button
            size="sm"
            variant="link"
            colorScheme="blue"
            onClick={onToggle}
            rightIcon={isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          >
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
