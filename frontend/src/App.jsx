import React, { useState, useEffect } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import {
  Box, Container, Heading, HStack, Text,
  Tabs, TabList, TabPanels, Tab, TabPanel, useToast,
} from '@chakra-ui/react';
import { BrainCircuit, Sparkles, Database, Settings } from 'lucide-react';
import { useMaterias } from './hooks/useMaterias';
import { useAssuntos } from './hooks/useAssuntos';
import { useCustomList } from './hooks/useCustomList';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { useEditModal } from './hooks/useEditModal';
import { useQuestionGenerator } from './hooks/useQuestionGenerator';
import { useQuestionBank } from './hooks/useQuestionBank';
import { QuestionGenerator } from './components/generator/QuestionGenerator';
import { QuestionBank } from './components/bank/QuestionBank';
import { CustomList } from './components/shared/CustomList';
import { DeleteDialog } from './components/shared/DeleteDialog';
import { EditModal } from './components/shared/EditModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { apiClient, apiDownload } from './api';

const mathJaxConfig = {
  loader: { load: ['input/tex', 'output/svg'] },
  tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
};

function CustomTab({ icon, label }) {
  return (
    <Tab flex={1} borderRadius="xl" _selected={{ bg: 'white', shadow: 'md', color: 'brand.600' }}
      _hover={{ color: 'brand.500' }} transition="all 0.3s">
      <HStack spacing={2}>{icon}<Text fontWeight="bold">{label}</Text></HStack>
    </Tab>
  );
}

