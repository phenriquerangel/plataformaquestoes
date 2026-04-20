import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Box, VStack, HStack, Text, Badge, Button, Flex, Divider,
} from '@chakra-ui/react';
import { CheckCircle } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { DiagramRenderer } from './DiagramRenderer';

const DIFF_COLOR = { Facil: 'green', Media: 'orange', Dificil: 'red' };

export function QuestionDetailModal({ isOpen, onClose, question }) {
  if (!question) return null;

  const correctLetter = question.resposta_correta?.trim().toUpperCase().charAt(0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(2px)" />
      <ModalContent borderRadius="2xl" mx={4}>
        <ModalHeader pb={2}>
          <HStack spacing={2} flexWrap="wrap">
            <Badge variant="outline" colorScheme="gray" fontSize="0.75em">ID {question.id}</Badge>
            {question.dificuldade && (
              <Badge colorScheme={DIFF_COLOR[question.dificuldade] || 'gray'}>
                {question.dificuldade}
              </Badge>
            )}
            {question.assunto_nome && (
              <Badge variant="subtle" colorScheme="purple">{question.assunto_nome}</Badge>
            )}
            {question.materia_nome && (
              <Badge variant="subtle" colorScheme="blue">{question.materia_nome}</Badge>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={5} align="stretch">
            {/* Enunciado */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase" mb={2}>
                Enunciado
              </Text>
              <Text fontSize="md" as="div" lineHeight="tall">
                <MathRenderer parts={question.enunciado} />
              </Text>
            </Box>

            {/* Diagrama */}
            {question.diagrama && (
              <Flex justify="center" p={4} bg="gray.50" borderRadius="lg" border="1px" borderColor="gray.200">
                <DiagramRenderer diagrama={question.diagrama} />
              </Flex>
            )}
            {question.diagrama_svg && !question.diagrama && (
              <Flex justify="center" p={4} bg="gray.50" borderRadius="lg" border="1px" borderColor="gray.200">
                <Box dangerouslySetInnerHTML={{ __html: question.diagrama_svg }} />
              </Flex>
            )}

            <Divider />

            {/* Alternativas */}
            {question.alternativas?.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase" mb={3}>
                  Alternativas
                </Text>
                <VStack align="stretch" spacing={2}>
                  {question.alternativas.map((alt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isCorrect = letter === correctLetter;
                    return (
                      <HStack
                        key={i}
                        p={3}
                        borderRadius="lg"
                        border="1px"
                        borderColor={isCorrect ? 'green.300' : 'gray.200'}
                        bg={isCorrect ? 'green.50' : 'white'}
                        align="flex-start"
                        spacing={3}
                      >
                        <Badge
                          mt="2px"
                          minW="24px"
                          textAlign="center"
                          colorScheme={isCorrect ? 'green' : 'gray'}
                          flexShrink={0}
                        >
                          {letter}
                        </Badge>
                        <Text fontSize="sm" as="div" flex="1">
                          <MathRenderer parts={alt} />
                        </Text>
                        {isCorrect && <CheckCircle size={16} color="var(--chakra-colors-green-500)" style={{ marginTop: '2px', flexShrink: 0 }} />}
                      </HStack>
                    );
                  })}
                </VStack>
              </Box>
            )}

            <Divider />

            {/* Explicação */}
            <Box bg="blue.50" p={4} borderRadius="lg" border="1px" borderColor="blue.200">
              <Text fontSize="xs" fontWeight="bold" color="blue.500" textTransform="uppercase" mb={2}>
                Explicação
              </Text>
              <Text fontSize="sm" as="div" lineHeight="tall">
                <MathRenderer parts={question.explicacao} />
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} variant="ghost">Fechar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
