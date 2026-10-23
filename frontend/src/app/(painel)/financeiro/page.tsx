'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { formatCurrency, formatDate } from '@/lib/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function FinanceiroPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canRead = hasPermission('finance.read');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{
    items: {
      id: string;
      description: string;
      amount: string;
      dueDate: string;
      status: string;
      customer?: { name: string } | null;
    }[];
  }>({
    queryKey: ['receivables'],
    queryFn: () => api('/finance/receivables'),
    enabled: canRead,
  });

  const receive = useMutation({
    mutationFn: (id: string) =>
      api(`/finance/receivables/${id}/receive`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receivables'] }),
  });

  if (!canRead) {
    return (
      <p className="text-sm text-slate-600">Sem permissão para financeiro.</p>
    );
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Contas a receber geradas ao concluir ordens de serviço."
      />
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Vencimento</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Situação</th>
                <th className="px-4 py-3 text-left" />
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-600">
                    Nenhuma conta a receber.
                  </td>
                </tr>
              ) : (
                data?.items.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-3">{r.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3">{r.description}</td>
                    <td className="px-4 py-3">{formatDate(r.dueDate)}</td>
                    <td className="px-4 py-3">{formatCurrency(Number(r.amount))}</td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3">
                      {r.status === 'OPEN' ? (
                        <Button
                          type="button"
                          className="!px-2 !py-1 text-xs"
                          disabled={receive.isPending}
                          onClick={() => receive.mutate(r.id)}
                        >
                          Baixar
                        </Button>
                      ) : null}
                    </td>
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
