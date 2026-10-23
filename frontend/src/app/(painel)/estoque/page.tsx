'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { formatDateTime } from '@/lib/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const MOVEMENT_TYPES = [
  { value: 'GOODS_RECEIPT', label: 'Entrada de mercadorias' },
  { value: 'MANUAL_OUT', label: 'Saída manual autorizada' },
  { value: 'LOSS', label: 'Perda' },
  { value: 'INVENTORY_ADJUST', label: 'Ajuste de inventário' },
] as const;

type Movement = {
  id: string;
  type: string;
  quantity: string;
  reason: string;
  occurredAt: string;
  product: { name: string; internalCode: string; unitOfMeasure: string };
};

export default function EstoquePage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('stock.manage');
  const qc = useQueryClient();

  const { data: products } = useQuery<{ items: { id: string; name: string }[] }>(
    {
      queryKey: ['products-picker'],
      queryFn: () => api('/products?pageSize=100'),
    },
  );

  const { data, isLoading, isError } = useQuery<{ items: Movement[] }>({
    queryKey: ['stock-movements'],
    queryFn: () => api('/stock/movements?pageSize=30'),
  });

  const [form, setForm] = useState({
    productId: '',
    type: 'GOODS_RECEIPT',
    quantity: '',
    reason: '',
  });

  const create = useMutation({
    mutationFn: () => {
      const qty = Number(form.quantity);
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now());
      const body: Record<string, unknown> = {
        productId: form.productId,
        type: form.type,
        quantity:
          form.type === 'INVENTORY_ADJUST' ? qty : Math.abs(qty),
        reason: form.reason,
        idempotencyKey,
      };
      return api('/stock/movements', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setForm((f) => ({ ...f, quantity: '', reason: '' }));
    },
  });

  return (
    <div>
      <PageHeader
        title="Controle de estoque"
        description="Movimentações registradas com responsável e motivo."
      />

      {canManage ? (
        <div className="mb-6 max-w-xl space-y-3 rounded-lg border bg-white p-4">
          <label className="block text-sm">
            Produto
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
              value={form.productId}
              onChange={(e) =>
                setForm((f) => ({ ...f, productId: e.target.value }))
              }
            >
              <option value="">Selecione</option>
              {products?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Tipo
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value }))
              }
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label={
              form.type === 'INVENTORY_ADJUST'
                ? 'Quantidade (use negativo para reduzir)'
                : 'Quantidade'
            }
            value={form.quantity}
            onChange={(e) =>
              setForm((f) => ({ ...f, quantity: e.target.value }))
            }
          />
          <Input
            label="Motivo"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
          {create.isError ? (
            <Alert>
              {create.error instanceof Error
                ? create.error.message
                : 'Erro na movimentação.'}
            </Alert>
          ) : null}
          <Button
            type="button"
            onClick={() => create.mutate()}
            disabled={
              create.isPending ||
              !form.productId ||
              !form.reason.trim() ||
              !form.quantity
            }
          >
            Registrar movimentação
          </Button>
        </div>
      ) : null}

      <h2 className="text-sm font-semibold text-slate-900">
        Histórico de movimentações
      </h2>
      {isError ? <Alert>Erro ao carregar movimentações.</Alert> : null}
      {isLoading ? (
        <p className="mt-2 text-sm text-slate-600">Carregando...</p>
      ) : (
        <ul className="mt-3 divide-y rounded-lg border bg-white">
          {data?.items.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-600">
              Nenhuma movimentação. Registre entradas ou ajustes acima.
            </li>
          ) : (
            data?.items.map((m) => (
              <li key={m.id} className="px-4 py-3 text-sm">
                <p className="font-medium">
                  {m.product.name} ({m.product.internalCode})
                </p>
                <p className="text-slate-600">
                  {m.type} · {Number(m.quantity)} {m.product.unitOfMeasure} ·{' '}
                  {formatDateTime(m.occurredAt)}
                </p>
                <p className="text-slate-600">{m.reason}</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
