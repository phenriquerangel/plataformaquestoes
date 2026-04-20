import React, { useEffect, useState } from 'react';
import {
  Box, Heading, HStack, VStack, Text, Badge, Flex,
  Select, Button, IconButton, Collapse, useDisclosure,
  Spinner, Divider, Card, CardBody,
} from '@chakra-ui/react';
import {
  ClipboardList, Sparkles, Trash2, Plus, AlertCircle,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw,
  LogIn, ShieldAlert, UserPlus, UserMinus, UserCog,
} from 'lucide-react';
import { useAdminLogs, LOGS_LIMIT } from '../../hooks/useAdminLogs';

const TIPO_CONFIG = {
  geracao:          { label: 'Geração',       color: 'green',  icon: Sparkles },
  geracao_erro:     { label: 'Erro IA',        color: 'red',    icon: AlertCircle },
  exclusao_questao: { label: 'Exclusão',       color: 'orange', icon: Trash2 },
  exclusao_materia: { label: 'Exclusão',       color: 'orange', icon: Trash2 },
  exclusao_assunto: { label: 'Exclusão',       color: 'orange', icon: Trash2 },
  criacao_materia:  { label: 'Criação',        color: 'blue',   icon: Plus },
  criacao_assunto:  { label: 'Criação',        color: 'blue',   icon: Plus },
  login_sucesso:    { label: 'Login',          color: 'teal',   icon: LogIn },
  login_falha:      { label: 'Login Falhou',   color: 'red',    icon: ShieldAlert },
  criacao_usuario:  { label: 'Novo Usuário',   color: 'cyan',   icon: UserPlus },
  exclusao_usuario: { label: 'Usuário Excluído', color: 'orange', icon: UserMinus },
  edicao_usuario:   { label: 'Usuário Editado', color: 'blue',  icon: UserCog },
};

const FILTROS = [
  { value: '',                label: 'Todos os eventos' },
  { value: 'geracao',         label: 'Gerações' },
  { value: 'geracao_erro',    label: 'Erros de IA' },
  { value: 'exclusao_questao',label: 'Exclusões de questão' },
  { value: 'exclusao_materia',label: 'Exclusões de matéria' },
  { value: 'criacao_materia', label: 'Criações de matéria' },
  { value: 'criacao_assunto', label: 'Criações de assunto' },
  { value: 'login_sucesso',   label: 'Logins com sucesso' },
  { value: 'login_falha',     label: 'Tentativas de login falhas' },
  { value: 'criacao_usuario', label: 'Criações de usuário' },
  { value: 'exclusao_usuario',label: 'Exclusões de usuário' },
  { value: 'edicao_usuario',  label: 'Edições de usuário' },
];

