'use client';

import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { useApi } from '@/hooks/use-api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

type DashboardSummary = {
  period: { from: string; to: string };
  indicators: {
    appointmentsToday: number;
    workOrdersInProgress: number;
    servicesCompletedInPeriod: number;
    quotesAwaitingResponse: number;
    billingInPeriod: number;
    receivableOpen: number;
    payableOpen: number;
    lowStockProducts: number;
    whatsappFailures: number;
    profitInPeriod: number;
  };
  recentGoodsReceipts: { id: string; documentNumber: string | null; receivedAt: string }[];
  upcomingAppointments: {
    id: string;
    startsAt: string;
    customer: { name: string };
    vehicle: { brand: string; model: string; plate: string } | null;
  }[];
  recentFinancialMovements: {
    id: string;
    description: string;
    amount: string;
    type: 'INFLOW' | 'OUTFLOW';
    occurredAt: string;
  }[];
};

function IndicatorCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:border-slate-400">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function DashboardPage() {
  const api = useApi();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const queryKey = ['dashboard', from, to];
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<DashboardSummary>({
      queryKey,
      queryFn: () => {
        const params = new URLSearchParams();
        if (from) params.set('from', new Date(from).toISOString());
        if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());
        const q = params.toString();
        return api(`/dashboard/summary${q ? `?${q}` : ''}`);
      },
    });

  const ind = data?.indicators;

  return (
    <div>
      <PageHeader
        title="Painel"
        description="Indicadores calculados a partir dos registros do sistema."
        action={
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-600">
              De
              <input
                type="date"
                className="ml-1 rounded border border-slate-300 px-2 py-1 text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-600">
              Até
              <input
                type="date"
                className="ml-1 rounded border border-slate-300 px-2 py-1 text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              {isFetching ? 'Atualizando...' : 'Aplicar período'}
            </button>
          </div>
        }
      />

      {isError ? (
        <Alert>
          Não foi possível carregar o painel. Verifique se a API e o banco estão
          ativos.
        </Alert>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando indicadores...</p>
      ) : ind ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <IndicatorCard
              label="Agendamentos de hoje"
              value={ind.appointmentsToday}
            />
            <IndicatorCard
              label="Ordens de serviço em andamento"
              value={ind.workOrdersInProgress}
            />
            <IndicatorCard
              label="Serviços concluídos no período"
              value={ind.servicesCompletedInPeriod}
            />
            <IndicatorCard
              label="Orçamentos aguardando resposta"
              value={ind.quotesAwaitingResponse}
            />
            <IndicatorCard
              label="Faturamento do período (entradas)"
              value={formatCurrency(ind.billingInPeriod)}
            />
            <IndicatorCard
              label="Valores a receber"
              value={formatCurrency(ind.receivableOpen)}
            />
            <IndicatorCard
              label="Valores a pagar"
              value={formatCurrency(ind.payableOpen)}
            />
            <IndicatorCard
              label="Produtos abaixo do estoque mínimo"
              value={ind.lowStockProducts}
            />
            <IndicatorCard
              label="Mensagens do WhatsApp com falha"
              value={ind.whatsappFailures}
            />
            <IndicatorCard
              label="Lucro calculado no período"
              value={formatCurrency(ind.profitInPeriod)}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Próximos agendamentos
              </h2>
              {data.upcomingAppointments.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">
                  Nenhum agendamento futuro. Cadastre um agendamento quando o
                  módulo de agenda estiver em uso.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {data.upcomingAppointments.map((a) => (
                    <li key={a.id} className="py-2">
                      <p className="font-medium">{a.customer.name}</p>
                      <p className="text-slate-600">
                        {formatDateTime(a.startsAt)}
                        {a.vehicle
                          ? ` · ${a.vehicle.brand} ${a.vehicle.model} (${a.vehicle.plate})`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Últimas movimentações financeiras
              </h2>
              {data.recentFinancialMovements.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">
                  Nenhuma movimentação registrada. Lançamentos aparecerão aqui
                  após o módulo financeiro ser utilizado.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {data.recentFinancialMovements.map((m) => (
                    <li
                      key={m.id}
                      className="flex justify-between gap-2 py-2"
                    >
                      <span className="text-slate-700">{m.description}</span>
                      <span
                        className={
                          m.type === 'INFLOW'
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }
                      >
                        {formatCurrency(Number(m.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Entradas recentes de mercadorias
              </h2>
              {data.recentGoodsReceipts.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">
                  Nenhuma entrada registrada. Registre entradas no módulo de
                  estoque quando disponível.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {data.recentGoodsReceipts.map((r) => (
                    <li key={r.id} className="py-2 text-slate-700">
                      Documento {r.documentNumber ?? 'sem número'} ·{' '}
                      {formatDate(r.receivedAt)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
