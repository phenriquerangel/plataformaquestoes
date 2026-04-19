import React from 'react';
import {
  Card, CardBody, Stack, Select, SimpleGrid, FormControl,
  Input, HStack, Button, Flex, Text,
} from '@chakra-ui/react';
import { Search, Plus } from 'lucide-react';
import { AssuntoSelector } from '../shared/AssuntoSelector';
import { QuestionList } from '../shared/QuestionList';
import { PAGE_LIMIT } from '../../hooks/useQuestionBank';

export function QuestionBank({
  materiasList, materia, onMateriaChange,
  filteredAssuntos, selectedAssuntos, subjectSearch, onSearchChange, onToggleAssunto,
  keywordSearch, setKeywordSearch,
  idSearch, setIdSearch,
  difficultySearch, setDifficultySearch,
  sortOrder, setSortOrder,
  questions, loading, totalQuestions, offset,
  onSearch, onResetFilters, onDeleteQuestion, onToggleInList, onAddAll, customList,
}) {
  return (
    <>
      <Card borderRadius="2xl" mb={8}>
        <CardBody>
          <Stack spacing={4}>
            <Select placeholder="Filtrar por Matéria" value={materia} onChange={onMateriaChange}>
              {materiasList.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
            </Select>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
              <FormControl>
                <AssuntoSelector
                  selectedAssuntos={selectedAssuntos}
                  filteredAssuntos={filteredAssuntos}
                  subjectSearch={subjectSearch}
                  onSearchChange={onSearchChange}
                  onToggle={onToggleAssunto}
                />
              </FormControl>
              <FormControl>
                <Input placeholder="Palavra-chave" value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)} />
              </FormControl>
              <FormControl>
                <Input type="number" placeholder="Buscar por ID" value={idSearch}
                  onChange={(e) => setIdSearch(e.target.value)} />
              </FormControl>
              <FormControl>
                <Select placeholder="Dificuldade" value={difficultySearch}
                  onChange={(e) => setDifficultySearch(e.target.value)}>
                  <option value="Facil">Fácil</option>
                  <option value="Media">Média</option>
                  <option value="Dificil">Difícil</option>
                </Select>
              </FormControl>
              <FormControl>
                <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="desc">Mais Recentes</option>
                  <option value="asc">Mais Antigas</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </Stack>
          <HStack mt={6} spacing={4}>
            <Button variant="ghost" onClick={onResetFilters}>Limpar Filtros</Button>
            <Button flex={1} colorScheme="brand" leftIcon={<Search size={18} />}
              onClick={() => onSearch(0)} isLoading={loading}>
              Buscar no Banco
            </Button>
          </HStack>
        </CardBody>
      </Card>

      {questions.length > 0 && totalQuestions > 0 && (
        <Flex justify="space-between" align="center" mb={4} px={2}>
          <HStack spacing={4}>
            <Text fontSize="xs" color="gray.500" fontWeight="bold">{totalQuestions} ENCONTRADAS</Text>
            <Button size="xs" colorScheme="brand" variant="ghost" onClick={onAddAll} leftIcon={<Plus size={14} />}>
              Adicionar todas à lista
            </Button>
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="xs" mr={2}>Página {Math.floor(offset / PAGE_LIMIT) + 1}</Text>
            <Button size="xs" onClick={() => onSearch(offset - PAGE_LIMIT)} isDisabled={offset === 0}>Anterior</Button>
            <Button size="xs" onClick={() => onSearch(offset + PAGE_LIMIT)} isDisabled={offset + PAGE_LIMIT >= totalQuestions}>Próxima</Button>
          </HStack>
        </Flex>
      )}

      <QuestionList
        questions={questions}
        onDelete={onDeleteQuestion}
        showDelete
        onAddToList={onToggleInList}
        customList={customList}
        highlight={keywordSearch}
        loading={loading}
      />
    </>
  );
}
