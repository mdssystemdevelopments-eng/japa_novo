import { exportLayoutDxf } from './dxf-export';

describe('exportLayoutDxf', () => {
  it('inclui polilinha fechada e borda do material em mm', () => {
    const placed = [
      {
        id: 'a',
        points: [
          { x: 10, y: 10 },
          { x: 110, y: 10 },
          { x: 110, y: 60 },
          { x: 10, y: 60 },
        ],
      },
    ];
    const dxf = exportLayoutDxf(placed, 1500, 800);
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('CUT');
    expect(dxf).toContain('MATERIAL');
    expect(dxf).toContain('10.0000');
  });
});
