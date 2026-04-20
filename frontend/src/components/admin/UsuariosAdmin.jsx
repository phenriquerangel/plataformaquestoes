import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Badge, Button, Card, CardBody, CardHeader, Flex, FormControl, FormLabel,
  Heading, HStack, IconButton, Input, Modal, ModalBody, ModalCloseButton,
  ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Switch, Table,
  TableContainer, Tbody, Td, Text, Th, Thead, Tr, VStack,
  AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogOverlay, useDisclosure,
} from '@chakra-ui/react';
import { Users, UserPlus, Edit3, Trash2 } from 'lucide-react';
import { useAdminUsuarios } from '../../hooks/useAdminUsuarios';

const ROLE_CONFIG = {
  admin: { label: 'Administrador', color: 'purple' },
  user:  { label: 'Usuário',       color: 'blue' },
};

function NovoUsuarioModal({ isOpen, onClose, onSave }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ username, password, role });
      setUsername(''); setPassword(''); setRole('user');
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader>Novo Usuário</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">Usuário</FormLabel>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="ex: maria.silva" autoFocus />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Senha</FormLabel>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 4 caracteres" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Papel</FormLabel>
              <Select value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancelar</Button>
          <Button colorScheme="brand" onClick={handleSave} isLoading={loading} isDisabled={!username || !password}>
            Criar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function EditarUsuarioModal({ isOpen, onClose, usuario, onSave, currentUsername }) {
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario) { setRole(usuario.role); setPassword(''); setAtivo(usuario.ativo); }
  }, [usuario]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const body = { role, ativo };
      if (password) body.password = password;
      await onSave(usuario.id, body);
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const isSelf = usuario?.username === currentUsername;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader>Editar: {usuario?.username}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">Papel</FormLabel>
              <Select value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Nova senha <Text as="span" color="gray.400">(deixe vazio para manter)</Text></FormLabel>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha..." />
            </FormControl>
            {!isSelf && (
              <FormControl display="flex" alignItems="center">
                <FormLabel fontSize="sm" mb={0}>Conta ativa</FormLabel>
                <Switch isChecked={ativo} onChange={e => setAtivo(e.target.checked)} colorScheme="brand" ml="auto" />
              </FormControl>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancelar</Button>
          <Button colorScheme="brand" onClick={handleSave} isLoading={loading}>Salvar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function UsuariosAdmin({ currentUsername }) {
  const { usuarios, fetchUsuarios, criarUsuario, editarUsuario, excluirUsuario } = useAdminUsuarios();
  const novoModal = useDisclosure();
  const editModal = useDisclosure();
  const deleteDialog = useDisclosure();
  const cancelRef = useRef();
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  useEffect(() => { fetchUsuarios(); }, []);

  const handleCriar = async (body) => { await criarUsuario(body); fetchUsuarios(); };
  const handleEditar = async (id, body) => { await editarUsuario(id, body); fetchUsuarios(); };
  const handleDelete = async () => { await excluirUsuario(deletingUser.id); fetchUsuarios(); deleteDialog.onClose(); };

  return (
    <Box mt={10}>
      <Card borderRadius="2xl">
        <CardHeader borderBottom="1px" borderColor="gray.100">
          <Flex align="center" justify="space-between">
            <HStack spacing={3}>
              <Users size={18} />
              <Heading size="sm">Gestão de Usuários</Heading>
            </HStack>
            <Button size="sm" colorScheme="brand" leftIcon={<UserPlus size={14} />} onClick={novoModal.onOpen}>
              Novo Usuário
            </Button>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          <TableContainer>
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Usuário</Th>
                  <Th>Papel</Th>
                  <Th>Status</Th>
                  <Th>Criado em</Th>
                  <Th textAlign="right">Ações</Th>
                </Tr>
              </Thead>
              <Tbody>
                {usuarios.map(u => (
                  <Tr key={u.id} _hover={{ bg: 'gray.50' }} opacity={u.ativo ? 1 : 0.5}>
                    <Td fontWeight="medium">
                      {u.username}
                      {u.username === currentUsername && (
                        <Badge ml={2} colorScheme="gray" fontSize="0.6em" borderRadius="full">você</Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge colorScheme={ROLE_CONFIG[u.role]?.color ?? 'gray'} borderRadius="full" fontSize="0.7em">
                        {ROLE_CONFIG[u.role]?.label ?? u.role}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={u.ativo ? 'green' : 'red'} borderRadius="full" fontSize="0.7em">
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </Td>
                    <Td color="gray.500" fontSize="xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                    </Td>
                    <Td textAlign="right">
                      <HStack spacing={1} justify="flex-end">
                        <IconButton
                          size="xs" icon={<Edit3 size={13} />} variant="ghost" colorScheme="blue"
                          aria-label="Editar"
                          onClick={() => { setEditingUser(u); editModal.onOpen(); }}
                        />
                        <IconButton
                          size="xs" icon={<Trash2 size={13} />} variant="ghost" colorScheme="red"
                          aria-label="Excluir"
                          isDisabled={u.username === currentUsername}
                          onClick={() => { setDeletingUser(u); deleteDialog.onOpen(); }}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      <NovoUsuarioModal isOpen={novoModal.isOpen} onClose={novoModal.onClose} onSave={handleCriar} />

      {editingUser && (
        <EditarUsuarioModal
          isOpen={editModal.isOpen}
          onClose={editModal.onClose}
          usuario={editingUser}
          onSave={handleEditar}
          currentUsername={currentUsername}
        />
      )}

      <AlertDialog isOpen={deleteDialog.isOpen} leastDestructiveRef={cancelRef} onClose={deleteDialog.onClose} isCentered>
        <AlertDialogOverlay />
        <AlertDialogContent borderRadius="2xl">
          <AlertDialogHeader>Excluir Usuário</AlertDialogHeader>
          <AlertDialogBody>
            Deseja excluir <strong>{deletingUser?.username}</strong>? Esta ação não pode ser desfeita.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={deleteDialog.onClose}>Cancelar</Button>
            <Button colorScheme="red" ml={3} onClick={handleDelete}>Excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
