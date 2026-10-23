import { nestPiecesAdvanced } from './nesting-advanced';

describe('nestPiecesAdvanced', () => {
  it('posiciona retângulos com rotação quando necessário', () => {
    const tall = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 200 },
      { x: 0, y: 200 },
    ];
    const wide = [
      { x: 0, y: 0 },
      { x: 180, y: 0 },
      { x: 180, y: 40 },
      { x: 0, y: 40 },
    ];
    const result = nestPiecesAdvanced(
      [
        { id: '1', points: tall, marginMm: 0, rotationAllowed: true, maxRotationDeg: 90 },
        { id: '2', points: wide, marginMm: 0, rotationAllowed: true, maxRotationDeg: 90 },
      ],
      500,
      5,
    );
    expect(result.placed).toHaveLength(2);
    expect(result.utilizationPct).toBeGreaterThan(0);
  });
});
