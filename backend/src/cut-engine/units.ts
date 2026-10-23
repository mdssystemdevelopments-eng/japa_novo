export const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm;
}

export function pxToMm(px: number, pxPerMm: number): number {
  if (pxPerMm <= 0) throw new Error('pxPerMm inválido.');
  return px / pxPerMm;
}

export function parseSvgLengthToMm(raw: string, viewBoxWidth?: number): number {
  const v = raw.trim();
  const num = parseFloat(v);
  if (Number.isNaN(num)) throw new Error(`Comprimento SVG inválido: ${raw}`);
  if (v.endsWith('mm')) return num;
  if (v.endsWith('cm')) return num * 10;
  if (v.endsWith('in')) return num * MM_PER_INCH;
  if (v.endsWith('px') && viewBoxWidth) return num * (viewBoxWidth / viewBoxWidth);
  return num;
}
