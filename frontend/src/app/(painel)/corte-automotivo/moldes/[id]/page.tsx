'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

type Pattern = {
  id: string;
  name: string;
  status: string;
  pieceCategory: string;
  widthMm: string;
  heightMm: string;
  rotationAllowed: boolean;
  maxRotationDeg: number;
  marginMm: string;
  svgSource: string | null;
  geometry: { points?: { x: number; y: number }[] };
};

function geometrySvg(points: { x: number; y: number }[], w: number, h: number) {
  if (!points.length) return null;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 ${w + 10} ${h + 10}"><path d="${d} Z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1"/></svg>`;
}

export default function MoldeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const { hasPermission } = useAuth();
  const canValidate = hasPermission('cut.validate');
  const qc = useQueryClient();

  const { data: pattern, isLoading } = useQuery<Pattern>({
    queryKey: ['cut-pattern', id],
    queryFn: () => api(`/cut-automotive/patterns/${id}`),
  });

  const approve = useMutation({
    mutationFn: () => api(`/cut-automotive/patterns/${id}/approve`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cut-pattern', id] }),
  });

  const preview = useMemo(() => {
    if (!pattern) return null;
    if (pattern.svgSource?.trim()) return pattern.svgSource;
    const pts = pattern.geometry?.points ?? [];
    return geometrySvg(pts, Number(pattern.widthMm), Number(pattern.heightMm));
  }, [pattern]);

  if (isLoading || !pattern) {
    return <p className="text-sm text-slate-600">Carregando molde...</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={pattern.name}
        description={`${pattern.pieceCategory} · ${pattern.status}`}
        action={
          <Link href="/corte-automotivo/moldes" className="text-sm underline">
            Voltar
          </Link>
        }
      />
      {canValidate && (pattern.status === 'PENDING_VALIDATION' || pattern.status === 'IMPORTED') ? (
        <Button type="button" onClick={() => approve.mutate()} disabled={approve.isPending}>
          Aprovar para produção
        </Button>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4 text-sm">
          <p>Largura: {Number(pattern.widthMm).toFixed(1)} mm</p>
          <p>Altura: {Number(pattern.heightMm).toFixed(1)} mm</p>
          <p>Margem: {Number(pattern.marginMm).toFixed(1)} mm</p>
          <p>
            Rotação: {pattern.rotationAllowed ? `até ${pattern.maxRotationDeg}°` : 'desligada'}
          </p>
        </div>
        <div className="rounded border bg-white p-4">
          <h3 className="text-sm font-medium">Visualização</h3>
          {preview ? (
            <div className="mt-2 max-h-96 overflow-auto" dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <p className="mt-2 text-sm text-slate-600">Sem geometria.</p>
          )}
        </div>
      </div>
    </div>
  );
}
