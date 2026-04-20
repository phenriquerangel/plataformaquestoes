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
} from '@chakra-ui/react';
import { Trash2, Plus, Minus, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { DiagramRenderer } from './DiagramRenderer';
import { QuestionDetailModal } from './QuestionDetailModal';

function QuestionCard({ question, onDelete, onAddToList, customList, showDelete, highlight, index }) {
  const { isOpen, onToggle } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const isInList = customList.some(item => item.id === question.id);

  return (
    <>
      <QuestionDetailModal isOpen={isDetailOpen} onClose={onDetailClose} question={question} />
      <Card borderRadius="xl" w="full" shadow="base" border="1px" borderColor="gray.200">
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontWeight="bold" fontSize="md" color="gray.700">
                <MathRenderer parts={question.enunciado} highlight={highlight} />
              </Text>
              <HStack>
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
                <IconButton
                  size="sm"
                  variant={isInList ? "solid" : "outline"}
                  colorScheme="brand"
                  aria-label={isInList ? "Remover da lista" : "Adicionar à lista"}
                  icon={isInList ? <Minus size={16} /> : <Plus size={16} />}
                  onClick={() => onAddToList(question)}
                />
              </HStack>
            </HStack>
          {question.diagrama && (
            <Flex justify="center" my={2} p={4} bg="gray.50" borderRadius="lg" border="1px" borderColor="gray.200">
              <DiagramRenderer diagrama={question.diagrama} />
            </Flex>
          )}
          <VStack align="stretch" spacing={2} pl={4}>
            {question.alternativas.map((alt, i) => (
              <Text key={i} fontSize="sm" as="div">
                <Box as="strong" mr={1}>{`${String.fromCharCode(65 + i)})`}</Box>
                <MathRenderer
                  parts={alt || ''} // MathRenderer tem fallback para string
                  highlight={highlight} />
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
            <Box p={4} mt={2} bg="gray.50" borderRadius="md" border="1px" borderColor="gray.200">
              <Text fontSize="sm" as="div"><Box as="strong" mr={1}>Resposta Correta:</Box><MathRenderer parts={question.resposta_correta} /></Text>
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

export const QuestionList = ({ questions, onDelete, onAddToList, customList, showDelete = false, highlight = '', loading = false }) => {
  if (loading) {
    return (
      <VStack spacing={4} align="stretch">
        {[...Array(3)].map((_, i) => (
          <Card key={i} borderRadius="xl" w="full" p={5} shadow="base">
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
      <Flex justify="center" align="center" p={10} bg="gray.100" borderRadius="xl">
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
        />
      ))}
    </VStack>
  );
};