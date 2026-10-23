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
import { useState } from 'react';

export default function OrcamentosPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('quotes.manage');
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  const { data: customers } = useQuery<{ items: { id: string; name: string }[] }>({
    queryKey: ['customers-picker'],
    queryFn: () => api('/customers?pageSize=100'),
  });

  const { data, isLoading } = useQuery<{
    items: {
      id: string;
      number: number;
      status: string;
      total: string;
      customer: { name: string };
    }[];
  }>({
    queryKey: ['quotes'],
    queryFn: () => api('/quotes'),
  });

  const approve = useMutation({
    mutationFn: (quoteId: string) =>
      api(`/quotes/${quoteId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const convert = useMutation({
    mutationFn: (quoteId: string) =>
      api(`/quotes/${quoteId}/convert`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });

  const create = useMutation({
    mutationFn: () =>
      api('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          items: [
            {
              description: itemDesc,
              quantity: 1,
              unitPrice: Number(itemPrice),
            },
          ],
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      setShowForm(false);
    },
  });

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        description="Elaboração e acompanhamento de propostas."
        action={
          canManage ? (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Fechar' : 'Novo orçamento'}
            </Button>
          ) : null
        }
      />
      {showForm && canManage ? (
        <div className="mb-6 max-w-md space-y-2 rounded-lg border bg-white p-4">
          <label className="text-sm">
            Cliente
            <select
              className="mt-1 w-full rounded border px-2 py-2"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Selecione</option>
              {customers?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Descrição do serviço"
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
          />
          <Input
            label="Valor"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
          />
          {create.isError ? (
            <Alert>
              {create.error instanceof Error ? create.error.message : 'Erro.'}
            </Alert>
          ) : null}
          <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
            Salvar rascunho
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Situação</th>
                <th className="px-4 py-3 text-left">Total</th>
                {canManage ? <th className="px-4 py-3 text-left">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-600">
                    Nenhum orçamento cadastrado.
                  </td>
                </tr>
              ) : (
                data?.items.map((q) => (
                  <tr key={q.id} className="border-b">
                    <td className="px-4 py-3">{q.number}</td>
                    <td className="px-4 py-3">{q.customer.name}</td>
                    <td className="px-4 py-3">{q.status}</td>
                    <td className="px-4 py-3">{formatCurrency(Number(q.total))}</td>
                    {canManage ? (
                      <td className="space-x-2 px-4 py-3">
                        {q.status !== 'APPROVED' ? (
                          <Button
                            type="button"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => approve.mutate(q.id)}
                            disabled={approve.isPending}
                          >
                            Aprovar
                          </Button>
                        ) : null}
                        {q.status === 'APPROVED' ? (
                          <Button
                            type="button"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => convert.mutate(q.id)}
                            disabled={convert.isPending}
                          >
                            Gerar OS
                          </Button>
                        ) : null}
                        {convert.isSuccess ? (
                          <Link href="/ordens-servico" className="text-xs underline">
                            Ver OS
                          </Link>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
