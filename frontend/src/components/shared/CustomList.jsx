import React from 'react';
import {
  Card, CardBody, Stack, Flex, HStack, Badge, Input,
  Button, Divider, Wrap, Tag, TagLabel, TagCloseButton, IconButton,
} from '@chakra-ui/react';
import { Download, ChevronUp, ChevronDown, Save } from 'lucide-react';

const partsToString = (parts) => {
  if (!parts) return '';
  if (typeof parts === 'string') return parts;
  if (Array.isArray(parts)) return parts.map(p => p.content).join('');
  return '';
};

export function CustomList({ customList, customListTitle, setCustomListTitle, onToggle, onMove, onClear, onExport, onSaveToListas }) {
  if (customList.length === 0) return null;

  const handleSave = () => {
    if (onSaveToListas) onSaveToListas(customListTitle || 'Minha Lista', customList);
  };

  return (
    <Card borderRadius="2xl" border="2px" borderColor="brand.500" mb={8} bg="brand.50" shadow="md">
      <CardBody>
        <Stack spacing={4}>
          <Flex justify="space-between" align="center" direction={{ base: 'column', md: 'row' }} gap={4}>
            <HStack spacing={4} w="full">
              <Badge colorScheme="brand" p={2} borderRadius="lg" fontSize="sm">
                {customList.length} questões no carrinho
              </Badge>
              <Input variant="filled" bg="white" placeholder="Título da sua lista..."
                value={customListTitle} onChange={(e) => setCustomListTitle(e.target.value)} />
            </HStack>
            <HStack spacing={3} w={{ base: 'full', md: 'auto' }} justify="flex-end">
              <Button variant="ghost" colorScheme="red" size="sm" onClick={onClear}>Limpar</Button>
              {onSaveToListas && (
                <Button variant="outline" colorScheme="brand" leftIcon={<Save size={16} />} size="sm" onClick={handleSave}>
                  Salvar lista
                </Button>
              )}
              <Button colorScheme="brand" leftIcon={<Download size={18} />} onClick={onExport} shadow="md">
                Gerar PDF da Lista
              </Button>
            </HStack>
          </Flex>
          <Divider />
          <Wrap spacing={2}>
            {customList.map((q, idx) => (
              <Tag key={q.id} size="sm" colorScheme="brand" variant="subtle">
                <TagLabel>{idx + 1}. {partsToString(q.enunciado).substring(0, 20)}...</TagLabel>
                <HStack spacing={0} ml={2}>
                  <IconButton size="xs" variant="ghost" icon={<ChevronUp size={12} />}
                    onClick={() => onMove(idx, 'up')} isDisabled={idx === 0} />
                  <IconButton size="xs" variant="ghost" icon={<ChevronDown size={12} />}
                    onClick={() => onMove(idx, 'down')} isDisabled={idx === customList.length - 1} />
                </HStack>
                <TagCloseButton onClick={() => onToggle(q)} />
              </Tag>
            ))}
          </Wrap>
        </Stack>
      </CardBody>
    </Card>
  );
}
