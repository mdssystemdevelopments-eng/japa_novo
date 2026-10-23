import { bboxFromPoints, isClosedPolygon, rectsOverlap } from './polygon';
import { nestPiecesShelf } from './nesting';

describe('cut-engine polygon', () => {
  it('detecta contorno fechado', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ];
    expect(isClosedPolygon(square)).toBe(true);
    expect(bboxFromPoints(square).maxX).toBe(10);
  });

  it('detecta colisão entre caixas', () => {
    const a = bboxFromPoints([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
    const b = bboxFromPoints([
      { x: 5, y: 5 },
      { x: 15, y: 15 },
    ]);
    expect(rectsOverlap(a, b, 0)).toBe(true);
  });

  it('posiciona peças dentro da largura', () => {
    const piece = {
      id: 'p1',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
        { x: 0, y: 0 },
      ],
      marginMm: 2,
    };
    const result = nestPiecesShelf([piece], 1500, 5);
    expect(result.placed).toHaveLength(1);
    expect(result.materialLengthMm).toBeGreaterThan(50);
  });
});
