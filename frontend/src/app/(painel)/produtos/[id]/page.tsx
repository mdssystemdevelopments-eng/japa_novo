'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

type Bobina = {
  id: string;
  code: string;
  currentMeters: string;
  initialMeters: string;
  lot: string | null;
};

export default function ProdutoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('products.manage');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{
    name: string;
    internalCode: string;
    unitOfMeasure: string;
    stockQty: string;
    bobinas: Bobina[];
  }>({
    queryKey: ['product', id],
    queryFn: () => api(`/products/${id}`),
  });

  const [bobina, setBobina] = useState({
    code: '',
    initialMeters: '',
    lot: '',
  });

  const addBobina = useMutation({
    mutationFn: () =>
      api(`/products/${id}/bobinas`, {
        method: 'POST',
        body: JSON.stringify({
          code: bobina.code,
          initialMeters: Number(bobina.initialMeters),
          lot: bobina.lot || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      setBobina({ code: '', initialMeters: '', lot: '' });
    },
  });

  if (isLoading) return <p className="text-sm text-slate-600">Carregando...</p>;
  if (isError || !data) return <Alert>Produto não encontrado.</Alert>;

  return (
    <div>
      <PageHeader
        title={data.name}
        description={`Código ${data.internalCode} · Estoque ${Number(data.stockQty)} ${data.unitOfMeasure}`}
        action={
          <Link href="/produtos" className="text-sm underline text-slate-600">
            Voltar
          </Link>
        }
      />

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">Bobinas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Metragem rastreada por bobina. Produtos em metros podem receber bobinas
          individuais.
        </p>
        {data.unitOfMeasure === 'M' && canManage ? (
          <div className="mt-4 grid max-w-lg gap-2 sm:grid-cols-2">
            <Input
              label="Código da bobina"
              value={bobina.code}
              onChange={(e) =>
                setBobina((b) => ({ ...b, code: e.target.value }))
              }
            />
            <Input
              label="Metragem inicial"
              value={bobina.initialMeters}
              onChange={(e) =>
                setBobina((b) => ({ ...b, initialMeters: e.target.value }))
              }
            />
            <Input
              label="Lote"
              value={bobina.lot}
              onChange={(e) => setBobina((b) => ({ ...b, lot: e.target.value }))}
            />
            {addBobina.isError ? (
              <div className="sm:col-span-2">
                <Alert>
                  {addBobina.error instanceof Error
                    ? addBobina.error.message
                    : 'Erro ao registrar bobina.'}
                </Alert>
              </div>
            ) : null}
            <Button
              type="button"
              className="sm:col-span-2"
              onClick={() => addBobina.mutate()}
              disabled={addBobina.isPending}
            >
              Registrar bobina
            </Button>
          </div>
        ) : null}
        <ul className="mt-4 divide-y border-t">
          {data.bobinas.length === 0 ? (
            <li className="py-3 text-sm text-slate-600">
              Nenhuma bobina registrada.
            </li>
          ) : (
            data.bobinas.map((b) => (
              <li key={b.id} className="flex justify-between py-2 text-sm">
                <span>{b.code}</span>
                <span>
                  {Number(b.currentMeters)} m de {Number(b.initialMeters)} m
                  {b.lot ? ` · Lote ${b.lot}` : ''}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
