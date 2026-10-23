'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

export default function CorteAutomotivoPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cut.manage');

  const { data: jobs } = useQuery<{ id: string; status: string }[]>({
    queryKey: ['cut-jobs'],
    queryFn: () => api('/cut-automotive/jobs'),
    enabled: hasPermission('cut.read'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corte automotivo"
        description="Módulo profissional de moldes, nesting e exportação (substituto operacional ao fluxo Tech-Cut)."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/corte-automotivo/catalogo" className="rounded-lg border bg-white p-4 hover:bg-slate-50">
          <h2 className="font-medium">Catálogo de veículos</h2>
          <p className="mt-1 text-sm text-slate-600">Fabricante, modelo, anos e compatibilidade de moldes.</p>
        </Link>
        <Link href="/corte-automotivo/moldes" className="rounded-lg border bg-white p-4 hover:bg-slate-50">
          <h2 className="font-medium">Biblioteca de moldes</h2>
          <p className="mt-1 text-sm text-slate-600">Importação SVG, validação e aprovação.</p>
        </Link>
        <Link href="/corte-automotivo/trabalhos" className="rounded-lg border bg-white p-4 hover:bg-slate-50">
          <h2 className="font-medium">Trabalhos de corte</h2>
          <p className="mt-1 text-sm text-slate-600">Preparação, nesting, exportação e simulação.</p>
        </Link>
        <Link href="/corte-automotivo/plotters" className="rounded-lg border bg-white p-4 hover:bg-slate-50">
          <h2 className="font-medium">Plotters</h2>
          <p className="mt-1 text-sm text-slate-600">TCP HPGL, exportação manual ou agente serial local.</p>
        </Link>
      </div>
      {canManage ? (
        <p className="text-sm text-amber-800">
          Modo simulação ativo por padrão: nenhum envio real à plotter até perfil e integração documentados.
        </p>
      ) : null}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="font-medium">Últimos trabalhos</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {jobs?.length ? (
            jobs.slice(0, 5).map((j) => (
              <li key={j.id}>
                {j.status} —{' '}
                <Link href={`/corte-automotivo/trabalhos/${j.id}`} className="underline">
                  {j.id.slice(0, 8)}
                </Link>
              </li>
            ))
          ) : (
            <li className="text-slate-600">Nenhum trabalho registrado.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
