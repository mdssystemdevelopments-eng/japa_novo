import { BBox, bboxFromPoints, bboxHeight, bboxWidth, Point, rectsOverlap, translatePoints } from './polygon';

export type NestPieceInput = {
  id: string;
  points: Point[];
  marginMm: number;
  rotationDeg?: number;
};

export type PlacedPiece = {
  id: string;
  points: Point[];
  x: number;
  y: number;
  rotationDeg: number;
  bbox: BBox;
};

export type NestResult = {
  placed: PlacedPiece[];
  materialWidthMm: number;
  materialLengthMm: number;
  utilizationPct: number;
  warnings: string[];
};

/** Nesting por caixas delimitadoras + margem; validação final usa bbox (não contorno exato). */
export function nestPiecesShelf(
  pieces: NestPieceInput[],
  materialWidthMm: number,
  spacingMm: number,
): NestResult {
  const warnings: string[] = [
    'O nesting usa caixas delimitadoras; valide fisicamente antes do corte.',
  ];
  if (materialWidthMm <= 0) throw new Error('Largura do material inválida.');

  let cursorX = spacingMm;
  let cursorY = spacingMm;
  let rowHeight = 0;
  let maxX = 0;
  let maxY = 0;
  const placed: PlacedPiece[] = [];

  for (const piece of pieces) {
    const margin = piece.marginMm ?? 0;
    const base = bboxFromPoints(piece.points);
    const w = bboxWidth(base) + margin * 2;
    const h = bboxHeight(base) + margin * 2;

    if (w > materialWidthMm) {
      throw new Error(`Peça ${piece.id} excede a largura útil do material.`);
    }

    if (cursorX + w + spacingMm > materialWidthMm) {
      cursorX = spacingMm;
      cursorY += rowHeight + spacingMm;
      rowHeight = 0;
    }

    const dx = cursorX + margin - base.minX;
    const dy = cursorY + margin - base.minY;
    const moved = translatePoints(piece.points, dx, dy);
    const bbox = bboxFromPoints(moved);

    for (const other of placed) {
      if (rectsOverlap(bbox, other.bbox, spacingMm)) {
        throw new Error(`Colisão detectada ao posicionar peça ${piece.id}.`);
      }
    }

    placed.push({
      id: piece.id,
      points: moved,
      x: dx,
      y: dy,
      rotationDeg: piece.rotationDeg ?? 0,
      bbox,
    });

    cursorX += w + spacingMm;
    rowHeight = Math.max(rowHeight, h);
    maxX = Math.max(maxX, bbox.maxX + spacingMm);
    maxY = Math.max(maxY, bbox.maxY + spacingMm);
  }

  const totalArea = materialWidthMm * maxY;
  const used = placed.reduce(
    (sum, p) => sum + bboxWidth(p.bbox) * bboxHeight(p.bbox),
    0,
  );
  const utilizationPct = totalArea > 0 ? (used / totalArea) * 100 : 0;

  return {
    placed,
    materialWidthMm,
    materialLengthMm: maxY,
    utilizationPct: Math.round(utilizationPct * 100) / 100,
    warnings,
  };
}
