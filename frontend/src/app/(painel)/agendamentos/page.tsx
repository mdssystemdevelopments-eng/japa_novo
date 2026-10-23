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

export default function AgendamentosPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('appointments.manage');
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    serviceDescription: '',
    startsAt: '',
    endsAt: '',
  });

  const { data: customers } = useQuery<{ items: { id: string; name: string }[] }>({
    queryKey: ['customers-picker'],
    queryFn: () => api('/customers?pageSize=100'),
  });

  const { data, isLoading } = useQuery<{
    items: {
      id: string;
      serviceDescription: string;
      startsAt: string;
      endsAt: string;
      status: string;
      customer: { name: string };
    }[];
  }>({
    queryKey: ['appointments'],
    queryFn: () => api('/appointments'),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.customerId,
          serviceDescription: form.serviceDescription,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setShowForm(false);
    },
  });

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        description="Agenda operacional com verificação de conflito de horário."
        action={
          canManage ? (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Fechar' : 'Novo agendamento'}
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
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
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
            label="Serviço"
            value={form.serviceDescription}
            onChange={(e) =>
              setForm((f) => ({ ...f, serviceDescription: e.target.value }))
            }
          />
          <Input
            label="Início"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
          />
          <Input
            label="Término"
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
          />
          {create.isError ? (
            <Alert>
              {create.error instanceof Error ? create.error.message : 'Erro.'}
            </Alert>
          ) : null}
          <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
            Agendar
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white text-sm">
          {data?.items.length === 0 ? (
            <li className="px-4 py-3 text-slate-600">Nenhum agendamento.</li>
          ) : (
            data?.items.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="font-medium">{a.customer.name}</p>
                <p className="text-slate-600">{a.serviceDescription}</p>
                <p className="text-slate-600">
                  {formatDateTime(a.startsAt)} até {formatDateTime(a.endsAt)} · {a.status}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
