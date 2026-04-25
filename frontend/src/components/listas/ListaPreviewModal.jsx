import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, VStack, Box, Text, HStack, Badge, Flex, Collapse, useDisclosure,
  useColorModeValue, Divider,
} from '@chakra-ui/react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import MathRenderer from '../shared/MathRenderer';
import { DiagramRenderer } from '../shared/DiagramRenderer';

const DIFFICULTY_COLOR = { Facil: 'green', Media: 'orange', Dificil: 'red' };

function PreviewQuestaoRow({ questao, index, incluirGabarito }) {
  const { isOpen, onToggle } = useDisclosure();
  const altColor = useColorModeValue('gray.600', 'gray.400');
  const collapseBg = useColorModeValue('gray.50', 'gray.700');
  const collapseBorder = useColorModeValue('gray.200', 'gray.600');
  const diagramBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <Box>
      <HStack mb={1} spacing={2} flexWrap="wrap">
        <Badge variant="outline" colorScheme="gray" fontSize="0.65em">Q{index + 1}</Badge>
        <Badge colorScheme={DIFFICULTY_COLOR[questao.dificuldade] || 'gray'} fontSize="0.65em">{questao.dificuldade}</Badge>
        {questao.tags && questao.tags.map(t => (
          <Badge key={t} variant="subtle" colorScheme="purple" fontSize="0.65em">{t}</Badge>
        ))}
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
        </>
      )}
    </Box>
  );
}

export function ListaPreviewModal({ isOpen, onClose, lista, questoes, incluirGabarito, onExportPDF }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Text>{lista.nome}</Text>
          <Text fontSize="sm" fontWeight="normal" color="gray.500">{questoes.length} {questoes.length === 1 ? 'questão' : 'questões'} · {incluirGabarito ? 'Com gabarito' : 'Sem gabarito'}</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch" divider={<Divider />}>
            {questoes.map((q, i) => (
              <PreviewQuestaoRow key={q.id} questao={q} index={i} incluirGabarito={incluirGabarito} />
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button colorScheme="brand" leftIcon={<Download size={16} />} onClick={() => { onExportPDF(); onClose(); }}>
            Gerar PDF
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
