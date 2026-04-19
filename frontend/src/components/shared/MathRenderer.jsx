import React from 'react';
import { MathJax } from 'better-react-mathjax';
import { Box } from '@chakra-ui/react';

/**
 * Componente que renderiza texto e expressões LaTeX usando MathJax, com base na estrutura de 'parts'.
 * Inclui um fallback para dados antigos que eram apenas strings.
 * @param {{ parts: Array<{type: string, content: string}> | string, highlight?: string }} props
 */
const MathRenderer = ({ parts, highlight }) => {
  if (!parts) {
    return null;
  }

  // Fallback para dados antigos que ainda são strings.
  if (typeof parts === 'string') {
    // Para dados antigos, fazemos uma conversão simples.
    // A lógica complexa de reparo é removida, pois a nova geração de dados deve ser confiável.
    const regex = /(\[math\][\s\S]*?\[\/math\])/g;
    const stringParts = parts.split(regex);
    parts = stringParts.map(part => {
      if (part.match(regex)) {
        return {
          type: 'latex',
          content: part.substring(6, part.length - 7) // Remove [math] e [/math]
        };
      }
      return { type: 'text', content: part };
    });
  }

  const unifiedParts = Array.isArray(parts) ? parts : [];

  return (
    <Box as="span" whiteSpace="pre-wrap">
      {unifiedParts.map((part, index) => {
        if (!part.content) return null;

        if (part.type === 'latex') {
          return <MathJax key={index} inline>{`\\(${part.content}\\)`}</MathJax>;
        }

        // É do tipo 'text', aplica o highlight se necessário
        if (!highlight || highlight.trim() === '') {
          return <span key={index}>{part.content}</span>;
        }

        const highlightParts = part.content.split(new RegExp(`(${highlight})`, 'gi'));
        return (
          <span key={index}>
            {highlightParts.map((hPart, hIndex) =>
              hPart.toLowerCase() === highlight.toLowerCase() ? (
                <Box as="mark" key={hIndex} bg="yellow.200" borderRadius="md" px="1">{hPart}</Box>
              ) : (
                <span key={hIndex}>{hPart}</span>
              )
            )}
          </span>
        );
      })}
    </Box>
  );
};

export default MathRenderer;