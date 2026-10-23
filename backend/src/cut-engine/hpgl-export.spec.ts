import { exportLayoutHpgl } from './hpgl-export';

describe('exportLayoutHpgl', () => {
  it('gera comandos PU/PD com coordenadas arredondadas', () => {
    const hpgl = exportLayoutHpgl([
      {
        id: 'p1',
        points: [
          { x: 0, y: 0 },
          { x: 100.4, y: 50.6 },
          { x: 0, y: 0 },
        ],
      },
    ]);
    expect(hpgl).toMatch(/^IN;/);
    expect(hpgl).toContain('PU0,0;');
    expect(hpgl).toContain('100,51');
    expect(hpgl).toContain('SP0;');
  });
});
