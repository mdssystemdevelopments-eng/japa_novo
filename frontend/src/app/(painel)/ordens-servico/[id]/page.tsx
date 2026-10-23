'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { formatCurrency } from '@/lib/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

type ChecklistItem = { key: string; label: string; done: boolean };

export default function OrdemServicoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('work_orders.manage');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{
    id: string;
    number: number;
    status: string;
    total: string;
    notes?: string | null;
    checklist?: ChecklistItem[] | null;
    customer: { name: string };
    vehicle?: { plate: string } | null;
    items: { description: string; quantity: string; unitPrice: string; total: string }[];
    materials: {
      product: { name: string };
      quantity: string;
      bobina?: { code: string } | null;
    }[];
  }>({
    queryKey: ['work-order', id],
    queryFn: () => api(`/work-orders/${id}`),
  });

  const checklist = useMemo(
    () => (Array.isArray(data?.checklist) ? data.checklist : []),
    [data?.checklist],
  );
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[] | null>(null);
  const effectiveChecklist = localChecklist ?? checklist;

  const { data: products } = useQuery<{
    items: { id: string; name: string; unitOfMeasure: string }[];
  }>({
    queryKey: ['products-picker'],
    queryFn: () => api('/products?pageSize=100'),
    enabled: canManage && data?.status === 'IN_PROGRESS',
  });

  const [matProductId, setMatProductId] = useState('');
  const [matQty, setMatQty] = useState('1');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['work-order', id] });
    qc.invalidateQueries({ queryKey: ['work-orders'] });
  };

  const start = useMutation({
    mutationFn: () => api(`/work-orders/${id}/start`, { method: 'POST' }),
    onSuccess: invalidate,
  });

  const saveChecklist = useMutation({
    mutationFn: () =>
      api(`/work-orders/${id}/checklist`, {
        method: 'PATCH',
        body: JSON.stringify({ checklist: effectiveChecklist }),
      }),
    onSuccess: () => {
      setLocalChecklist(null);
      invalidate();
    },
  });

  const complete = useMutation({
    mutationFn: () =>
      api(`/work-orders/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          materials: [
            {
              productId: matProductId,
              quantity: Number(matQty),
            },
          ],
        }),
      }),
    onSuccess: invalidate,
  });

  if (isLoading || !data) {
    return <p className="text-sm text-slate-600">Carregando ordem de serviço...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`OS ${data.number}`}
        description={`${data.customer.name}${data.vehicle ? ` · ${data.vehicle.plate}` : ''}`}
        action={
          <Link href="/ordens-servico" className="text-sm text-slate-600 underline">
            Voltar
          </Link>
        }
      />

      <div className="rounded-lg border bg-white p-4 text-sm">
        <p>
          <span className="text-slate-500">Situação:</span> {data.status}
        </p>
        <p>
          <span className="text-slate-500">Total:</span>{' '}
          {formatCurrency(Number(data.total))}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-medium">Itens</h2>
        <ul className="space-y-1 text-sm">
          {data.items.map((item, i) => (
            <li key={i}>
              {item.description} — {formatCurrency(Number(item.total))}
            </li>
          ))}
        </ul>
      </div>

      {canManage && (data.status === 'QUOTED' || data.status === 'SCHEDULED') ? (
        <div>
          {start.isError ? (
            <Alert>{start.error instanceof Error ? start.error.message : 'Erro.'}</Alert>
          ) : null}
          <Button type="button" onClick={() => start.mutate()} disabled={start.isPending}>
            Iniciar execução
          </Button>
        </div>
      ) : null}

      {effectiveChecklist.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-medium">Checklist</h2>
          <ul className="space-y-2 text-sm">
            {effectiveChecklist.map((c, idx) => (
              <li key={c.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.done}
                  disabled={!canManage || data.status === 'COMPLETED'}
                  onChange={(e) => {
                    const next = [...effectiveChecklist];
                    next[idx] = { ...c, done: e.target.checked };
                    setLocalChecklist(next);
                  }}
                />
                {c.label}
              </li>
            ))}
          </ul>
          {canManage && data.status !== 'COMPLETED' ? (
            <Button
              type="button"
              className="mt-3"
              onClick={() => saveChecklist.mutate()}
              disabled={saveChecklist.isPending}
            >
              Salvar checklist
            </Button>
          ) : null}
        </div>
      ) : null}

      {canManage && data.status === 'IN_PROGRESS' ? (
        <div className="max-w-md space-y-2 rounded-lg border bg-white p-4">
          <h2 className="font-medium">Concluir e baixar estoque</h2>
          <label className="block text-sm">
            Produto
            <select
              className="mt-1 w-full rounded border px-2 py-2"
              value={matProductId}
              onChange={(e) => setMatProductId(e.target.value)}
            >
              <option value="">Selecione</option>
              {products?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Quantidade"
            value={matQty}
            onChange={(e) => setMatQty(e.target.value)}
          />
          {complete.isError ? (
            <Alert>
              {complete.error instanceof Error ? complete.error.message : 'Erro.'}
            </Alert>
          ) : null}
          <Button
            type="button"
            onClick={() => complete.mutate()}
            disabled={complete.isPending || !matProductId}
          >
            Concluir OS
          </Button>
        </div>
      ) : null}

      {data.materials.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-medium">Materiais utilizados</h2>
          <ul className="text-sm">
            {data.materials.map((m, i) => (
              <li key={i}>
                {m.product.name} — {m.quantity}
                {m.bobina ? ` (bobina ${m.bobina.code})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
