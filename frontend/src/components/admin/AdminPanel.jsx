import React, { useState } from 'react';
import { QuestoesAdmin } from './QuestoesAdmin';
import { UsuariosAdmin } from './UsuariosAdmin';
import {
  Box,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Heading,
  HStack,
  VStack,
  Input,
  Button,
  Divider,
  Text,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Select,
  Badge,
  useToast,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { LayoutGrid, BookOpen, Database, Edit3, Trash2, BookMarked } from 'lucide-react';
import { SERIES_OPTIONS } from '../../constants/series';
import { apiClient } from '../../api';

export function AdminPanel({
  currentUsername,
  stats,
  materias,
  onEdit,
  onDelete,
  onAddMateria,
  onAddAssunto,
  newMateria,
  setNewMateria,
  newMateriaSerie,
  setNewMateriaSerie,
  newAssunto,
  setNewAssunto,
  newAssuntoSerie,
  setNewAssuntoSerie,
  materiaParaAssunto,
  setMateriaParaAssunto,
  adminMateriaSearch,
  setAdminMateriaSearch,
  adminAssuntoSearch,
  setAdminAssuntoSearch,
  assuntosAdminList,
  onStatsRefresh,
}) {
  const toast = useToast();
  const [bnccLoading, setBnccLoading] = useState(false);
  const [bnccResult, setBnccResult] = useState(null);

  const handleSeedBncc = async () => {
    if (!window.confirm('Isso vai importar todos os assuntos BNCC (1º EF ao 3º EM) para o banco. Continuar?')) return;
    setBnccLoading(true);
    setBnccResult(null);
    try {
      const result = await apiClient('admin/seed-bncc', 'POST');
      setBnccResult(result);
      toast({ title: 'BNCC importado!', description: result.mensagem, status: 'success', duration: 6000 });
      if (onStatsRefresh) onStatsRefresh();
    } catch (e) {
      toast({ title: 'Erro ao importar BNCC', description: String(e), status: 'error', duration: 6000 });
    } finally {
      setBnccLoading(false);
    }
  };

  return (
    <Box>
      {/* Importar BNCC */}
      <Card borderRadius="2xl" mb={8} borderLeft="4px solid" borderColor="green.500">
        <CardBody>
          <Flex align="center" justify="space-between" flexWrap="wrap" gap={4}>
            <HStack spacing={3}>
              <Box p={2} bg="green.50" color="green.600" borderRadius="lg">
                <BookMarked size={22} />
              </Box>
              <Box>
                <Heading size="sm">Importar Currículo BNCC</Heading>
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  Popula o banco com todas as séries (1º EF ao 3º EM), matérias e assuntos da BNCC.
                </Text>
              </Box>
            </HStack>
            <Button
              colorScheme="green"
              leftIcon={<BookMarked size={16} />}
              onClick={handleSeedBncc}
              isLoading={bnccLoading}
              loadingText="Importando..."
              size="sm"
            >
              Importar BNCC
            </Button>
          </Flex>
          {bnccResult && (
            <Alert status="success" borderRadius="lg" mt={4} fontSize="sm">
              <AlertIcon />
              {bnccResult.mensagem}
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Estatísticas Gerais */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={10}>
        <Card borderRadius="2xl" shadow="sm" borderLeft="4px solid" borderColor="blue.500">
          <CardBody>
            <Flex align="center" justify="space-between">
              <Stat>
                <StatLabel color="gray.500" fontWeight="bold" fontSize="xs">MATÉRIAS</StatLabel>
                <StatNumber fontSize="3xl" color="gray.800">{stats.total_materias}</StatNumber>
              </Stat>
              <Box p={3} bg="blue.50" color="blue.500" borderRadius="xl">
                <LayoutGrid size={24} />
              </Box>
            </Flex>
          </CardBody>
        </Card>
        <Card borderRadius="2xl" shadow="sm" borderLeft="4px solid" borderColor="purple.500">
          <CardBody>
            <Flex align="center" justify="space-between">
              <Stat>
                <StatLabel color="gray.500" fontWeight="bold" fontSize="xs">ASSUNTOS</StatLabel>
                <StatNumber fontSize="3xl" color="gray.800">{stats.total_assuntos}</StatNumber>
              </Stat>
              <Box p={3} bg="purple.50" color="purple.500" borderRadius="xl">
                <BookOpen size={24} />
              </Box>
            </Flex>
          </CardBody>
        </Card>
        <Card borderRadius="2xl" shadow="sm" borderLeft="4px solid" borderColor="brand.500">
          <CardBody>
            <Flex align="center" justify="space-between">
              <Stat>
                <StatLabel color="gray.500" fontWeight="bold" fontSize="xs">QUESTÕES TOTAIS</StatLabel>
                <StatNumber fontSize="3xl" color="gray.800">{stats.total_questoes}</StatNumber>
              </Stat>
              <Box p={3} bg="brand.50" color="brand.500" borderRadius="xl">
                <Database size={24} />
              </Box>
            </Flex>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        {/* Gestão de Matérias */}
        <Card borderRadius="2xl">
          <CardHeader borderBottom="1px" borderColor="gray.100">
            <HStack spacing={3}>
              <LayoutGrid size={18} />
              <Heading size="sm">Gestão de Matérias</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Input
                placeholder="Nome da Matéria"
                value={newMateria}
                onChange={(e) => setNewMateria(e.target.value)}
              />
              <Select
                placeholder="Série / Ano (opcional)"
                value={newMateriaSerie}
                onChange={(e) => setNewMateriaSerie(e.target.value)}
              >
                {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Button w="full" colorScheme="blue" onClick={onAddMateria}>Adicionar</Button>
              
              <Divider />
              <VStack w="full" align="stretch" spacing={3}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">Listagem de Matérias</Text>
                  <Input 
                    size="xs" 
                    placeholder="Filtrar matérias..." 
                    w="150px" 
                    borderRadius="md" 
                    value={adminMateriaSearch} 
                    onChange={(e) => setAdminMateriaSearch(e.target.value)} 
                  />
                </Flex>
                <TableContainer maxH="300px" overflowY="auto" border="1px" borderColor="gray.100" borderRadius="md">
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Nome</Th>
                        <Th>Série</Th>
                        <Th width="80px" textAlign="right">Ações</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {materias.length === 0 ? (
                        <Tr><Td colSpan={3} textAlign="center" py={4} color="gray.400">Nenhuma matéria</Td></Tr>
                      ) : (
                        materias
                          .filter(m => m.nome.toLowerCase().includes(adminMateriaSearch.toLowerCase()))
                          .map(m => (
                            <Tr key={m.id} _hover={{ bg: "gray.50" }}>
                              <Td fontWeight="medium">{m.nome}</Td>
                              <Td>
                                {m.serie
                                  ? <Badge colorScheme="purple" borderRadius="md">{m.serie}</Badge>
                                  : <Text color="gray.300" fontSize="xs">—</Text>}
                              </Td>
                              <Td textAlign="right">
                                <HStack justify="flex-end" spacing={1}>
                                  <IconButton
                                    size="xs" icon={<Edit3 size={14} />} colorScheme="blue" variant="ghost"
                                    onClick={() => onEdit(m, 'materia')}
                                  />
                                  <IconButton
                                    size="xs" icon={<Trash2 size={14} />} colorScheme="red" variant="ghost"
                                    onClick={() => onDelete(m.id, 'materia', m.nome)}
                                  />
                                </HStack>
                              </Td>
                            </Tr>
                          ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Gestão de Assuntos */}
        <Card borderRadius="2xl">
          <CardHeader borderBottom="1px" borderColor="gray.100">
            <HStack spacing={3}>
              <BookOpen size={18} />
              <Heading size="sm">Gestão de Assuntos</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Select 
                placeholder="Matéria vinculada" 
                value={materiaParaAssunto} 
                onChange={(e) => setMateriaParaAssunto(e.target.value)}
              >
                {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </Select>
              <Input
                placeholder="Nome do Assunto"
                value={newAssunto}
                onChange={(e) => setNewAssunto(e.target.value)}
              />
              <Select
                placeholder="Série / Ano (opcional)"
                value={newAssuntoSerie}
                onChange={(e) => setNewAssuntoSerie(e.target.value)}
              >
                {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Button w="full" colorScheme="blue" onClick={onAddAssunto}>Vincular Assunto</Button>

              {materiaParaAssunto && (
                <>
                  <Divider />
                  <VStack w="full" align="stretch" spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">Assuntos Disponíveis</Text>
                      <Input 
                        size="xs" 
                        placeholder="Filtrar assuntos..." 
                        w="150px" 
                        borderRadius="md" 
                        value={adminAssuntoSearch} 
                        onChange={(e) => setAdminAssuntoSearch(e.target.value)} 
                      />
                    </Flex>
                    <TableContainer maxH="250px" overflowY="auto" border="1px" borderColor="gray.100" borderRadius="md">
                      <Table size="sm" variant="simple">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Assunto</Th>
                            <Th>Série</Th>
                            <Th width="80px" textAlign="right">Ações</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {assuntosAdminList.length === 0 ? (
                            <Tr><Td colSpan={3} textAlign="center" py={4} color="gray.400">Sem assuntos vinculados</Td></Tr>
                          ) : (
                            assuntosAdminList
                              .filter(a => a.nome.toLowerCase().includes(adminAssuntoSearch.toLowerCase()))
                              .sort((a, b) => a.nome.localeCompare(b.nome))
                              .map(a => (
                                <Tr key={a.id} _hover={{ bg: "gray.50" }}>
                                  <Td fontWeight="medium">{a.nome}</Td>
                                  <Td>
                                    {a.serie
                                      ? <Badge colorScheme="teal" borderRadius="md">{a.serie}</Badge>
                                      : <Text color="gray.300" fontSize="xs">—</Text>}
                                  </Td>
                                  <Td textAlign="right">
                                    <HStack justify="flex-end" spacing={1}>
                                      <IconButton size="xs" icon={<Edit3 size={14} />} colorScheme="blue" variant="ghost" onClick={() => onEdit(a, 'assunto')} />
                                      <IconButton size="xs" icon={<Trash2 size={14} />} colorScheme="red" variant="ghost" onClick={() => onDelete(a.id, 'assunto', a.nome)} />
                                    </HStack>
                                  </Td>
                                </Tr>
                              ))
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </VStack>
                </>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <QuestoesAdmin materias={materias} onStatsRefresh={onStatsRefresh} />
      <UsuariosAdmin currentUsername={currentUsername} />
    </Box>
  );
}