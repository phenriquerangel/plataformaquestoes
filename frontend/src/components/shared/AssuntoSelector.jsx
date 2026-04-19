import React from 'react';
import { Box, Input, Tag, TagLabel, TagCloseButton, Wrap, Text, VStack } from '@chakra-ui/react';

export function AssuntoSelector({ selectedAssuntos, filteredAssuntos, subjectSearch, onSearchChange, onToggle, disabled }) {
  return (
    <VStack align="stretch" spacing={2} position="relative">
      <Input
        placeholder="Digite para buscar..."
        value={subjectSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={disabled}
      />
      {subjectSearch && filteredAssuntos.length > 0 && (
        <Box bg="white" border="1px" borderColor="gray.200" borderRadius="md" shadow="lg"
          position="absolute" top="40px" zIndex={20} w="full" maxH="200px" overflowY="auto">
          {filteredAssuntos.map(a => (
            <Box key={a.id} p={2} _hover={{ bg: 'gray.100', cursor: 'pointer' }} onClick={() => onToggle(a)}>
              <Text fontSize="sm">{a.nome}</Text>
            </Box>
          ))}
        </Box>
      )}
      {selectedAssuntos.length > 0 && (
        <Wrap spacing={2}>
          {selectedAssuntos.map(a => (
            <Tag key={a.id} size="md" borderRadius="full" variant="solid" colorScheme="brand">
              <TagLabel>{a.nome}</TagLabel>
              <TagCloseButton onClick={() => onToggle(a)} />
            </Tag>
          ))}
        </Wrap>
      )}
    </VStack>
  );
}
