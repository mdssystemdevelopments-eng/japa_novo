export type Point = { x: number; y: number };

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

export function bboxFromPoints(points: Point[]): BBox {
  if (!points.length) throw new Error('Contorno vazio.');
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export function bboxWidth(b: BBox): number {
  return b.maxX - b.minX;
}

export function bboxHeight(b: BBox): number {
  return b.maxY - b.minY;
}

export function isClosedPolygon(points: Point[], tolerance = 0.01): boolean {
  if (points.length < 3) return false;
  const a = points[0];
  const b = points[points.length - 1];
  return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
}

export function translatePoints(points: Point[], dx: number, dy: number): Point[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function rectsOverlap(a: BBox, b: BBox, gap: number): boolean {
  return !(
    a.maxX + gap <= b.minX ||
    b.maxX + gap <= a.minX ||
    a.maxY + gap <= b.minY ||
    b.maxY + gap <= a.minY
  );
}