function App() {
  const toast = useToast();
  const [materia, setMateria] = useState('Geral');
  const [difficulty, setDifficulty] = useState('Media');
  const [quantity, setQuantity] = useState(5);
  const [materiaParaAssunto, setMateriaParaAssunto] = useState('');
  const [newMateria, setNewMateria] = useState('');
  const [newAssunto, setNewAssunto] = useState('');
  const [adminMateriaSearch, setAdminMateriaSearch] = useState('');
  const [adminAssuntoSearch, setAdminAssuntoSearch] = useState('');
  const [adminStats, setAdminStats] = useState({ total_materias: 0, total_assuntos: 0, total_questoes: 0 });

  const { materiasList, fetchMaterias, addMateria, editMateria, deleteMateria } = useMaterias();
  const {
    assuntosAdminList, selectedAssuntos, setSelectedAssuntos,
    subjectSearch, setSubjectSearch, filteredAssuntos,
    fetchAssuntosForMateria, fetchAssuntosAdmin,
    addAssunto, editAssunto, deleteAssunto, toggleAssunto,
  } = useAssuntos();
  const { customList, customListTitle, setCustomListTitle, toggleQuestion, addAll, moveQuestion, clear } = useCustomList();
  const deleteDialog = useDeleteDialog();
  const editModal = useEditModal();
  const generator = useQuestionGenerator();
  const bank = useQuestionBank();

  useEffect(() => { fetchMaterias(); }, [fetchMaterias]);

  useEffect(() => {
    const matObj = materiasList.find(m => m.nome === materia);
    fetchAssuntosForMateria(matObj?.id ?? null);
  }, [materia, materiasList, fetchAssuntosForMateria]);

  useEffect(() => {
    if (materiaParaAssunto) fetchAssuntosAdmin(materiaParaAssunto);
  }, [materiaParaAssunto, fetchAssuntosAdmin]);

  const fetchAdminStats = async () => {
    try {
      const data = await apiClient(`admin/stats?t=${Date.now()}`);
      setAdminStats(data);
    } catch (err) { console.error('Erro ao buscar estatísticas:', err); }
  };

  const handleMateriaChange = (e) => {
    setMateria(e.target.value);
    setSelectedAssuntos([]);
    setSubjectSearch('');
  };

  const handleExportPDF = async (data, title) => {
    const toastId = toast({ title: 'Gerando PDF...', status: 'info', duration: null });
    try {
      await apiDownload('export-pdf', { data, title }, title.replace(/\s+/g, '_').toLowerCase() + '.pdf');
      toast.update(toastId, { title: 'PDF gerado com sucesso!', status: 'success', duration: 3000 });
    } catch (err) {
      toast.update(toastId, { title: 'Erro ao gerar PDF', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const handleSaveEdit = async () => {
    if (editModal.editingItem.type === 'materia') {
      await editMateria(editModal.editingItem.id, editModal.editValue);
    } else {
      await editAssunto(editModal.editingItem.id, editModal.editValue, materiaParaAssunto);
    }
    await Promise.all([
      materiaParaAssunto ? fetchAssuntosAdmin(materiaParaAssunto) : Promise.resolve(),
      fetchAdminStats(),
    ]);
    editModal.onClose();
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.deleteType === 'materia') {
      await deleteMateria(deleteDialog.deleteId);
      if (materiaParaAssunto === String(deleteDialog.deleteId)) setMateriaParaAssunto('');
    } else {
      await deleteAssunto(deleteDialog.deleteId, materiaParaAssunto);
    }
    fetchAdminStats();
    deleteDialog.onClose();
  };

  const handleAddMateria = async () => {
    const ok = await addMateria(newMateria);
    if (ok) { setNewMateria(''); fetchAdminStats(); }
  };

  const handleAddAssunto = async () => {
    const ok = await addAssunto(newAssunto, materiaParaAssunto);
    if (ok) { setNewAssunto(''); fetchAdminStats(); }
  };

  const handleResetFilters = () => {
    setMateria('Geral');
    setSelectedAssuntos([]);
    setSubjectSearch('');
    bank.resetFilters();
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box bg="white" px={8} py={4} borderBottom="1px" borderColor="gray.200" position="sticky" top={0} zIndex={10} shadow="sm">
        <Container maxW="container.xl">
          <HStack spacing={3}>
            <Box bg="brand.600" p={2} borderRadius="xl" color="white" shadow="md"><BrainCircuit size={24} /></Box>
            <Heading size="md" fontWeight="800" letterSpacing="tight">
              EduQuest<Text as="span" color="brand.600">.ai</Text>
            </Heading>
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.lg" py={12}>
        <Tabs variant="unstyled" isLazy onChange={(i) => { fetchMaterias(); setSelectedAssuntos([]); if (i === 2) fetchAdminStats(); }}>
          <TabList bg="gray.200" p={1} borderRadius="2xl" mb={10} display="flex">
            <CustomTab icon={<Sparkles size={18} />} label="Gerador" />
            <CustomTab icon={<Database size={18} />} label="Banco" />
            <CustomTab icon={<Settings size={18} />} label="Admin" />
          </TabList>

          <CustomList
            customList={customList}
            customListTitle={customListTitle}
            setCustomListTitle={setCustomListTitle}
            onToggle={toggleQuestion}
            onMove={moveQuestion}
            onClear={clear}
            onExport={() => handleExportPDF(customList, customListTitle)}
          />

          <TabPanels>
            <TabPanel p={0}>
              <QuestionGenerator
                materiasList={materiasList}
                materia={materia}
                onMateriaChange={handleMateriaChange}
                selectedAssuntos={selectedAssuntos}
                filteredAssuntos={filteredAssuntos}
                subjectSearch={subjectSearch}
                onSearchChange={setSubjectSearch}
                onToggleAssunto={toggleAssunto}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                quantity={quantity}
                setQuantity={setQuantity}
                questions={generator.questions}
                loading={generator.loading}
                onGenerate={() => generator.generate({ materia, selectedAssuntos, difficulty, quantity })}
                onExport={() => handleExportPDF(generator.questions, 'AVALIAÇÃO DE DESEMPENHO')}
                onDeleteQuestion={generator.deleteQuestion}
                onAddToList={toggleQuestion}
                customList={customList}
              />
            </TabPanel>
            <TabPanel p={0}>
              <QuestionBank
                materiasList={materiasList}
                materia={materia}
                onMateriaChange={handleMateriaChange}
                filteredAssuntos={filteredAssuntos}
                selectedAssuntos={selectedAssuntos}
                subjectSearch={subjectSearch}
                onSearchChange={setSubjectSearch}
                onToggleAssunto={toggleAssunto}
                keywordSearch={bank.keywordSearch}
                setKeywordSearch={bank.setKeywordSearch}
                idSearch={bank.idSearch}
                setIdSearch={bank.setIdSearch}
                difficultySearch={bank.difficultySearch}
                setDifficultySearch={bank.setDifficultySearch}
                sortOrder={bank.sortOrder}
                setSortOrder={bank.setSortOrder}
                questions={bank.questions}
                loading={bank.loading}
                totalQuestions={bank.totalQuestions}
                offset={bank.offset}
                onSearch={(offset) => bank.fetchQuestions(offset, { selectedAssuntos })}
                onResetFilters={handleResetFilters}
                onDeleteQuestion={bank.deleteQuestion}
                onToggleInList={toggleQuestion}
                onAddAll={() => addAll(bank.questions)}
                customList={customList}
              />
            </TabPanel>
            <TabPanel p={0}>
              <AdminPanel
                stats={adminStats}
                materias={materiasList}
                onEdit={(item, type) => editModal.open(item, type)}
                onDelete={deleteDialog.open}
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

      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.onClose}
        cancelRef={deleteDialog.cancelRef}
        deleteName={deleteDialog.deleteName}
        deleteType={deleteDialog.deleteType}
        onConfirm={handleConfirmDelete}
      />
      <EditModal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        editingItem={editModal.editingItem}
        editValue={editModal.editValue}
        setEditValue={editModal.setEditValue}
        onSave={handleSaveEdit}
      />
    </MathJaxContext>
  );
}

export default App;
