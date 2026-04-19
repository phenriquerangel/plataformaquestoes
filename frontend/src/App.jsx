import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { MathJaxContext } from 'better-react-mathjax';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  HStack,
  VStack,
  Select,
  Input,
  Button,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  CardHeader,
  Divider,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  useToast,
  useDisclosure,
  Flex,
  Badge,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Skeleton,
  SkeletonText,
  Textarea,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap, WrapItem,
} from '@chakra-ui/react';
import { AdminPanel } from './components/admin/AdminPanel';
import { QuestionList } from './components/shared/QuestionList';
import { apiClient } from './api.js';
import { Sparkles, Database, Settings, Download, Trash2, Search, BookOpen, BrainCircuit, FileText, X, Plus, Edit3, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react';

// Configuração do MathJax
const mathJaxConfig = {
  loader: { load: ["input/tex", "output/svg"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
  },
};

function App() {
  const [subject, setSubject] = useState('');
  const [materia, setMateria] = useState('Geral');
  const [difficulty, setDifficulty] = useState('Media');
  const [quantity, setQuantity] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssuntos, setSelectedAssuntos] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [difficultySearch, setDifficultySearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [offset, setOffset] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const PAGE_LIMIT = 10;
  
  // Estado para a lista personalizada (Bucket)
  const [customList, setCustomList] = useState([]);
  const [customListTitle, setCustomListTitle] = useState('Minha Lista de Exercícios');

  // Estados para Diálogos de Confirmação
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'materia' | 'assunto' | 'questao'
  const [deleteName, setDeleteName] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  const toast = useToast();
  
  const [materiasList, setMateriasList] = useState([]);
  const [assuntosList, setAssuntosList] = useState([]);
  const [assuntosAdminList, setAssuntosAdminList] = useState([]);
  const [newMateria, setNewMateria] = useState('');
  const [newAssunto, setNewAssunto] = useState('');
  const [materiaParaAssunto, setMateriaParaAssunto] = useState('');
  
  // Estados de busca interna no Admin
  const [adminMateriaSearch, setAdminMateriaSearch] = useState('');
  const [adminAssuntoSearch, setAdminAssuntoSearch] = useState('');

  // Estados para Edição e Estatísticas
  const [adminStats, setAdminStats] = useState({ total_materias: 0, total_assuntos: 0, total_questoes: 0 });
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  // Função para reordenar a lista personalizada
  const moveQuestion = (index, direction) => {
    const newList = [...customList];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newList.length) {
      const temp = newList[index];
      newList[index] = newList[newIndex];
      newList[newIndex] = temp;
      setCustomList(newList);
    }
  };

  // Helper para converter a estrutura de 'parts' de volta para string
  const partsToString = (parts) => {
    if (!parts) return '';
    if (typeof parts === 'string') return parts; // Compatibilidade com dados antigos
    if (Array.isArray(parts)) {
      return parts.map(p => p.content).join('');
    }
    return '';
  };

  // Define a URL base da API via variável de ambiente ou fallback para local
  const API_URL = '/api';

  // Carrega o carrinho do localStorage ao iniciar
  useEffect(() => {
    const savedList = localStorage.getItem('eduquest_custom_list');
    const savedTitle = localStorage.getItem('eduquest_custom_list_title');
    if (savedList) setCustomList(JSON.parse(savedList));
    if (savedTitle) setCustomListTitle(savedTitle);
  }, []);

  // Salva o carrinho no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('eduquest_custom_list', JSON.stringify(customList));
    localStorage.setItem('eduquest_custom_list_title', customListTitle);
  }, [customList, customListTitle]);

  useEffect(() => {
    fetchMaterias();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const data = await apiClient(`admin/stats?t=${new Date().getTime()}`);
      setAdminStats(data);
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    }
  };

  useEffect(() => {
    if (materiaParaAssunto) {
      fetchAssuntosAdmin(materiaParaAssunto);
    } else {
      setAssuntosAdminList([]);
    }
  }, [materiaParaAssunto]);

  // Função para buscar assuntos de uma matéria específica
  const fetchAssuntosForMateria = useCallback(async (materiaName) => {
    const matObj = materiasList.find(m => m.nome === materiaName);
    if (matObj) {
      const data = await apiClient(`assuntos/${matObj.id}?t=${new Date().getTime()}`);
      setAssuntosList(data);
    } else {
      setAssuntosList([]);
    }
  }, [materiasList]);

  const fetchMaterias = async () => {
    try {
      const data = await apiClient(`materias?t=${new Date().getTime()}`);
      setMateriasList(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Erro ao carregar matérias:", err); /* alert("Erro ao carregar matérias. Verifique o backend e o DB."); */ }
  };

  const fetchAssuntosAdmin = async (materiaId) => {
    try {
      const data = await apiClient(`assuntos/${materiaId}?t=${new Date().getTime()}`);
      setAssuntosAdminList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar assuntos admin:", err);
    }
  };

  // useEffect para recarregar assuntos sempre que a matéria ou a lista de matérias mudar
  useEffect(() => {
    if (materia && materiasList.length > 0) {
      fetchAssuntosForMateria(materia);
    } else {
      setAssuntosList([]);
    }
  }, [materia, materiasList, fetchAssuntosForMateria]);

  const handleMateriaChange = useCallback(async (e) => {
    const matNome = e.target.value;
    setMateria(matNome);
    setSelectedAssuntos([]);
    setSubjectSearch('');
  }, []); // Não precisa de materiasList aqui, pois o useEffect acima já reage a isso

  const fetchSavedQuestions = async (newOffset = 0) => {
    // Garante que newOffset seja um número, ignorando o objeto de evento do React
    const actualOffset = typeof newOffset === 'number' ? newOffset : 0;

    if (selectedAssuntos.length === 0 && !keywordSearch) {
      toast({ title: "Use um filtro para buscar", description: "Selecione um assunto, digite uma palavra-chave ou um ID.", status: "warning", duration: 4000 });
      return;
    }
    setLoading(true);
    setOffset(actualOffset);
    try {
      const params = new URLSearchParams();
      if (idSearch) {
        params.append('questao_id', idSearch);
      } else {
        selectedAssuntos.forEach(a => {
          if (a.id) params.append('assunto_ids', a.id);
        });
        if (keywordSearch) params.append('keyword', keywordSearch);
      }

      if (difficultySearch) params.append('dificuldade', difficultySearch);
      params.append('limit', PAGE_LIMIT);
      params.append('offset', actualOffset);
      params.append('ordem', sortOrder);

      const data = await apiClient(`questoes-salvas?${params.toString()}`);
      setQuestions(data.questoes || []);
      setTotalQuestions(data.total || 0);
      toast({ title: "Questões carregadas!", status: "success" });
    } catch (err) {
      toast({ title: "Erro ao buscar questões", description: err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  const addAllToCustomList = () => {
    const newItems = questions.filter(q => !customList.some(item => item.id === q.id));
    if (newItems.length > 0) {
      setCustomList([...customList, ...newItems]);
      toast({ title: `${newItems.length} questões adicionadas`, status: "success" });
    }
  };

  const toggleQuestionInList = (q) => {
    if (customList.find(item => item.id === q.id)) {
      setCustomList(customList.filter(item => item.id !== q.id));
      toast({ title: "Removida da lista", status: "info", duration: 2000 });
    } else {
      setCustomList([...customList, q]);
      toast({ title: "Adicionada à lista", status: "success", duration: 2000 });
    }
  };

  const handleDeleteQuestion = useCallback(async (id, index) => {
    try {
      await apiClient(`questoes/${id}`, 'DELETE');
      const updated = questions.filter((_, i) => i !== index);
      setQuestions(updated);
      toast({ title: "Questão removida", status: "info" });
    } catch (err) {
      toast({ title: "Erro ao excluir", status: "error" });
    }
  }, [questions]); // Dependência para questions

  const confirmDeleteMateria = async (id) => {
    try {
      await apiClient(`materias/${id}`, 'DELETE');
      fetchMaterias();
      if (materiaParaAssunto === id.toString()) setMateriaParaAssunto('');
      toast({ title: "Matéria removida", status: "success" });
    } catch (err) {
      toast({ title: "Erro ao excluir matéria", status: "error" });
    }
  };

  const confirmDeleteAssunto = async (id) => {
    try {
      await apiClient(`assuntos/${id}`, 'DELETE');
      if (materiaParaAssunto) fetchAssuntosAdmin(materiaParaAssunto);
      toast({ title: "Assunto removido", status: "success" });
    } catch (err) {
      toast({ title: "Erro ao excluir assunto", status: "error" });
    }
  };

  const executeDelete = () => {
    if (deleteType === 'materia') confirmDeleteMateria(deleteId);
    if (deleteType === 'assunto') confirmDeleteAssunto(deleteId);
    onClose();
  };

  const openDeleteDialog = (id, type, name) => {
    setDeleteId(id);
    setDeleteType(type);
    setDeleteName(name);
    onOpen();
  };

  const handleEditClick = (item, type) => {
    setEditingItem({ ...item, type });
    setEditValue(item.nome);
    onEditOpen();
  };

  const saveEdit = async () => {
    if (!editValue) return;
    const url = editingItem.type === 'materia' 
      ? `${API_URL}/materias/${editingItem.id}` 
      : `${API_URL}/assuntos/${editingItem.id}`;
    
    try {
      const body = editingItem.type === 'materia' 
        ? { nome: editValue }
        : { nome: editValue, materia_id: parseInt(materiaParaAssunto) };

      await apiClient(url.replace('/api/', ''), 'PUT', body);
      
      toast({ title: "Atualizado com sucesso!", status: "success" });
      fetchMaterias();
      if (materiaParaAssunto) fetchAssuntosAdmin(materiaParaAssunto);
      fetchAdminStats();
      onEditClose();
    } catch (err) {
      toast({ title: "Erro ao atualizar", status: "error" });
    }
  };

  const handleAddMateria = async () => {
    if (!newMateria || newMateria.trim() === '') {
      toast({ title: "O nome da matéria não pode estar vazio.", status: "warning", duration: 3000 });
      return;
    }
    try {
      await apiClient('materias', 'POST', { nome: newMateria });
      setNewMateria('');
      fetchMaterias();
      fetchAdminStats();
      toast({ title: "Matéria adicionada!", status: "success" });
    } catch (err) {
      toast({ title: "Erro", description: err.message, status: "error" });
    }
  };

  const handleAddAssunto = async () => {
    if (!newAssunto || newAssunto.trim() === '' || !materiaParaAssunto) {
      toast({ title: "Selecione uma matéria e digite o nome do assunto.", status: "warning", duration: 3000 });
      return;
    }
    try {
      await apiClient('assuntos', 'POST', { nome: newAssunto, materia_id: parseInt(materiaParaAssunto) });
      setNewAssunto('');
      toast({ title: "Assunto cadastrado!", status: "success" });
      fetchAssuntosAdmin(materiaParaAssunto);
      fetchAdminStats();
    } catch (err) {
      toast({ title: "Erro", description: err.message, status: "error" });
    }
  };

  const generateQuestions = async () => {
    if (selectedAssuntos.length === 0) {
      toast({ title: "Assunto obrigatório", status: "warning" });
      return;
    }
    
    setLoading(true);
    setQuestions([]); // Limpa questões anteriores para receber o stream

    const subjectNames = selectedAssuntos.map(a => a.nome).join(', ');
    const body = {
      materia: materia,
      assunto: subjectNames,
      assunto_id: selectedAssuntos[0].id, // Usa o primeiro como referência principal
      dificuldade: difficulty,
      quantidade: parseInt(quantity)
    };

    fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            setLoading(false);
            toast({ title: "Geração concluída!", status: "success", duration: 3000 });
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Guarda a última linha, que pode estar incompleta

          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const newQuestion = JSON.parse(line);
              setQuestions(prev => [...prev, newQuestion]);
            } catch (e) {
              console.error("Erro ao parsear linha do stream:", line, e);
            }
          }
          read(); // Continua lendo o stream
        });
      };
      read(); // Inicia a leitura do stream
    }).catch(error => {
      setLoading(false);
      toast({ title: "Erro na Geração", description: error.message, status: "error", duration: 5000 });
    });
  };

  const exportToPDF = async (data = questions, title = "AVALIAÇÃO DE DESEMPENHO") => {
    const toastId = toast({ title: "Gerando PDF...", status: "info", duration: null });
    try {
      const response = await fetch(`${API_URL}/export-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, title }),
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Falha ao gerar PDF no servidor.');
      }

      // Inicia o download do arquivo recebido
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const filename = title.replace(/\s+/g, '_').toLowerCase() + '.pdf';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.update(toastId, { title: "PDF gerado com sucesso!", status: "success", duration: 3000 });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.update(toastId, { title: "Erro ao gerar PDF", description: "Verifique o console para mais detalhes.", status: "error", duration: 5000 });
    }
  };

  const toggleAssunto = (assunto) => {
    if (selectedAssuntos.find(a => a.id === assunto.id)) {
      setSelectedAssuntos(selectedAssuntos.filter(a => a.id !== assunto.id));
    } else {
      setSelectedAssuntos([...selectedAssuntos, assunto]);
    }
    setSubjectSearch('');
  };

  const filteredAssuntos = assuntosList.filter(a => 
    a.nome.toLowerCase().includes(subjectSearch.toLowerCase()) &&
    !selectedAssuntos.find(sa => sa.id === a.id)
  );

  return (
    <MathJaxContext config={mathJaxConfig}>
      {/* Header */}
      <Box bg="white" px={8} py={4} borderBottom="1px" borderColor="gray.200" position="sticky" top={0} zIndex={10} shadow="sm">
        <Container maxW="container.xl">
          <Flex align="center" justify="space-between">
            <HStack spacing={3}>
              <Box bg="brand.600" p={2} borderRadius="xl" color="white" shadow="md">
                <BrainCircuit size={24} />
              </Box>
              <Heading size="md" fontWeight="800" letterSpacing="tight">EduQuest<Text as="span" color="brand.600">.ai</Text></Heading>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.lg" py={12}>
        <Tabs variant="unstyled" isLazy onChange={(index) => {
          setQuestions([]);
          fetchMaterias();
          setSelectedAssuntos([]);
          if (index === 2) fetchAdminStats();
        }}>
          <TabList bg="gray.200" p={1} borderRadius="2xl" mb={10} display="flex">
            <CustomTab icon={<Sparkles size={18}/>} label="Gerador" />
            <CustomTab icon={<Database size={18}/>} label="Banco" />
            <CustomTab icon={<Settings size={18}/>} label="Admin" />
          </TabList>

          {/* Área do Construtor de Listas (Carrinho) - Visível em todas as abas quando não vazio */}
          {customList.length > 0 && (
            <Card borderRadius="2xl" border="2px" borderColor="brand.500" mb={8} bg="brand.50" shadow="md">
              <CardBody>
                <Stack spacing={4}>
                  <Flex justify="space-between" align="center" direction={{ base: "column", md: "row" }} gap={4}>
                    <HStack spacing={4} w="full">
                      <Badge colorScheme="brand" p={2} borderRadius="lg" fontSize="sm">
                        {customList.length} questões no carrinho
                      </Badge>
                      <Input 
                        variant="filled" 
                        bg="white" 
                        placeholder="Título da sua lista..." 
                        value={customListTitle} 
                        onChange={(e) => setCustomListTitle(e.target.value)}
                      />
                    </HStack>
                    <HStack spacing={3} w={{ base: "full", md: "auto" }} justify="flex-end">
                      <Button variant="ghost" colorScheme="red" size="sm" onClick={() => setCustomList([])}>Limpar</Button>
                      <Button colorScheme="brand" leftIcon={<Download size={18}/>} onClick={() => exportToPDF(customList, customListTitle)} shadow="md">Gerar PDF da Lista</Button>
                    </HStack>
                  </Flex>
                  <Divider />
                  <Wrap spacing={2}>
                    {customList.map((q, idx) => (
                      <Tag key={q.id} size="sm" colorScheme="brand" variant="subtle">
                        <TagLabel>{idx + 1}. {partsToString(q.enunciado).substring(0, 20)}...</TagLabel>
                        <HStack spacing={0} ml={2}>
                          <IconButton size="xs" variant="ghost" icon={<ChevronUp size={12}/>} onClick={() => moveQuestion(idx, 'up')} isDisabled={idx === 0} />
                          <IconButton size="xs" variant="ghost" icon={<ChevronDown size={12}/>} onClick={() => moveQuestion(idx, 'down')} isDisabled={idx === customList.length - 1} />
                        </HStack>
                        <TagCloseButton onClick={() => toggleQuestionInList(q)} />
                      </Tag>
                    ))}
                  </Wrap>
                </Stack>
              </CardBody>
            </Card>
          )}

          <TabPanels>
            {/* GERADOR */}
            <TabPanel p={0}>
              <Card borderRadius="2xl" shadow="xl" border="1px" borderColor="gray.100" mb={10} overflow="hidden">
                <CardHeader>
                  <Heading size="md">Parametrizar Exercícios</Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                    <FormControl>
                      <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Matéria</FormLabel>
                      <Select value={materia} onChange={handleMateriaChange} borderRadius="lg">
                        <option value="">Selecionar...</option>
                        {materiasList.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                      </Select>
                    </FormControl>
                    <FormControl gridColumn={{ lg: "span 2" }}>
                      <FormLabel fontSize="xs" textTransform="uppercase" fontWeight="bold">Assunto</FormLabel>
                      <VStack align="stretch" spacing={2}>
                        <Input 
                          placeholder="Digite para buscar..." 
                          value={subjectSearch} 
                          onChange={(e) => setSubjectSearch(e.target.value)}
                          disabled={!materia || materia === 'Geral'}
                        />
                        {subjectSearch && (
                          <Box bg="white" border="1px" borderColor="gray.200" borderRadius="md" shadow="lg" position="absolute" zIndex={20} w="full" mt="45px" maxH="200px" overflowY="auto">
                            {filteredAssuntos.map(a => (
                              <Box key={a.id} p={2} _hover={{ bg: "gray.100", cursor: "pointer" }} onClick={() => toggleAssunto(a)}>
                                <Text fontSize="sm">{a.nome}</Text>
                              </Box>
                            ))}
                          </Box>
                        )}
                        <Wrap spacing={2}>
                          {selectedAssuntos.map(a => (
                            <WrapItem key={a.id}>
                              <Tag size="md" borderRadius="full" variant="solid" colorScheme="brand">
                                <TagLabel>{a.nome}</TagLabel>
                                <TagCloseButton onClick={() => toggleAssunto(a)} />
                              </Tag>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </VStack>
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
                      <Input type="number" min="1" max="10" value={quantity} onChange={(e) => setQuantity(e.target.value)} borderRadius="lg" />
                    </FormControl>
                  </SimpleGrid>
                  <HStack mt={8} spacing={4}>
                    <Button colorScheme="brand" size="lg" flex={1} leftIcon={<Sparkles size={20}/>} onClick={generateQuestions} isLoading={loading} shadow="lg" _hover={{transform: 'translateY(-2px)'}} transition="all 0.2s">
                      Gerar com IA
                    </Button>
                    {questions.length > 0 && (
                      <Button leftIcon={<Download size={20}/>} onClick={exportToPDF} variant="outline" size="lg">Exportar PDF</Button>
                    )}
                  </HStack>
                </CardBody>
              </Card>
              
              <QuestionList 
                questions={questions} 
                onDelete={handleDeleteQuestion} 
                onAddToList={toggleQuestionInList}
                customList={customList}
                loading={loading}
              />
            </TabPanel>

            {/* BANCO */}
            <TabPanel p={0}>
              <Card borderRadius="2xl" mb={8}>
                <CardBody>
                  <Stack spacing={4}>
                    <Select placeholder="Filtrar por Matéria" value={materia} onChange={handleMateriaChange}>
                      {materiasList.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                    </Select>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
                      <FormControl>
                        <Input
                          placeholder="Selecionar Assuntos..."
                          value={subjectSearch} 
                          onChange={(e) => setSubjectSearch(e.target.value)}
                        />
                        {subjectSearch && (
                          <Box bg="white" border="1px" borderColor="gray.200" borderRadius="md" shadow="lg" position="absolute" zIndex={20} w="full" maxH="150px" overflowY="auto">
                            {filteredAssuntos.map(a => (
                              <Box key={a.id} p={2} _hover={{ bg: "gray.100", cursor: "pointer" }} onClick={() => toggleAssunto(a)}>
                                <Text fontSize="sm">{a.nome}</Text>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </FormControl>
                      <FormControl>
                        <Input 
                          placeholder="Palavra-chave (ex: porcentagem)" 
                          value={keywordSearch} 
                          onChange={(e) => setKeywordSearch(e.target.value)}
                        />
                      </FormControl>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Buscar por ID" 
                          value={idSearch} 
                          onChange={(e) => setIdSearch(e.target.value)}
                        />
                      </FormControl>
                      <FormControl>
                        <Select placeholder="Dificuldade" value={difficultySearch} onChange={(e) => setDifficultySearch(e.target.value)}>
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
                    <Wrap spacing={2}>
                      {selectedAssuntos.map(a => (
                        <Tag key={a.id} colorScheme="brand" borderRadius="full">
                          <TagLabel>{a.nome}</TagLabel>
                          <TagCloseButton onClick={() => toggleAssunto(a)} />
                        </Tag>
                      ))}
                    </Wrap>
                  </Stack>
                  <HStack mt={6} spacing={4}>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setMateria('Geral');
                        setSelectedAssuntos([]);
                        setKeywordSearch('');
                        setIdSearch('');
                        setDifficultySearch('');
                        setSortOrder('desc');
                      }}
                    >Limpar Filtros</Button>
                    <Button flex={1} colorScheme="brand" leftIcon={<Search size={18}/>} onClick={() => fetchSavedQuestions(0)} isLoading={loading}>Buscar no Banco</Button>
                  </HStack>
                </CardBody>
              </Card>

              {questions.length > 0 && totalQuestions > 0 && (
                <Flex justify="space-between" align="center" mb={4} px={2}>
                  <HStack spacing={4}>
                    <Text fontSize="xs" color="gray.500" fontWeight="bold">
                      {totalQuestions} ENCONTRADAS
                    </Text>
                    <Button size="xs" colorScheme="brand" variant="ghost" onClick={addAllToCustomList} leftIcon={<Plus size={14}/>}>
                      Adicionar todas à lista
                    </Button>
                  </HStack>
                  <HStack spacing={2}>
                    <Text fontSize="xs" mr={2}>Página {Math.floor(offset / PAGE_LIMIT) + 1}</Text>
                    <Button size="xs" onClick={() => fetchSavedQuestions(offset - PAGE_LIMIT)} isDisabled={offset === 0}>Anterior</Button>
                    <Button size="xs" onClick={() => fetchSavedQuestions(offset + PAGE_LIMIT)} isDisabled={offset + PAGE_LIMIT >= totalQuestions}>Próxima</Button>
                  </HStack>
                </Flex>
              )}

              <QuestionList 
                questions={questions} 
                onDelete={handleDeleteQuestion} 
                showDelete={true} 
                onAddToList={toggleQuestionInList}
                customList={customList}
                highlight={keywordSearch}
                loading={loading}
              />
            </TabPanel>

            {/* ADMIN */}
            <TabPanel p={0}>
              <AdminPanel 
                stats={adminStats} 
                materias={materiasList} 
                onEdit={handleEditClick} 
                onDelete={openDeleteDialog} 
                onAddMateria={handleAddMateria}
                onAddAssunto={handleAddAssunto}
                newMateria={newMateria}
                setNewMateria={setNewMateria}
                newAssunto={newAssunto}
                setNewAssunto={setNewAssunto}
                materiaParaAssunto={materiaParaAssunto}
                setMateriaParaAssunto={setMateriaParaAssunto}
                adminMateriaSearch={adminMateriaSearch}
                setAdminMateriaSearch={setAdminMateriaSearch}
                adminAssuntoSearch={adminAssuntoSearch}
                setAdminAssuntoSearch={setAdminAssuntoSearch}
                assuntosAdminList={assuntosAdminList}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="2xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Excluir Permanente</AlertDialogHeader>
            <AlertDialogBody>
              Você tem certeza que deseja excluir <strong>{deleteName}</strong>? 
              <br /><br />
              Esta ação não pode ser desfeita e removerá todos os 
              {deleteType === 'materia' ? ' assuntos e questões ' : ' dados '} vinculados.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} variant="ghost">Cancelar</Button>
              <Button colorScheme="red" onClick={executeDelete} ml={3} borderRadius="xl">Excluir</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Modal de Edição */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalHeader>Renomear {editingItem?.type === 'materia' ? 'Matéria' : 'Assunto'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Novo nome..." />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="brand" mr={3} onClick={saveEdit}>Salvar Alterações</Button>
            <Button onClick={onEditClose} variant="ghost">Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MathJaxContext>
  );
}

function CustomTab({ icon, label }) {
  return (
    <Tab flex={1} borderRadius="xl" _selected={{ bg: 'white', shadow: 'md', color: 'brand.600' }} _hover={{ color: 'brand.500' }} transition="all 0.3s">
      <HStack spacing={2}>
        {icon}
        <Text fontWeight="bold">{label}</Text>
      </HStack>
    </Tab>
  );
}

export default App;
