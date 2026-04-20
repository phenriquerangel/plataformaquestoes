import React, { useState } from 'react';
import {
  Box, VStack, Input, Button, Text, Heading,
  InputGroup, InputRightElement, IconButton,
  Alert, AlertIcon, FormControl, FormLabel,
  useColorModeValue,
} from '@chakra-ui/react';
import { BrainCircuit, Eye, EyeOff, LogIn } from 'lucide-react';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const labelColor = useColorModeValue('gray.600', 'gray.300');
  const subtleColor = useColorModeValue('gray.400', 'gray.500');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Preencha usuário e senha.'); return; }
    setLoading(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message || 'Usuário ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg={pageBg} display="flex" alignItems="center" justifyContent="center" px={4}>
      <Box bg={cardBg} borderRadius="2xl" shadow="lg" p={8} w="full" maxW="360px">
        <VStack spacing={6}>
          <VStack spacing={2}>
            <Box bg="brand.600" p={3} borderRadius="xl" color="white" shadow="md">
              <BrainCircuit size={28} />
            </Box>
            <Heading size="lg" fontWeight="800">
              EduQuest<Text as="span" color="brand.600">.ai</Text>
            </Heading>
            <Text fontSize="sm" color={subtleColor}>Faça login para continuar</Text>
          </VStack>

          {error && (
            <Alert status="error" borderRadius="lg" fontSize="sm">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <VStack as="form" onSubmit={handleSubmit} spacing={4} w="full">
            <FormControl>
              <FormLabel fontSize="sm" color={labelColor}>Usuário</FormLabel>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                borderRadius="lg"
                autoFocus
                autoComplete="username"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={labelColor}>Senha</FormLabel>
              <InputGroup>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  borderRadius="lg"
                  autoComplete="current-password"
                />
                <InputRightElement>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    onClick={() => setShowPw(v => !v)}
                    aria-label="Mostrar senha"
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              type="submit"
              colorScheme="brand"
              w="full"
              borderRadius="lg"
              isLoading={loading}
              loadingText="Entrando..."
              leftIcon={<LogIn size={16} />}
            >
              Entrar
            </Button>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
