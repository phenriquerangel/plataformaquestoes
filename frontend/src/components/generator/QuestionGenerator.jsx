import React from 'react';
import {
  Card, CardBody, CardHeader, Heading, SimpleGrid,
  FormControl, FormLabel, Select, Input, Button, HStack,
} from '@chakra-ui/react';
import { Sparkles, Download } from 'lucide-react';
import { SERIES_OPTIONS } from '../../constants/series';
import { AssuntoSelector } from '../shared/AssuntoSelector';
import { QuestionList } from '../shared/QuestionList';

export function QuestionGenerator({
  materiasList, selectedSerie, onSerieChange, materia, onMateriaChange,
  selectedAssuntos, filteredAssuntos, subjectSearch, onSearchChange, onToggleAssunto,
  difficulty, setDifficulty,
  quantity, setQuantity,
  tipo, setTipo,
  questions, loading,
  onGenerate, onExport,
  onDeleteQuestion, onAddToList, customList,
  listas, onAddToLista, onCreateAndAdd,
}) {
  return (
    <>
      <Card borderRadius="2xl" shadow="xl" border="1px" borderColor="gray.100" mb={10} overflow="hidden">
        <CardHeader>
          <Heading size="md">Parametrizar Exercícios</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={6}>
            <FormControl>
              <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Série</FormLabel>
              <Select value={selectedSerie} onChange={onSerieChange} borderRadius="lg">
                <option value="">Todas as Séries</option>
                {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Matéria</FormLabel>
              <Select value={materia} onChange={onMateriaChange} borderRadius="lg">
                <option value="">Selecionar...</option>
                {materiasList.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
              </Select>
            </FormControl>
            <FormControl gridColumn={{ sm: 'span 2', lg: 'span 2' }}>
              <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Assunto</FormLabel>
              <AssuntoSelector
                selectedAssuntos={selectedAssuntos}
                filteredAssuntos={filteredAssuntos}
                subjectSearch={subjectSearch}
                onSearchChange={onSearchChange}
                onToggle={onToggleAssunto}
                disabled={!materia || materia === 'Geral'}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Tipo</FormLabel>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)} borderRadius="lg">
                <option value="multipla_escolha">Múltipla Escolha</option>
                <option value="verdadeiro_falso">Verdadeiro / Falso</option>
                <option value="dissertativa">Dissertativa</option>
                <option value="misto">Misto</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Nível</FormLabel>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} borderRadius="lg">
                <option value="Facil">Fácil</option>
                <option value="Media">Média</option>
                <option value="Dificil">Difícil</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Qtd</FormLabel>
              <Input type="number" min="1" max="10" value={quantity}
                onChange={(e) => setQuantity(e.target.value)} borderRadius="lg" />
            </FormControl>
          </SimpleGrid>
          <HStack mt={8} spacing={4}>
            <Button colorScheme="brand" size="lg" flex={1} leftIcon={<Sparkles size={20} />}
              onClick={onGenerate} isLoading={loading} shadow="lg"
              _hover={{ transform: 'translateY(-2px)' }} transition="all 0.2s">
              Gerar com IA
            </Button>
            {questions.length > 0 && (
              <Button leftIcon={<Download size={20} />} onClick={onExport} variant="outline" size="lg">
                Exportar PDF
              </Button>
            )}
          </HStack>
        </CardBody>
      </Card>
      <QuestionList
        questions={questions}
        onDelete={onDeleteQuestion}
        onAddToList={onAddToList}
        customList={customList}
        loading={loading}
        listas={listas}
        onAddToLista={onAddToLista}
        onCreateAndAdd={onCreateAndAdd}
      />
    </>
  );
}
