import { StockMovementType } from '@prisma/client';
import { resolveStockDelta } from './stock-movement.util';

describe('resolveStockDelta', () => {
  it('entrada aumenta estoque', () => {
    expect(resolveStockDelta(StockMovementType.GOODS_RECEIPT, 10)).toBe(10);
  });

  it('saída reduz estoque', () => {
    expect(resolveStockDelta(StockMovementType.MANUAL_OUT, 4)).toBe(-4);
  });

  it('ajuste aceita valor negativo', () => {
    expect(resolveStockDelta(StockMovementType.INVENTORY_ADJUST, -1)).toBe(-1);
  });
});
