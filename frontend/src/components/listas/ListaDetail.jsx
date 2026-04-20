import React, { useEffect, useState } from 'react';
import {
  Box, Flex, Heading, HStack, Button, VStack, Text, Card, CardBody,
  Badge, Spinner, IconButton, Tag, Collapse, useDisclosure,
  useColorModeValue,
} from '@chakra-ui/react';
import { ArrowLeft, Download, Globe, Lock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import MathRenderer from '../shared/MathRenderer';
import { DiagramRenderer } from '../shared/DiagramRenderer';

const DIFFICULTY_COLOR = { Facil: 'green', Media: 'orange', Dificil: 'red' };
const STATUS_LABELS = { rascunho: 'Rascunho', publicada: 'Publicada' };

function QuestaoRow({ questao, onRemove }) {
  const { isOpen, onToggle } = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const enunciadoColor = useColorModeValue('gray.700', 'gray.200');
  const altColor = useColorModeValue('gray.600', 'gray.400');
  const collapseBg = useColorModeValue('gray.50', 'gray.700');
  const collapseBorder = useColorModeValue('gray.200', 'gray.600');
  const diagramBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Card
      borderRadius="xl"
      border="1px"
      borderColor={borderColor}
      shadow="sm"
      bg={cardBg}
      transition="all 0.15s"
      _hover={{ shadow: 'md' }}
    >
      <CardBody>
        <Flex align="flex-start" justify="space-between" gap={3}>
          <Box flex={1} minW={0}>
            <HStack mb={2} spacing={2} flexWrap="wrap">
              <Badge variant="outline" colorScheme="gray" fontSize="0.65em">ID: {questao.id}</Badge>
              <Badge colorScheme={DIFFICULTY_COLOR[questao.dificuldade] || 'gray'} fontSize="0.65em">
                {questao.dificuldade}
              </Badge>
              {questao.materia && (
                <Badge variant="subtle" colorScheme="blue" fontSize="0.65em">{questao.materia}</Badge>
              )}
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
            <Button
              size="xs"
              variant="link"
              colorScheme="blue"
              onClick={onToggle}
              rightIcon={isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            >
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
          <IconButton
            size="sm"
            variant="ghost"
            colorScheme="red"
            icon={<Trash2 size={15} />}
            aria-label="Remover da lista"
            onClick={() => onRemove(questao.id)}
            flexShrink={0}
          />
        </Flex>
      </CardBody>
    </Card>
  );
}

export function ListaDetail({ lista, onBack, fetchQuestoes, onRemoveQuestao, onUpdateStatus, onExportPDF }) {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lista.status);

  const emptyColor = useColorModeValue('gray.400', 'gray.500');

  useEffect(() => {
    setLoading(true);
    setCurrentStatus(lista.status);
    fetchQuestoes(lista.id).then(data => {
      setQuestoes(data.questoes || []);
      setLoading(false);
    });
  }, [lista.id, fetchQuestoes]);

  const handleRemove = async (questaoId) => {
    await onRemoveQuestao(lista.id, questaoId);
    setQuestoes(prev => prev.filter(q => q.id !== questaoId));
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    const novoStatus = currentStatus === 'publicada' ? 'rascunho' : 'publicada';
    const updated = await onUpdateStatus(lista.id, { status: novoStatus });
    if (updated) setCurrentStatus(novoStatus);
    setToggling(false);
  };

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={6} wrap="wrap" gap={3}>
        <HStack spacing={3}>
          <IconButton
            icon={<ArrowLeft size={18} />}
            variant="ghost"
            onClick={onBack}
            aria-label="Voltar"
          />
          <Box>
            <Heading size="md">{lista.nome}</Heading>
            <HStack mt={1} spacing={2}>
              <Tag
                size="sm"
                colorScheme={currentStatus === 'publicada' ? 'green' : 'gray'}
                borderRadius="full"
              >
                {STATUS_LABELS[currentStatus] || currentStatus}
              </Tag>
              <Text fontSize="xs" color={emptyColor}>
                {questoes.length} questão{questoes.length !== 1 ? 'ões' : ''}
              </Text>
            </HStack>
          </Box>
        </HStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            colorScheme={currentStatus === 'publicada' ? 'gray' : 'green'}
            leftIcon={currentStatus === 'publicada' ? <Lock size={15} /> : <Globe size={15} />}
            onClick={handleToggleStatus}
            isLoading={toggling}
          >
            {currentStatus === 'publicada' ? 'Despublicar' : 'Publicar'}
          </Button>
          <Button
            size="sm"
            leftIcon={<Download size={15} />}
            onClick={() => onExportPDF(questoes, lista.nome)}
            variant="outline"
            isDisabled={questoes.length === 0}
          >
            Exportar PDF
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner color="brand.500" /></Flex>
      ) : questoes.length === 0 ? (
        <Flex direction="column" align="center" py={16} gap={3} color={emptyColor}>
          <Text>Nenhuma questão nesta lista.</Text>
          <Text fontSize="sm">Adicione questões do Banco ou do Gerador usando o ícone de favorito.</Text>
        </Flex>
      ) : (
        <VStack spacing={3} align="stretch">
          {questoes.map(q => (
            <QuestaoRow key={q.id} questao={q} onRemove={handleRemove} />
          ))}
        </VStack>
      )}
    </Box>
  );
}
