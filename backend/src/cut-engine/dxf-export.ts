import { Point } from './polygon';

/** DXF R12 mínimo — polilinhas em mm (1 unidade = 1 mm). */
export function exportLayoutDxf(
  placed: { id: string; points: Point[] }[],
  materialWidthMm: number,
  materialLengthMm: number,
): string {
  const lines: string[] = [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$INSUNITS',
    '70',
    '4',
    '0',
    'ENDSEC',
    '0',
    'SECTION',
    '2',
    'ENTITIES',
  ];

  for (const piece of placed) {
    if (piece.points.length < 2) continue;
    lines.push('0', 'LWPOLYLINE', '8', 'CUT', '90', String(piece.points.length), '70', '1');
    for (const p of piece.points) {
      lines.push('10', p.x.toFixed(4), '20', p.y.toFixed(4));
    }
  }

  lines.push(
    '0',
    'LWPOLYLINE',
    '8',
    'MATERIAL',
    '90',
    '4',
    '70',
    '1',
    '10',
    '0',
    '20',
    '0',
    '10',
    materialWidthMm.toFixed(4),
    '20',
    '0',
    '10',
    materialWidthMm.toFixed(4),
    '20',
    materialLengthMm.toFixed(4),
    '10',
    '0',
    '20',
    materialLengthMm.toFixed(4),
    '0',
    'ENDSEC',
    '0',
    'EOF',
  );

  return lines.join('\n');
}
