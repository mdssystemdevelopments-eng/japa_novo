import { bboxFromPoints, isClosedPolygon, Point } from './polygon';

export type SvgImportResult = {
  widthMm: number;
  heightMm: number;
  points: Point[];
  warnings: string[];
};

const VIEWBOX_RE = /viewBox=["']([^"']+)["']/i;
const WIDTH_RE = /width=["']([^"']+)["']/i;
const HEIGHT_RE = /height=["']([^"']+)["']/i;
const PATH_RE = /<path[^>]*\sd=["']([^"']+)["']/gi;

function parsePathDToPoints(d: string): Point[] {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i], y: nums[i + 1] });
  }
  return points;
}

function parseLengthMm(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  if (raw.includes('mm')) return n;
  if (raw.includes('cm')) return n * 10;
  if (raw.includes('in')) return n * 25.4;
  return n;
}

/** Importação SVG básica: extrai primeiro path e dimensões declaradas. */
export function importSvgContent(svg: string, maxBytes = 2_000_000): SvgImportResult {
  const warnings: string[] = [];
  if (Buffer.byteLength(svg, 'utf8') > maxBytes) {
    throw new Error('Arquivo SVG excede o tamanho máximo permitido.');
  }
  if (!svg.includes('<svg')) throw new Error('Conteúdo não parece ser SVG.');

  const viewBox = svg.match(VIEWBOX_RE)?.[1]?.split(/\s+/).map(Number);
  const widthAttr = svg.match(WIDTH_RE)?.[1] ?? null;
  const heightAttr = svg.match(HEIGHT_RE)?.[1] ?? null;

  let widthMm = 1000;
  let heightMm = 1000;
  if (viewBox && viewBox.length === 4) {
    widthMm = viewBox[2];
    heightMm = viewBox[3];
  }
  widthMm = parseLengthMm(widthAttr, widthMm);
  heightMm = parseLengthMm(heightAttr, heightMm);

  const paths = [...svg.matchAll(PATH_RE)];
  if (!paths.length) throw new Error('Nenhum elemento path encontrado no SVG.');

  const points = parsePathDToPoints(paths[0][1]);
  if (points.length < 3) throw new Error('Contorno com pontos insuficientes.');
  if (!isClosedPolygon(points)) {
    warnings.push('Contorno possivelmente aberto; revise antes de aprovar o molde.');
  }

  const bb = bboxFromPoints(points);
  if (bb.maxX - bb.minX > widthMm * 1.05 || bb.maxY - bb.minY > heightMm * 1.05) {
    warnings.push('Dimensões do path excedem viewBox declarado.');
  }

  return { widthMm, heightMm, points, warnings };
}
