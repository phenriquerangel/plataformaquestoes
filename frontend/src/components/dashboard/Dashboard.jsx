import React from 'react';
import { motion } from 'framer-motion';
import {
  Box, SimpleGrid, Card, CardBody, CardHeader,
  Heading, HStack, VStack, Stat, StatLabel, StatNumber,
  Text, Flex, useColorModeValue,
} from '@chakra-ui/react';
import { LayoutGrid, BookOpen, Database, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const DIFF_COLORS = { Facil: '#48BB78', Media: '#ECC94B', Dificil: '#FC8181' };
const DIFF_LABELS = { Facil: 'Fácil', Media: 'Média', Dificil: 'Difícil' };
const BAR_COLOR = '#6366F1';

function StatCard({ label, value, icon, borderColor, iconBg, iconColor, delay }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const labelColor = useColorModeValue('gray.500', 'gray.400');
  const valueColor = useColorModeValue('gray.800', 'gray.100');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card
        borderRadius="2xl"
        shadow="sm"
        borderLeft="4px solid"
        borderColor={borderColor}
        bg={cardBg}
        transition="all 0.18s"
        _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
      >
        <CardBody>
          <Flex align="center" justify="space-between">
            <Stat>
              <StatLabel color={labelColor} fontWeight="bold" fontSize="xs">{label}</StatLabel>
              <StatNumber fontSize="3xl" color={valueColor}>{value}</StatNumber>
            </Stat>
            <Box p={3} bg={iconBg} color={iconColor} borderRadius="xl">{icon}</Box>
          </Flex>
        </CardBody>
      </Card>
    </motion.div>
  );
}

export function Dashboard({ stats }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const emptyColor = useColorModeValue('gray.400', 'gray.500');
  const tooltipStyle = useColorModeValue(
    { borderRadius: '8px', fontSize: '13px' },
    { borderRadius: '8px', fontSize: '13px', backgroundColor: '#2D3748', border: 'none', color: '#E2E8F0' }
  );

  const dificuldadeData = Object.entries(stats.por_dificuldade || {}).map(([key, value]) => ({
    name: DIFF_LABELS[key] || key,
    value,
    color: DIFF_COLORS[key] || '#A0AEC0',
  }));

  const materiaData = Object.entries(stats.por_materia || {}).map(([name, value]) => ({
    name,
    Questões: value,
  }));

  return (
    <Box>
      <HStack spacing={3} mb={8}>
        <BarChart2 size={22} color="var(--chakra-colors-brand-600)" />
        <Heading size="lg" fontWeight="800">Dashboard</Heading>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <StatCard
          label="MATÉRIAS" value={stats.total_materias}
          icon={<LayoutGrid size={24} />}
          borderColor="blue.500" iconBg="blue.50" iconColor="blue.500"
          delay={0}
        />
        <StatCard
          label="ASSUNTOS" value={stats.total_assuntos}
          icon={<BookOpen size={24} />}
          borderColor="purple.500" iconBg="purple.50" iconColor="purple.500"
          delay={0.08}
        />
        <StatCard
          label="QUESTÕES TOTAIS" value={stats.total_questoes}
          icon={<Database size={24} />}
          borderColor="brand.500" iconBg="brand.50" iconColor="brand.500"
          delay={0.16}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card borderRadius="2xl" shadow="sm" bg={cardBg}>
          <CardHeader borderBottom="1px" borderColor={borderColor} pb={3}>
            <Heading size="sm">Questões por Matéria</Heading>
          </CardHeader>
          <CardBody>
            {materiaData.length === 0 ? (
              <Flex justify="center" align="center" h="200px">
                <Text color={emptyColor} fontSize="sm">Nenhuma questão gerada ainda.</Text>
              </Flex>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={materiaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Questões']} />
                  <Bar dataKey="Questões" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card borderRadius="2xl" shadow="sm" bg={cardBg}>
          <CardHeader borderBottom="1px" borderColor={borderColor} pb={3}>
            <Heading size="sm">Distribuição por Dificuldade</Heading>
          </CardHeader>
          <CardBody>
            {dificuldadeData.length === 0 ? (
              <Flex justify="center" align="center" h="200px">
                <Text color={emptyColor} fontSize="sm">Nenhuma questão gerada ainda.</Text>
              </Flex>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={dificuldadeData}
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    isAnimationActive
                  >
                    {dificuldadeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => v} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Questões']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
