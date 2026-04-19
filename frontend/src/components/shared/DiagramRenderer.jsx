import React from 'react';

function rightAngleMarker({ vertice, v1, v2, tamanho = 12, cor = '#2563eb' }, i) {
  const [vx, vy] = vertice;
  const d1 = Math.hypot(v1[0] - vx, v1[1] - vy);
  const d2 = Math.hypot(v2[0] - vx, v2[1] - vy);
  if (d1 === 0 || d2 === 0) return null;
  const u1 = [(v1[0] - vx) / d1 * tamanho, (v1[1] - vy) / d1 * tamanho];
  const u2 = [(v2[0] - vx) / d2 * tamanho, (v2[1] - vy) / d2 * tamanho];
  const p1 = [vx + u1[0], vy + u1[1]];
  const p2 = [vx + u1[0] + u2[0], vy + u1[1] + u2[1]];
  const p3 = [vx + u2[0], vy + u2[1]];
  return (
    <polyline key={i}
      points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`}
      fill="none" stroke={cor} strokeWidth={1.5} />
  );
}

function renderElemento(el, i) {
  switch (el.tipo) {
    case 'poligono':
      return (
        <polygon key={i}
          points={el.pontos.map(([x, y]) => `${x},${y}`).join(' ')}
          fill={el.preenchimento ?? '#eff6ff'}
          stroke={el.borda ?? '#2563eb'}
          strokeWidth={el.espessura ?? 2} />
      );
    case 'circulo':
      return (
        <circle key={i}
          cx={el.cx} cy={el.cy} r={el.r}
          fill={el.preenchimento ?? '#eff6ff'}
          stroke={el.borda ?? '#2563eb'}
          strokeWidth={el.espessura ?? 2} />
      );
    case 'linha':
      return (
        <line key={i}
          x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
          stroke={el.cor ?? '#64748b'}
          strokeWidth={el.espessura ?? 1.5} />
      );
    case 'angulo_reto':
      return rightAngleMarker(el, i);
    case 'texto':
      return (
        <text key={i}
          x={el.x} y={el.y}
          textAnchor={el.ancora ?? 'middle'}
          fontSize={el.tamanho ?? 13}
          fill={el.cor ?? '#1e293b'}
          fontFamily="sans-serif">
          {el.conteudo}
        </text>
      );
    default:
      return null;
  }
}

export function DiagramRenderer({ diagrama }) {
  if (!diagrama?.elementos?.length) return null;
  return (
    <svg viewBox={diagrama.viewBox ?? '0 0 220 180'}
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}>
      {diagrama.elementos.map((el, i) => renderElemento(el, i))}
    </svg>
  );
}
