'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

type Pattern = { id: string; name: string; status: string };
type JobFile = { id: string; format: string; fileName: string; content: string };
type Job = {
  id: string;
  status: string;
  simulationMode: boolean;
  materialWidthMm: string | null;
  materialLengthMm: string | null;
  utilizationPct: string | null;
  layout: { placed?: { id: string; points: { x: number; y: number }[] }[]; warnings?: string[] } | null;
  items: { id: string; quantity: number; pattern: { id: string; name: string } }[];
  files: JobFile[];
  events: { eventType: string; message: string; createdAt: string }[];
};

function downloadText(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function layoutPreviewSvg(
  placed: { points: { x: number; y: number }[] }[],
  width: number,
  length: number,
) {
  const h = length || Math.max(...placed.flatMap((p) => p.points.map((pt) => pt.y)), 100) + 20;
  const paths = placed
    .map((p) => {
      const d = p.points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
      return `<path d="${d} Z" fill="none" stroke="#2563eb" stroke-width="1"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}">${paths}<rect x="0" y="0" width="${width}" height="${h}" fill="none" stroke="#94a3b8" stroke-dasharray="4"/></svg>`;
}

export default function TrabalhoCorteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cut.manage');
  const qc = useQueryClient();
  const [patternId, setPatternId] = useState('');
  const [plotterId, setPlotterId] = useState('');

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['cut-job', id],
    queryFn: () => api(`/cut-automotive/jobs/${id}`),
  });

  const { data: patterns } = useQuery<Pattern[]>({
    queryKey: ['cut-patterns', 'approved'],
    queryFn: () => api('/cut-automotive/patterns?status=APPROVED'),
    enabled: canManage,
  });

  const { data: plotters } = useQuery<{ id: string; manufacturer: string; model: string }[]>({
    queryKey: ['cut-plotters'],
    queryFn: () => api('/cut-automotive/plotters'),
    enabled: canManage,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cut-job', id] });

  const addItem = useMutation({
    mutationFn: () =>
      api(`/cut-automotive/jobs/${id}/items`, {
        method: 'POST',
        body: JSON.stringify({ items: [{ patternId, quantity: 1 }] }),
      }),
    onSuccess: invalidate,
  });

  const nest = useMutation({
    mutationFn: () =>
      api(`/cut-automotive/jobs/${id}/nest`, { method: 'POST', body: JSON.stringify({ spacingMm: 5 }) }),
    onSuccess: invalidate,
  });

  const exportJob = useMutation({
    mutationFn: () =>
      api(`/cut-automotive/jobs/${id}/export`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true, formats: ['svg', 'dxf', 'hpgl'] }),
      }),
    onSuccess: invalidate,
  });

  const dispatch = useMutation({
    mutationFn: () =>
      api(`/cut-automotive/jobs/${id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ plotterProfileId: plotterId, confirm: true }),
      }),
    onSuccess: invalidate,
  });

  const preview = useMemo(() => {
    if (!job?.layout?.placed?.length) return null;
    const w = Number(job.materialWidthMm ?? 1500);
    const len = Number(job.materialLengthMm ?? 0);
    return layoutPreviewSvg(job.layout.placed, w, len);
  }, [job]);

  if (isLoading || !job) {
    return <p className="text-sm text-slate-600">Carregando trabalho...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Trabalho ${job.id.slice(0, 8)}…`}
        description={`Status: ${job.status} · Simulação: ${job.simulationMode ? 'sim' : 'não'}`}
        action={
          <Link href="/corte-automotivo/trabalhos" className="text-sm underline">
            Voltar
          </Link>
        }
      />
      {canManage ? (
        <div className="flex flex-wrap gap-2 rounded border bg-white p-4">
          <select className="rounded border px-2 py-1 text-sm" value={patternId} onChange={(e) => setPatternId(e.target.value)}>
            <option value="">Molde aprovado…</option>
            {patterns?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button type="button" className="!py-1 text-sm" disabled={!patternId || addItem.isPending} onClick={() => addItem.mutate()}>
            Adicionar peça
          </Button>
          <Button type="button" className="!py-1 text-sm" disabled={nest.isPending} onClick={() => nest.mutate()}>
            Executar nesting
          </Button>
          <Button type="button" className="!py-1 text-sm" disabled={exportJob.isPending} onClick={() => exportJob.mutate()}>
            Exportar SVG/DXF/HPGL
          </Button>
          <select className="rounded border px-2 py-1 text-sm" value={plotterId} onChange={(e) => setPlotterId(e.target.value)}>
            <option value="">Plotter…</option>
            {plotters?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.manufacturer} {p.model}
              </option>
            ))}
          </select>
          <Button
            type="button"
            className="!py-1 text-sm"
            disabled={!plotterId || dispatch.isPending}
            onClick={() => dispatch.mutate()}
          >
            Enviar / simular plotter
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4 text-sm">
          <h3 className="font-medium">Itens</h3>
          <ul className="mt-2 list-disc pl-4">
            {job.items.map((i) => (
              <li key={i.id}>
                {i.pattern.name} × {i.quantity}
              </li>
            ))}
          </ul>
          {job.utilizationPct ? (
            <p className="mt-2 text-slate-600">Aproveitamento: {Number(job.utilizationPct).toFixed(1)}%</p>
          ) : null}
          {job.layout?.warnings?.map((w) => (
            <p key={w} className="mt-1 text-xs text-amber-800">
              {w}
            </p>
          ))}
        </div>
        <div className="rounded border bg-white p-4">
          <h3 className="text-sm font-medium">Preview nesting</h3>
          {preview ? (
            <div className="mt-2 overflow-auto" dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <p className="mt-2 text-sm text-slate-600">Execute o nesting para visualizar.</p>
          )}
        </div>
      </div>
      <div className="rounded border bg-white p-4">
        <h3 className="text-sm font-medium">Arquivos gerados</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {job.files?.length ? (
            job.files.map((f) => (
              <li key={f.id}>
                {f.fileName}{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    downloadText(
                      f.content,
                      f.fileName,
                      f.format === 'svg' ? 'image/svg+xml' : 'text/plain',
                    )
                  }
                >
                  Baixar
                </button>
              </li>
            ))
          ) : (
            <li className="text-slate-600">Nenhum arquivo ainda.</li>
          )}
        </ul>
      </div>
      <div className="rounded border bg-white p-4">
        <h3 className="text-sm font-medium">Eventos</h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-700">
          {job.events?.map((e, idx) => (
            <li key={`${e.createdAt}-${idx}`}>
              {new Date(e.createdAt).toLocaleString('pt-BR')} — {e.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
