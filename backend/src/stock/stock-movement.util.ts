import { BadRequestException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';

const INFLOW_TYPES: StockMovementType[] = [
  StockMovementType.GOODS_RECEIPT,
  StockMovementType.INVENTORY_ADJUST,
];

const OUTFLOW_TYPES: StockMovementType[] = [
  StockMovementType.WORK_ORDER_ISSUE,
  StockMovementType.MANUAL_OUT,
  StockMovementType.SUPPLIER_RETURN,
  StockMovementType.LOSS,
  StockMovementType.DAMAGE,
  StockMovementType.TRANSFER,
];

export function resolveStockDelta(type: StockMovementType, quantity: number) {
  if (type === StockMovementType.INVENTORY_ADJUST) {
    return quantity;
  }
  if (quantity <= 0) {
    throw new BadRequestException('Informe quantidade maior que zero.');
  }
  if (INFLOW_TYPES.includes(type)) return quantity;
  if (OUTFLOW_TYPES.includes(type)) return -quantity;
  throw new BadRequestException('Tipo de movimentação inválido.');
}
