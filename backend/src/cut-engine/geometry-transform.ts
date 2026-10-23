import { Point } from './polygon';

export function rotatePoints(points: Point[], degrees: number, origin?: Point): Point[] {
  if (degrees === 0) return points.map((p) => ({ ...p }));
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  return points.map((p) => {
    const x = p.x - ox;
    const y = p.y - oy;
    return {
      x: ox + x * cos - y * sin,
      y: oy + x * sin + y * cos,
    };
  });
}
