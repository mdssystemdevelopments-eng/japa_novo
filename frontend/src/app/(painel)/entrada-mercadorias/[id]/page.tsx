'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EntradaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('goods_receipt.manage');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{
    status: string;
    documentNumber: string | null;
    items: {
      lineNumber: number;
      description: string;
      quantity: string;
      productId: string | null;
    }[];
  }>({
    queryKey: ['goods-receipt', id],
    queryFn: () => api(`/goods-receipts/${id}`),
  });

  const confirm = useMutation({
    mutationFn: () => api(`/goods-receipts/${id}/confirm`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goods-receipt', id] });
      qc.invalidateQueries({ queryKey: ['goods-receipts'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });

  if (isLoading) return <p className="text-sm text-slate-600">Carregando...</p>;
  if (isError || !data) return <Alert>Entrada não encontrada.</Alert>;

  return (
    <div>
      <PageHeader
        title={`Entrada ${data.documentNumber ?? id.slice(0, 8)}`}
        description={`Situação: ${data.status}`}
        action={
          <Link href="/entrada-mercadorias" className="text-sm underline">
            Voltar
          </Link>
        }
      />
      <ul className="divide-y rounded-lg border bg-white text-sm">
        {data.items.map((item) => (
          <li key={item.lineNumber} className="flex justify-between px-4 py-3">
            <span>
              {item.lineNumber}. {item.description}
            </span>
            <span>
              {Number(item.quantity)} ·{' '}
              {item.productId ? 'Produto vinculado' : 'Sem produto'}
            </span>
          </li>
        ))}
      </ul>
      {data.status === 'DRAFT' && canManage ? (
        <Button
          type="button"
          className="mt-4"
          onClick={() => confirm.mutate()}
          disabled={confirm.isPending}
        >
          Confirmar entrada e atualizar estoque
        </Button>
      ) : null}
      {confirm.isError ? (
        <div className="mt-2">
          <Alert>
            {confirm.error instanceof Error
              ? confirm.error.message
              : 'Erro ao confirmar.'}
          </Alert>
        </div>
      ) : null}
      {confirm.isSuccess ? (
        <Alert variant="success">Entrada confirmada.</Alert>
      ) : null}
    </div>
  );
}
