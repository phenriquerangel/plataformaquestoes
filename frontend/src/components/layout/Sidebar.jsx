import React from 'react';
import {
  Box, VStack, HStack, Text, Heading, Flex, IconButton,
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow,
  useDisclosure, Spinner, Divider,
} from '@chakra-ui/react';
import { BrainCircuit, BarChart2, Sparkles, Database, Settings, Menu, RefreshCw, ClipboardList, LogOut, BookOpen } from 'lucide-react';
import { useHealthCheck } from '../../hooks/useHealthCheck';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',     icon: BarChart2,     adminOnly: true },
  { id: 'generator', label: 'Gerador',       icon: Sparkles,      adminOnly: false },
  { id: 'bank',      label: 'Banco',         icon: Database,      adminOnly: false },
  { id: 'listas',    label: 'Minhas Listas', icon: BookOpen,      adminOnly: false },
  { id: 'admin',     label: 'Admin',         icon: Settings,      adminOnly: true },
  { id: 'logs',      label: 'Logs',          icon: ClipboardList, adminOnly: true },
];

const STATUS_COLOR = { ok: 'green.400', degraded: 'yellow.400', error: 'red.400', not_configured: 'yellow.400' };
const STATUS_LABEL = { ok: 'Operacional', degraded: 'Degradado', error: 'Erro', not_configured: 'Não configurado' };
const COMPONENT_LABEL = { api: 'API', database: 'Banco de Dados', gemini: 'Gemini AI' };

function StatusDot({ status, size = '10px' }) {
  const color = STATUS_COLOR[status] || 'gray.300';
  return (
    <Box
      w={size} h={size} borderRadius="full" bg={color} flexShrink={0}
      boxShadow={status === 'ok' ? `0 0 6px var(--chakra-colors-green-300)` : undefined}
    />
  );
}

function HealthIndicator() {
  const { health, loading, lastChecked, refresh } = useHealthCheck();
  const overallStatus = health?.status ?? (loading ? 'loading' : 'error');
  const components = health?.components ?? {};

  return (
    <Popover placement="top-start" trigger="hover">
      <PopoverTrigger>
        <Flex
          align="center"
          gap={2}
          px={4}
          py={3}
          cursor="pointer"
          borderRadius="xl"
          _hover={{ bg: 'gray.50' }}
        >
          {loading ? (
            <Spinner size="xs" color="gray.400" />
          ) : (
            <StatusDot status={overallStatus} />
          )}
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            {loading ? 'Verificando...' : STATUS_LABEL[overallStatus] ?? 'Desconhecido'}
          </Text>
        </Flex>
      </PopoverTrigger>
      <PopoverContent w="220px" borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
        <PopoverArrow />
        <PopoverBody p={4}>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
              Status do Sistema
            </Text>
            <IconButton
              icon={<RefreshCw size={12} />}
              size="xs"
              variant="ghost"
              onClick={refresh}
              aria-label="Verificar agora"
            />
          </HStack>
          <VStack align="stretch" spacing={2}>
            {Object.entries(components).map(([key, val]) => (
              <Flex key={key} align="center" justify="space-between">
                <Text fontSize="sm" color="gray.600">{COMPONENT_LABEL[key] ?? key}</Text>
                <HStack spacing={1.5}>
                  <StatusDot status={val.status} size="8px" />
                  <Text fontSize="xs" color="gray.500">{STATUS_LABEL[val.status] ?? val.status}</Text>
                </HStack>
              </Flex>
            ))}
          </VStack>
          {lastChecked && (
            <>
              <Divider my={3} />
              <Text fontSize="xs" color="gray.400" textAlign="center">
                Atualizado {lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon;
  return (
    <Flex
      as="button"
      w="full"
      align="center"
      gap={3}
      px={4}
      py={3}
      borderRadius="xl"
      cursor="pointer"
      fontWeight="semibold"
      fontSize="sm"
      transition="all 0.15s"
      bg={isActive ? 'brand.50' : 'transparent'}
      color={isActive ? 'brand.600' : 'gray.500'}
      _hover={{ bg: isActive ? 'brand.50' : 'gray.100', color: isActive ? 'brand.600' : 'gray.700' }}
      onClick={onClick}
    >
      <Icon size={18} />
      <Text>{item.label}</Text>
    </Flex>
  );
}

function SidebarContent({ activePage, onNavigate, isAdmin, username, onLogout }) {
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);
  return (
    <Box h="full" display="flex" flexDirection="column" py={6} px={3}>
      <HStack spacing={3} px={3} mb={8}>
        <Box bg="brand.600" p={2} borderRadius="xl" color="white" shadow="md">
          <BrainCircuit size={22} />
        </Box>
        <Heading size="md" fontWeight="800" letterSpacing="tight">
          EduQuest<Text as="span" color="brand.600">.ai</Text>
        </Heading>
      </HStack>

      <VStack spacing={1} align="stretch" flex="1">
        {visibleItems.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </VStack>

      <Divider mb={2} />
      <Flex align="center" justify="space-between" px={4} py={2}>
        <VStack align="start" spacing={0}>
          <Text fontSize="xs" fontWeight="semibold" color="gray.600">{username}</Text>
          <Text fontSize="xs" color="gray.400">{isAdmin ? 'Administrador' : 'Usuário'}</Text>
        </VStack>
        <IconButton
          icon={<LogOut size={14} />}
          size="xs"
          variant="ghost"
          colorScheme="red"
          onClick={onLogout}
          aria-label="Sair"
          title="Sair"
        />
      </Flex>
      <Divider mb={2} />
      <HealthIndicator />
    </Box>
  );
}

export function Sidebar({ activePage, onNavigate, isAdmin, username, onLogout }) {
  return (
    <Box
      w="220px"
      h="100vh"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      position="fixed"
      top={0}
      left={0}
      display={{ base: 'none', md: 'block' }}
      zIndex={10}
    >
      <SidebarContent activePage={activePage} onNavigate={onNavigate} isAdmin={isAdmin} username={username} onLogout={onLogout} />
    </Box>
  );
}

export function MobileTopBar({ activePage, onNavigate, isAdmin, username, onLogout }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);
  const current = visibleItems.find(i => i.id === activePage);

  return (
    <>
      <Flex
        display={{ base: 'flex', md: 'none' }}
        position="sticky"
        top={0}
        zIndex={10}
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        px={4}
        py={3}
        align="center"
        justify="space-between"
        shadow="sm"
      >
        <HStack spacing={3}>
          <Box bg="brand.600" p={1.5} borderRadius="lg" color="white">
            <BrainCircuit size={18} />
          </Box>
          <Heading size="sm" fontWeight="800">
            EduQuest<Text as="span" color="brand.600">.ai</Text>
          </Heading>
        </HStack>
        <HStack>
          {current && <Text fontSize="sm" fontWeight="semibold" color="gray.500">{current.label}</Text>}
          <IconButton
            icon={<Menu size={20} />}
            variant="ghost"
            size="sm"
            onClick={onOpen}
            aria-label="Menu"
          />
        </HStack>
      </Flex>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="220px">
          <DrawerCloseButton />
          <SidebarContent
            activePage={activePage}
            onNavigate={(page) => { onNavigate(page); onClose(); }}
            isAdmin={isAdmin}
            username={username}
            onLogout={onLogout}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}
