'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

type JobRow = {
  id: string;
  status: string;
  simulationMode: boolean;
  applicationType: string;
  createdAt: string;
};

export default function TrabalhosCortePage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cut.manage');
  const qc = useQueryClient();
  const [form, setForm] = useState({
    applicationType: 'INSULFILM',
    materialWidthMm: '1520',
    simulationMode: true,
  });

  const { data, isLoading } = useQuery<JobRow[]>({
    queryKey: ['cut-jobs'],
    queryFn: () => api('/cut-automotive/jobs'),
  });

  const createJob = useMutation({
    mutationFn: (): Promise<{ id: string }> =>
      api('/cut-automotive/jobs', {
        method: 'POST',
        body: JSON.stringify({
          applicationType: form.applicationType,
          materialWidthMm: Number(form.materialWidthMm),
          simulationMode: form.simulationMode,
        }),
      }) as Promise<{ id: string }>,
    onSuccess: (job: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['cut-jobs'] });
      window.location.href = `/corte-automotivo/trabalhos/${job.id}`;
    },
  });

  return (
    <div>
      <PageHeader
        title="Trabalhos de corte"
        description="Nesting com rotação e colisão SAT; exportação SVG, DXF e HPGL."
        action={
          <Link href="/corte-automotivo" className="text-sm underline">
            Voltar
          </Link>
        }
      />
      {canManage ? (
        <div className="mb-6 max-w-md space-y-2 rounded border bg-white p-4">
          <label className="block text-sm">
            Largura do material (mm)
            <Input
              className="mt-1"
              value={form.materialWidthMm}
              onChange={(e) => setForm((f) => ({ ...f, materialWidthMm: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.simulationMode}
              onChange={(e) => setForm((f) => ({ ...f, simulationMode: e.target.checked }))}
            />
            Modo simulação (sem envio TCP/serial à plotter)
          </label>
          <Button type="button" onClick={() => createJob.mutate()} disabled={createJob.isPending}>
            Novo trabalho
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <table className="min-w-full rounded border bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Simulação</th>
              <th className="px-3 py-2 text-left">Criado</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/corte-automotivo/trabalhos/${j.id}`} className="underline">
                    {j.id.slice(0, 8)}…
                  </Link>
                </td>
                <td className="px-3 py-2">{j.status}</td>
                <td className="px-3 py-2">{j.simulationMode ? 'Sim' : 'Não'}</td>
                <td className="px-3 py-2">{new Date(j.createdAt).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
