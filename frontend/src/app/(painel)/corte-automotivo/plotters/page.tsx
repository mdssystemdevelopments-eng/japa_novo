'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

type Plotter = {
  id: string;
  manufacturer: string;
  model: string;
  maxWidthMm: string;
  integrationMode: string;
  acceptedFormats: string[];
  config?: { host?: string; port?: number };
};

export default function PlottersCortePage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cut.manage');
  const qc = useQueryClient();
  const [form, setForm] = useState({
    manufacturer: '',
    model: '',
    maxWidthMm: '1520',
    integrationMode: 'FILE_EXPORT_ONLY',
    host: '',
    port: '9100',
  });

  const { data, isLoading } = useQuery<Plotter[]>({
    queryKey: ['cut-plotters'],
    queryFn: () => api('/cut-automotive/plotters'),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/cut-automotive/plotters', {
        method: 'POST',
        body: JSON.stringify({
          manufacturer: form.manufacturer,
          model: form.model,
          maxWidthMm: Number(form.maxWidthMm),
          acceptedFormats: ['svg', 'dxf', 'hpgl'],
          integrationMode: form.integrationMode,
          config:
            form.integrationMode === 'NETWORK_HPGL'
              ? { host: form.host, port: Number(form.port) }
              : form.integrationMode === 'LOCAL_SERIAL'
                ? { serialPort: 'COM3', baudRate: 9600 }
                : {},
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cut-plotters'] });
      setForm({
        manufacturer: '',
        model: '',
        maxWidthMm: '1520',
        integrationMode: 'FILE_EXPORT_ONLY',
        host: '',
        port: '9100',
      });
    },
  });

  return (
    <div>
      <PageHeader
        title="Plotters"
        description="FILE_EXPORT_ONLY, HPGL via TCP (9100) ou serial local com agente."
        action={
          <Link href="/corte-automotivo" className="text-sm underline">
            Voltar
          </Link>
        }
      />
      {canManage ? (
        <div className="mb-6 max-w-lg space-y-2 rounded border bg-white p-4">
          <Input
            label="Fabricante"
            value={form.manufacturer}
            onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
          />
          <Input label="Modelo" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
          <Input
            label="Largura máx. (mm)"
            value={form.maxWidthMm}
            onChange={(e) => setForm((f) => ({ ...f, maxWidthMm: e.target.value }))}
          />
          <label className="block text-sm">
            Integração
            <select
              className="mt-1 w-full rounded border px-2 py-2"
              value={form.integrationMode}
              onChange={(e) => setForm((f) => ({ ...f, integrationMode: e.target.value }))}
            >
              <option value="FILE_EXPORT_ONLY">Somente exportar arquivos</option>
              <option value="NETWORK_HPGL">Rede — HPGL TCP</option>
              <option value="LOCAL_SERIAL">USB/serial (agente local)</option>
            </select>
          </label>
          {form.integrationMode === 'NETWORK_HPGL' ? (
            <>
              <Input label="Host/IP" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} />
              <Input label="Porta" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} />
            </>
          ) : null}
          <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
            Cadastrar perfil
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {data?.map((p) => (
            <li key={p.id} className="rounded border bg-white p-3">
              <strong>
                {p.manufacturer} {p.model}
              </strong>{' '}
              — {p.integrationMode} — {Number(p.maxWidthMm).toFixed(0)} mm
              {p.config?.host ? (
                <span className="text-slate-600">
                  {' '}
                  ({p.config.host}:{p.config.port ?? 9100})
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-slate-600">
        Serial: baixe o HPGL do trabalho e use{' '}
        <code className="rounded bg-slate-100 px-1">node backend/scripts/plotter-serial-agent.mjs</code> na PC da
        plotter.
      </p>
    </div>
  );
}