function formatRelativo(isoStr) {
  if (!isoStr) return '—';
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return `há ${Math.floor(diff)}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return new Date(isoStr).toLocaleDateString('pt-BR');
}

function LogItem({ log }) {
  const { isOpen, onToggle } = useDisclosure();
  const config = TIPO_CONFIG[log.tipo] || { label: log.tipo, color: 'gray', icon: ClipboardList };
  const Icon = config.icon;
  const hasExtra = log.extra && Object.keys(log.extra).length > 0;

  return (
    <Box borderBottom="1px" borderColor="gray.100" py={3} px={1}>
      <Flex align="center" gap={3} cursor={hasExtra ? 'pointer' : 'default'} onClick={hasExtra ? onToggle : undefined}>
        <Box p={2} bg={`${config.color}.50`} color={`${config.color}.500`} borderRadius="lg" flexShrink={0}>
          <Icon size={14} />
        </Box>
        <Box flex="1" minW={0}>
          <HStack spacing={2} mb={0.5} flexWrap="wrap">
            <Badge colorScheme={config.color} fontSize="0.65em" borderRadius="full">{config.label}</Badge>
            <Text fontSize="sm" color="gray.700" noOfLines={1}>{log.descricao}</Text>
          </HStack>
          <Text fontSize="xs" color="gray.400">{formatRelativo(log.created_at)}</Text>
        </Box>
        {hasExtra && (
          <Box color="gray.400" flexShrink={0}>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Box>
        )}
      </Flex>

      {hasExtra && (
        <Collapse in={isOpen} animateOpacity>
          <Box mt={2} ml={10} p={3} bg="gray.50" borderRadius="md" fontSize="xs" color="gray.600">
            {Object.entries(log.extra).map(([k, v]) => (
              <HStack key={k} spacing={2} mb={1} align="flex-start">
                <Text fontWeight="bold" color="gray.500" minW="100px" flexShrink={0}>{k}:</Text>
                <Text wordBreak="break-all">{String(v)}</Text>
              </HStack>
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

export function LogsPage() {
  const [filtroTipo, setFiltroTipo] = useState('');
  const { logs, loading, total, offset, fetchLogs } = useAdminLogs();

  useEffect(() => { fetchLogs(0, filtroTipo); }, []);

  const handleFiltro = (tipo) => {
    setFiltroTipo(tipo);
    fetchLogs(0, tipo);
  };

  const totalPages = Math.ceil(total / LOGS_LIMIT);
  const currentPage = Math.floor(offset / LOGS_LIMIT) + 1;

  return (
    <Box>
      <HStack spacing={3} mb={8} justify="space-between" flexWrap="wrap">
        <HStack spacing={3}>
          <ClipboardList size={22} color="var(--chakra-colors-brand-600)" />
          <Heading size="lg" fontWeight="800">Logs de Atividade</Heading>
        </HStack>
        <HStack>
          {total > 0 && <Badge colorScheme="gray" borderRadius="full">{total} eventos</Badge>}
          <IconButton
            icon={<RefreshCw size={15} />}
            size="sm"
            variant="outline"
            onClick={() => fetchLogs(offset, filtroTipo)}
            isLoading={loading}
            aria-label="Atualizar"
          />
        </HStack>
      </HStack>

      <HStack mb={6} spacing={3}>
        <Select
          value={filtroTipo}
          onChange={e => handleFiltro(e.target.value)}
          maxW="280px"
          size="sm"
          borderRadius="md"
        >
          {FILTROS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </Select>
      </HStack>

      <Card borderRadius="2xl" shadow="sm">
        <CardBody p={0}>
          {loading ? (
            <Flex justify="center" py={10}><Spinner color="brand.500" /></Flex>
          ) : logs.length === 0 ? (
            <Flex justify="center" py={10}>
              <Text color="gray.400" fontSize="sm">Nenhum evento registrado ainda.</Text>
            </Flex>
          ) : (
            <VStack spacing={0} align="stretch" px={4}>
              {logs.map(log => <LogItem key={log.id} log={log} />)}
            </VStack>
          )}
        </CardBody>
      </Card>

      {total > LOGS_LIMIT && (
        <Flex justify="space-between" align="center" mt={4}>
          <Text fontSize="xs" color="gray.500">
            {offset + 1}–{Math.min(offset + LOGS_LIMIT, total)} de {total} eventos
          </Text>
          <HStack spacing={2}>
            <IconButton
              size="xs" icon={<ChevronLeft size={14} />} variant="outline"
              isDisabled={offset === 0}
              onClick={() => fetchLogs(offset - LOGS_LIMIT, filtroTipo)}
            />
            <Text fontSize="xs" color="gray.600">{currentPage} / {totalPages}</Text>
            <IconButton
              size="xs" icon={<ChevronRight size={14} />} variant="outline"
              isDisabled={offset + LOGS_LIMIT >= total}
              onClick={() => fetchLogs(offset + LOGS_LIMIT, filtroTipo)}
            />
          </HStack>
        </Flex>
      )}
    </Box>
  );
}
