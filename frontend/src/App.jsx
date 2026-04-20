import React, { useState, useEffect } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import { Box, Container, useToast } from '@chakra-ui/react';
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
import { Dashboard } from './components/dashboard/Dashboard';
import { LogsPage } from './components/logs/LogsPage';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar, MobileTopBar } from './components/layout/Sidebar';
import { useAuth } from './hooks/useAuth';
import { apiClient, apiDownload } from './api';

const mathJaxConfig = {
  loader: { load: ['input/tex', 'output/svg'] },
  tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
};

function App() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, username, login, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [materia, setMateria] = useState('Geral');
  const [difficulty, setDifficulty] = useState('Media');
  const [quantity, setQuantity] = useState(5);
  const [materiaParaAssunto, setMateriaParaAssunto] = useState('');
  const [newMateria, setNewMateria] = useState('');
  const [newAssunto, setNewAssunto] = useState('');
  const [adminMateriaSearch, setAdminMateriaSearch] = useState('');
  const [adminAssuntoSearch, setAdminAssuntoSearch] = useState('');
  const [adminStats, setAdminStats] = useState({ total_materias: 0, total_assuntos: 0, total_questoes: 0, por_dificuldade: {}, por_materia: {} });

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

  const fetchAdminStats = async () => {
    try {
      const data = await apiClient(`admin/stats?t=${Date.now()}`);
      setAdminStats(data);
    } catch (err) { console.error('Erro ao buscar estatísticas:', err); }
  };

  useEffect(() => { fetchMaterias(); }, [fetchMaterias]);

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

  if (!isAuthenticated) {
    return (
      <MathJaxContext config={mathJaxConfig}>
        <LoginPage onLogin={login} />
      </MathJaxContext>
    );
  }

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box display="flex" minH="100vh" bg="gray.50">
        {/* Sidebar desktop */}
        <Sidebar activePage={activePage} onNavigate={handleNavigate} isAdmin={isAdmin} username={username} onLogout={logout} />

        {/* Conteúdo principal */}
        <Box flex="1" ml={{ base: 0, md: '220px' }} display="flex" flexDirection="column">
          {/* Top bar mobile */}
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
            />

            {activePage === 'dashboard' && (
              <Dashboard stats={adminStats} />
            )}

            {activePage === 'generator' && (
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
            )}

            {activePage === 'bank' && (
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
                newAssunto={newAssunto}
                setNewAssunto={setNewAssunto}
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
        onSave={handleSaveEdit}
      />
    </MathJaxContext>
  );
}

export default App;
