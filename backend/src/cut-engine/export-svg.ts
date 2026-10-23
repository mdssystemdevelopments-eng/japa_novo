import { Point } from './polygon';

export function exportLayoutSvg(
  placed: { id: string; points: Point[] }[],
  materialWidthMm: number,
  materialLengthMm: number,
): string {
  const paths = placed
    .map((p) => {
      const d =
        p.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(3)} ${pt.y.toFixed(3)}`).join(' ') +
        ' Z';
      return `<path id="${p.id}" d="${d}" fill="none" stroke="#111" stroke-width="0.5"/>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${materialWidthMm}mm" height="${materialLengthMm}mm" viewBox="0 0 ${materialWidthMm} ${materialLengthMm}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  ${paths}
</svg>`;
}
