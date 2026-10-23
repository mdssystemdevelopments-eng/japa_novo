import { Point, bboxFromPoints, rectsOverlap } from './polygon';

function projectPolygon(axis: Point, polygon: Point[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of polygon) {
    const proj = p.x * axis.x + p.y * axis.y;
    min = Math.min(min, proj);
    max = Math.max(max, proj);
  }
  return { min, max };
}

function overlap1d(a: { min: number; max: number }, b: { min: number; max: number }, gap: number): boolean {
  return !(a.max + gap < b.min || b.max + gap < a.min);
}

function axesFromPolygon(polygon: Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
    const normal = { x: -edge.y, y: edge.x };
    const len = Math.hypot(normal.x, normal.y) || 1;
    axes.push({ x: normal.x / len, y: normal.y / len });
  }
  return axes;
}

/** SAT para polígonos convexos; se concavo, usa bbox. */
export function polygonsCollide(a: Point[], b: Point[], gap: number): boolean {
  if (a.length < 3 || b.length < 3) {
    return rectsOverlap(bboxFromPoints(a), bboxFromPoints(b), gap);
  }
  const axes = [...axesFromPolygon(a), ...axesFromPolygon(b)];
  for (const axis of axes) {
    const pa = projectPolygon(axis, a);
    const pb = projectPolygon(axis, b);
    if (!overlap1d(pa, pb, gap)) return false;
  }
  return true;
}
