import { Point } from './polygon';

/** HPGL/2 simplificado — coordenadas em mm (escala configurável no plotter). */
export function exportLayoutHpgl(placed: { id: string; points: Point[] }[]): string {
  const parts: string[] = ['IN;', 'SP1;'];
  for (const piece of placed) {
    if (piece.points.length < 2) continue;
    const first = piece.points[0];
    parts.push(`PU${Math.round(first.x)},${Math.round(first.y)};`);
    parts.push('PD');
    for (let i = 1; i < piece.points.length; i++) {
      const p = piece.points[i];
      parts.push(`${Math.round(p.x)},${Math.round(p.y)},`);
    }
    parts.push(';');
  }
  parts.push('PU0,0;SP0;');
  return parts.join('');
}
