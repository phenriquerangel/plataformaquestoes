import React from 'react';
import {
  Box, SimpleGrid, Card, CardBody, CardHeader,
  Heading, HStack, VStack, Stat, StatLabel, StatNumber,
  Text, Flex,
} from '@chakra-ui/react';
import { LayoutGrid, BookOpen, Database, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const DIFF_COLORS = { Facil: '#48BB78', Media: '#ECC94B', Dificil: '#FC8181' };
const DIFF_LABELS = { Facil: 'Fácil', Media: 'Média', Dificil: 'Difícil' };
const BAR_COLOR = '#6366F1';

function StatCard({ label, value, icon, borderColor, iconBg, iconColor }) {
  return (
    <Card borderRadius="2xl" shadow="sm" borderLeft="4px solid" borderColor={borderColor}>
      <CardBody>
        <Flex align="center" justify="space-between">
          <Stat>
            <StatLabel color="gray.500" fontWeight="bold" fontSize="xs">{label}</StatLabel>
            <StatNumber fontSize="3xl" color="gray.800">{value}</StatNumber>
          </Stat>
          <Box p={3} bg={iconBg} color={iconColor} borderRadius="xl">{icon}</Box>
        </Flex>
      </CardBody>
    </Card>
  );
}

export function Dashboard({ stats }) {
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

      {/* Cards de totais */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <StatCard
          label="MATÉRIAS" value={stats.total_materias}
          icon={<LayoutGrid size={24} />}
          borderColor="blue.500" iconBg="blue.50" iconColor="blue.500"
        />
        <StatCard
          label="ASSUNTOS" value={stats.total_assuntos}
          icon={<BookOpen size={24} />}
          borderColor="purple.500" iconBg="purple.50" iconColor="purple.500"
        />
        <StatCard
          label="QUESTÕES TOTAIS" value={stats.total_questoes}
          icon={<Database size={24} />}
          borderColor="brand.500" iconBg="brand.50" iconColor="brand.500"
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Gráfico por Matéria */}
        <Card borderRadius="2xl" shadow="sm">
          <CardHeader borderBottom="1px" borderColor="gray.100" pb={3}>
            <Heading size="sm">Questões por Matéria</Heading>
          </CardHeader>
          <CardBody>
            {materiaData.length === 0 ? (
              <Flex justify="center" align="center" h="200px">
                <Text color="gray.400" fontSize="sm">Nenhuma questão gerada ainda.</Text>
              </Flex>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={materiaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                    formatter={(v) => [v, 'Questões']}
                  />
                  <Bar dataKey="Questões" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Gráfico por Dificuldade */}
        <Card borderRadius="2xl" shadow="sm">
          <CardHeader borderBottom="1px" borderColor="gray.100" pb={3}>
            <Heading size="sm">Distribuição por Dificuldade</Heading>
          </CardHeader>
          <CardBody>
            {dificuldadeData.length === 0 ? (
              <Flex justify="center" align="center" h="200px">
                <Text color="gray.400" fontSize="sm">Nenhuma questão gerada ainda.</Text>
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
                  >
                    {dificuldadeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => v} />
                  <Tooltip formatter={(v) => [v, 'Questões']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
