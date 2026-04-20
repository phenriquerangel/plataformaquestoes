import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MathJaxContext } from 'better-react-mathjax';
import { Box, Container, useToast, useColorModeValue } from '@chakra-ui/react';
import { useMaterias } from './hooks/useMaterias';
import { useAssuntos } from './hooks/useAssuntos';
import { useCustomList } from './hooks/useCustomList';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { useEditModal } from './hooks/useEditModal';
import { useQuestionGenerator } from './hooks/useQuestionGenerator';
import { useQuestionBank } from './hooks/useQuestionBank';
import { useListas } from './hooks/useListas';
import { QuestionGenerator } from './components/generator/QuestionGenerator';
import { QuestionBank } from './components/bank/QuestionBank';
import { CustomList } from './components/shared/CustomList';
import { DeleteDialog } from './components/shared/DeleteDialog';
import { EditModal } from './components/shared/EditModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { Dashboard } from './components/dashboard/Dashboard';
import { LogsPage } from './components/logs/LogsPage';
import { LoginPage } from './components/auth/LoginPage';
import { MinhasListas } from './components/listas/MinhasListas';
import { Sidebar, MobileTopBar } from './components/layout/Sidebar';
import { useAuth } from './hooks/useAuth';
import { apiClient, apiDownload } from './api';

const mathJaxConfig = {
  loader: { load: ['input/tex', 'output/svg'] },
  tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
};

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

const pageTransition = { duration: 0.18, ease: 'easeOut' };

