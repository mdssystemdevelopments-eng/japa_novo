'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { formatCurrency } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const STATUS_LABEL: Record<string, string> = {
  QUOTED: 'Orçada',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em execução',
  COMPLETED: 'Concluída',
  INVOICED: 'Faturada',
  PAID: 'Paga',
  ARCHIVED: 'Arquivada',
  CANCELLED: 'Cancelada',
};

export default function OrdensServicoPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('work_orders.manage');

  const { data, isLoading } = useQuery<{
    items: {
      id: string;
      number: number;
      status: string;
      total: string;
      customer: { name: string };
      vehicle?: { plate: string; brand: string; model: string } | null;
    }[];
  }>({
    queryKey: ['work-orders'],
    queryFn: () => api('/work-orders'),
  });

  return (
    <div>
      <PageHeader
        title="Ordens de serviço"
        description="Execução operacional, checklist e baixa de estoque."
      />
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Veículo</th>
                <th className="px-4 py-3 text-left">Situação</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left" />
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-600">
                    Nenhuma ordem de serviço. Converta um orçamento aprovado ou crie pela API.
                  </td>
                </tr>
              ) : (
                data?.items.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="px-4 py-3">{o.number}</td>
                    <td className="px-4 py-3">{o.customer.name}</td>
                    <td className="px-4 py-3">
                      {o.vehicle
                        ? `${o.vehicle.plate} — ${o.vehicle.brand} ${o.vehicle.model}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(Number(o.total))}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ordens-servico/${o.id}`}
                        className="text-slate-900 underline"
                      >
                        {canManage ? 'Gerenciar' : 'Ver'}
                      </Link>
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
