import { rotatePoints } from './geometry-transform';
import { polygonsCollide } from './collision-sat';
import {
  BBox,
  Point,
  bboxFromPoints,
  bboxHeight,
  bboxWidth,
  translatePoints,
} from './polygon';
import { NestPieceInput, NestResult, PlacedPiece } from './nesting';

function rotationsForPiece(allowed: boolean, maxDeg: number): number[] {
  if (!allowed) return [0];
  const rots = new Set<number>([0]);
  if (maxDeg >= 90) rots.add(90);
  if (maxDeg >= 180) rots.add(180);
  if (maxDeg >= 270) rots.add(270);
  return [...rots];
}

export function nestPiecesAdvanced(
  pieces: (NestPieceInput & { rotationAllowed?: boolean; maxRotationDeg?: number })[],
  materialWidthMm: number,
  spacingMm: number,
): NestResult {
  const warnings = [
    'Nesting com rotações discretas (0/90/180/270) e colisão por eixos (SAT) nos contornos.',
  ];
  let cursorX = spacingMm;
  let cursorY = spacingMm;
  let rowHeight = 0;
  let maxY = spacingMm;
  const placed: PlacedPiece[] = [];

  for (const piece of pieces) {
    const margin = piece.marginMm ?? 0;
    const rots = rotationsForPiece(piece.rotationAllowed ?? true, piece.maxRotationDeg ?? 180);
    let best: { points: Point[]; rot: number; bbox: BBox } | null = null;
    let tryX = cursorX;
    let tryY = cursorY;

    for (const rot of rots) {
      const rotated = rotatePoints(piece.points, rot);
      const w = bboxWidth(bboxFromPoints(rotated)) + margin * 2;
      const h = bboxHeight(bboxFromPoints(rotated)) + margin * 2;
      if (w > materialWidthMm) continue;

      if (tryX + w + spacingMm > materialWidthMm) {
        tryX = spacingMm;
        tryY += rowHeight + spacingMm;
        rowHeight = 0;
      }

      const bb = bboxFromPoints(rotated);
      const dx = tryX + margin - bb.minX;
      const dy = tryY + margin - bb.minY;
      const moved = translatePoints(rotated, dx, dy);
      const bbox = bboxFromPoints(moved);

      let collision = false;
      for (const other of placed) {
        if (polygonsCollide(moved, other.points, spacingMm)) {
          collision = true;
          break;
        }
      }
      if (!collision) {
        best = { points: moved, rot, bbox };
        rowHeight = Math.max(rowHeight, h);
        maxY = Math.max(maxY, bbox.maxY + spacingMm);
        cursorX = tryX + w + spacingMm;
        cursorY = tryY;
        break;
      }
    }

    if (!best) {
      throw new Error(`Não foi possível posicionar peça ${piece.id} sem colisão.`);
    }

    placed.push({
      id: piece.id,
      points: best.points,
      x: best.bbox.minX,
      y: best.bbox.minY,
      rotationDeg: best.rot,
      bbox: best.bbox,
    });
  }

  const totalArea = materialWidthMm * maxY;
  const used = placed.reduce(
    (sum, p) => sum + bboxWidth(p.bbox) * bboxHeight(p.bbox),
    0,
  );

  return {
    placed,
    materialWidthMm,
    materialLengthMm: maxY,
    utilizationPct: totalArea > 0 ? Math.round((used / totalArea) * 10000) / 100 : 0,
    warnings,
  };
}