function App() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, username, login, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [materia, setMateria] = useState('Geral');
  const [difficulty, setDifficulty] = useState('Media');
  const [quantity, setQuantity] = useState(5);
  const [tipo, setTipo] = useState('multipla_escolha');
  const [selectedSerie, setSelectedSerie] = useState('');
  const [materiaParaAssunto, setMateriaParaAssunto] = useState('');
  const [newMateria, setNewMateria] = useState('');
  const [newMateriaSerie, setNewMateriaSerie] = useState('');
  const [newAssunto, setNewAssunto] = useState('');
  const [newAssuntoSerie, setNewAssuntoSerie] = useState('');
  const [adminMateriaSearch, setAdminMateriaSearch] = useState('');
  const [adminAssuntoSearch, setAdminAssuntoSearch] = useState('');
  const [adminStats, setAdminStats] = useState({ total_materias: 0, total_assuntos: 0, total_questoes: 0, por_dificuldade: {}, por_materia: {} });

  const bgColor = useColorModeValue('gray.50', 'gray.900');

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
  const listas = useListas();

  const fetchAdminStats = async () => {
    try {
      const data = await apiClient(`admin/stats?t=${Date.now()}`);
      setAdminStats(data);
    } catch (err) { console.error('Erro ao buscar estatísticas:', err); }
  };

  useEffect(() => { fetchMaterias(); }, [fetchMaterias]);

  useEffect(() => {
    if (isAuthenticated) listas.fetchListas();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const matObj = materiasList.find(m => m.nome === materia);
    fetchAssuntosForMateria(matObj?.id ?? null);
  }, [materia, materiasList, fetchAssuntosForMateria]);

  useEffect(() => {
    if (materiaParaAssunto) fetchAssuntosAdmin(materiaParaAssunto);
  }, [materiaParaAssunto, fetchAssuntosAdmin]);

  const handleNavigate = (page) => {
    setActivePage(page);
    fetchMaterias();
    setSelectedAssuntos([]);
    if (page === 'admin' || page === 'dashboard') fetchAdminStats();
    if (page === 'listas' || page === 'bank' || page === 'generator') listas.fetchListas();
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
      await editMateria(editModal.editingItem.id, editModal.editValue, editModal.editSerie);
    } else {
      await editAssunto(editModal.editingItem.id, editModal.editValue, materiaParaAssunto, editModal.editSerie);
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
    const ok = await addMateria(newMateria, newMateriaSerie);
    if (ok) { setNewMateria(''); setNewMateriaSerie(''); fetchAdminStats(); }
  };

  const handleAddAssunto = async () => {
    const ok = await addAssunto(newAssunto, materiaParaAssunto, newAssuntoSerie);
    if (ok) { setNewAssunto(''); setNewAssuntoSerie(''); fetchAdminStats(); }
  };

  const handleResetFilters = () => {
    setSelectedSerie('');
    setMateria('Geral');
    setSelectedAssuntos([]);
    setSubjectSearch('');
    bank.resetFilters();
  };

  const filteredMateriasBySerie = selectedSerie
    ? materiasList.filter(m => m.serie === selectedSerie)
    : materiasList;

  const handleAddToLista = async (listaId, questaoId) => {
    await listas.addQuestaoToLista(listaId, questaoId);
  };

  const handleCreateAndAdd = async (nome, question) => {
    const nova = await listas.createLista(nome);
    if (nova) {
      await listas.addQuestaoToLista(nova.id, question.id);
    }
  };

  if (!isAuthenticated) {
    return (
      <MathJaxContext config={mathJaxConfig}>
        <LoginPage onLogin={login} />
      </MathJaxContext>
    );
  }

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box display="flex" minH="100vh" bg={bgColor}>
        <Sidebar activePage={activePage} onNavigate={handleNavigate} isAdmin={isAdmin} username={username} onLogout={logout} />

        <Box flex="1" ml={{ base: 0, md: '220px' }} display="flex" flexDirection="column">
          <MobileTopBar activePage={activePage} onNavigate={handleNavigate} isAdmin={isAdmin} username={username} onLogout={logout} />

          <Container maxW="container.lg" py={8} px={{ base: 4, md: 8 }}>
            <CustomList
              customList={customList}
              customListTitle={customListTitle}
              setCustomListTitle={setCustomListTitle}
              onToggle={toggleQuestion}
              onMove={moveQuestion}
              onClear={clear}
              onExport={() => handleExportPDF(customList, customListTitle)}
              onSaveToListas={listas.saveCurrentListAs}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                {activePage === 'dashboard' && (
                  <Dashboard stats={adminStats} />
                )}

                {activePage === 'generator' && (
                  <QuestionGenerator
                    materiasList={filteredMateriasBySerie}
                    selectedSerie={selectedSerie}
                    onSerieChange={(e) => { setSelectedSerie(e.target.value); setMateria(''); setSelectedAssuntos([]); }}
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
                    tipo={tipo}
                    setTipo={setTipo}
                    questions={generator.questions}
                    loading={generator.loading}
                    onGenerate={() => generator.generate({ materia, serie: selectedSerie, selectedAssuntos, difficulty, quantity, tipo })}
                    onExport={() => handleExportPDF(generator.questions, 'AVALIAÇÃO DE DESEMPENHO')}
                    onDeleteQuestion={generator.deleteQuestion}
                    onAddToList={toggleQuestion}
                    customList={customList}
                    listas={listas.listas}
                    onAddToLista={handleAddToLista}
                    onCreateAndAdd={handleCreateAndAdd}
                  />
                )}

                {activePage === 'bank' && (
                  <QuestionBank
                    materiasList={filteredMateriasBySerie}
                    selectedSerie={selectedSerie}
                    onSerieChange={(e) => { setSelectedSerie(e.target.value); setMateria('Geral'); setSelectedAssuntos([]); }}
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
                    listas={listas.listas}
                    onAddToLista={handleAddToLista}
                    onCreateAndAdd={handleCreateAndAdd}
                  />
                )}

                {activePage === 'listas' && (
                  <MinhasListas
                    listas={listas.listas}
                    loading={listas.loading}
                    onFetch={listas.fetchListas}
                    onCreate={listas.createLista}
                    onDelete={listas.deleteLista}
                    onRename={(id, nome) => listas.updateLista(id, { nome })}
                    fetchListaQuestoes={listas.fetchListaQuestoes}
                    onRemoveQuestaoFromLista={listas.removeQuestaoFromLista}
                    onUpdateLista={listas.updateLista}
                    onExportPDF={handleExportPDF}
                  />
                )}

                {activePage === 'logs' && <LogsPage />}

                {activePage === 'admin' && (
                  <AdminPanel
                    currentUsername={username}
                    stats={adminStats}
                    materias={materiasList}
                    onEdit={(item, type) => editModal.open(item, type)}
                    onDelete={deleteDialog.open}
                    onAddMateria={handleAddMateria}
                    onAddAssunto={handleAddAssunto}
                    newMateria={newMateria}
                    setNewMateria={setNewMateria}
                    newMateriaSerie={newMateriaSerie}
                    setNewMateriaSerie={setNewMateriaSerie}
                    newAssunto={newAssunto}
                    setNewAssunto={setNewAssunto}
                    newAssuntoSerie={newAssuntoSerie}
                    setNewAssuntoSerie={setNewAssuntoSerie}
                    materiaParaAssunto={materiaParaAssunto}
                    setMateriaParaAssunto={setMateriaParaAssunto}
                    adminMateriaSearch={adminMateriaSearch}
                    setAdminMateriaSearch={setAdminMateriaSearch}
                    adminAssuntoSearch={adminAssuntoSearch}
                    setAdminAssuntoSearch={setAdminAssuntoSearch}
                    assuntosAdminList={assuntosAdminList}
                    onStatsRefresh={fetchAdminStats}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </Container>
        </Box>
      </Box>

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
        editSerie={editModal.editSerie}
        setEditSerie={editModal.setEditSerie}
        onSave={handleSaveEdit}
      />
    </MathJaxContext>
  );
}

export default App;
