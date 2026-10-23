'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import {
  CustomerForm,
  customerToForm,
  formToPayload,
} from '@/components/customers/customer-form';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  plate: string;
};

export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('customers.manage');
  const canVehicles = hasPermission('vehicles.manage');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api(`/customers/${id}`),
  });

  const { data: vehicles } = useQuery<{ items: Vehicle[] }>({
    queryKey: ['vehicles', id],
    queryFn: () => api(`/vehicles?customerId=${id}&pageSize=50`),
    enabled: !!id,
  });

  const [form, setForm] = useState(customerToForm({}));
  useEffect(() => {
    if (data) setForm(customerToForm(data as Record<string, unknown>));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formToPayload(form)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      api(`/customers/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const [vehicleForm, setVehicleForm] = useState({
    brand: '',
    model: '',
    plate: '',
    color: '',
  });

  const createVehicle = useMutation({
    mutationFn: () =>
      api('/vehicles', {
        method: 'POST',
        body: JSON.stringify({ ...vehicleForm, customerId: id }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles', id] });
      setVehicleForm({ brand: '', model: '', plate: '', color: '' });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando cliente...</p>;
  }

  if (isError || !data) {
    return <Alert>Cliente não encontrado.</Alert>;
  }

  const status = (data as { status: string }).status;

  return (
    <div>
      <PageHeader
        title={(data as { name: string }).name}
        description="Cadastro, endereço e veículos vinculados."
        action={
          <Link href="/clientes" className="text-sm text-slate-600 underline">
            Voltar à lista
          </Link>
        }
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <CustomerForm
          values={form}
          onChange={setForm}
          onSubmit={() => save.mutate()}
          submitLabel={save.isPending ? 'Salvando...' : 'Salvar alterações'}
          disabled={!canManage || status === 'ARCHIVED'}
          error={
            save.isError && save.error instanceof Error
              ? save.error.message
              : null
          }
        />
        {save.isSuccess ? (
          <Alert variant="success">Dados atualizados.</Alert>
        ) : null}
        {canManage && status === 'ACTIVE' ? (
          <Button
            type="button"
            variant="danger"
            className="mt-4"
            onClick={() => archive.mutate()}
            disabled={archive.isPending}
          >
            Arquivar cliente
          </Button>
        ) : null}
        {status === 'ARCHIVED' ? (
          <p className="mt-4 text-sm text-slate-600">Cliente arquivado.</p>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Veículos</h2>
        {canVehicles && status === 'ACTIVE' ? (
          <div className="mt-3 grid max-w-2xl gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
            <Input
              label="Marca"
              value={vehicleForm.brand}
              onChange={(e) =>
                setVehicleForm((f) => ({ ...f, brand: e.target.value }))
              }
            />
            <Input
              label="Modelo"
              value={vehicleForm.model}
              onChange={(e) =>
                setVehicleForm((f) => ({ ...f, model: e.target.value }))
              }
            />
            <Input
              label="Placa"
              value={vehicleForm.plate}
              onChange={(e) =>
                setVehicleForm((f) => ({ ...f, plate: e.target.value }))
              }
            />
            <Input
              label="Cor"
              value={vehicleForm.color}
              onChange={(e) =>
                setVehicleForm((f) => ({ ...f, color: e.target.value }))
              }
            />
            {createVehicle.isError ? (
              <div className="sm:col-span-2">
                <Alert>
                  {createVehicle.error instanceof Error
                    ? createVehicle.error.message
                    : 'Erro ao cadastrar veículo.'}
                </Alert>
              </div>
            ) : null}
            <Button
              type="button"
              className="sm:col-span-2"
              onClick={() => createVehicle.mutate()}
              disabled={createVehicle.isPending}
            >
              Adicionar veículo
            </Button>
          </div>
        ) : null}
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {vehicles?.items.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-600">
              Nenhum veículo vinculado. Cadastre a placa para orçamentos e ordens
              de serviço.
            </li>
          ) : (
            vehicles?.items.map((v) => (
              <li key={v.id} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  {v.brand} {v.model}
                </span>
                <Link href={`/veiculos?q=${v.plate}`} className="underline">
                  {v.plate}
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
