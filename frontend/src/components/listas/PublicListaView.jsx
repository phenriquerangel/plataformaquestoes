import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, Text, VStack, Card, CardBody,
  Badge, HStack, Spinner, Flex, Button, Collapse, useDisclosure,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MathJaxContext } from 'better-react-mathjax';
import MathRenderer from '../shared/MathRenderer';
import { DiagramRenderer } from '../shared/DiagramRenderer';

const mathJaxConfig = {
  loader: { load: ['input/tex', 'output/svg'] },
  tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
};

const DIFFICULTY_COLOR = { Facil: 'green', Media: 'orange', Dificil: 'red' };

function QuestaoRow({ questao, index, incluirGabarito }) {
  const { isOpen, onToggle } = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const altColor = useColorModeValue('gray.600', 'gray.400');
  const collapseBg = useColorModeValue('gray.50', 'gray.700');
  const collapseBorder = useColorModeValue('gray.200', 'gray.600');
  const diagramBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Card borderRadius="xl" border="1px" borderColor={borderColor} shadow="sm" bg={cardBg}>
      <CardBody>
        <HStack mb={2} spacing={2} flexWrap="wrap">
          <Badge variant="outline" colorScheme="gray" fontSize="0.65em">Q{index + 1}</Badge>
          <Badge colorScheme={DIFFICULTY_COLOR[questao.dificuldade] || 'gray'} fontSize="0.65em">
            {questao.dificuldade}
          </Badge>
        </HStack>
        <Text fontSize="sm" as="div" mb={2}>
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
        {incluirGabarito && (
          <>
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
          </>
        )}
      </CardBody>
    </Card>
  );
}

export function PublicListaView({ listaId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const bg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    fetch(`/api/listas/${listaId}/public`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Esta lista não está publicada.' : 'Lista não encontrada.');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message));
  }, [listaId]);

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box minH="100vh" bg={bg} py={10}>
        <Container maxW="container.md">
          {!data && !error && (
            <Flex justify="center" pt={20}><Spinner size="xl" color="brand.500" /></Flex>
          )}
          {error && (
            <Flex direction="column" align="center" pt={20} gap={3}>
              <Text fontSize="lg" fontWeight="semibold" color="red.400">{error}</Text>
              <Text fontSize="sm" color="gray.500">Verifique o link ou peça ao professor para publicar a lista.</Text>
            </Flex>
          )}
          {data && (
            <>
              <Box mb={8}>
                <Heading size="lg" mb={1}>{data.nome}</Heading>
                <Text fontSize="sm" color="gray.500">{data.total} {data.total === 1 ? 'questão' : 'questões'}</Text>
              </Box>
              <VStack spacing={4} align="stretch">
                {data.questoes.map((q, i) => (
                  <QuestaoRow key={q.id} questao={q} index={i} incluirGabarito={data.incluir_gabarito ?? true} />
                ))}
              </VStack>
            </>
          )}
        </Container>
      </Box>
    </MathJaxContext>
  );
}
