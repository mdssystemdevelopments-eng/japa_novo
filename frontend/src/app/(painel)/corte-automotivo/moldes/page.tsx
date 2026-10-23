'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

export default function MoldesCortePage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cut.manage');
  const canValidate = hasPermission('cut.validate');
  const qc = useQueryClient();
  const [importForm, setImportForm] = useState({
    name: '',
    pieceCategory: 'FRONT_SIDE_LEFT',
    svgContent: '',
  });

  const { data, isLoading } = useQuery<
    { id: string; name: string; status: string; pieceCategory: string; widthMm: string; heightMm: string }[]
  >({
    queryKey: ['cut-patterns'],
    queryFn: () => api('/cut-automotive/patterns'),
  });

  const importSvg = useMutation({
    mutationFn: () =>
      api('/cut-automotive/patterns/import', {
        method: 'POST',
        body: JSON.stringify({
          name: importForm.name,
          pieceCategory: importForm.pieceCategory,
          svgContent: importForm.svgContent,
          origin: 'upload',
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cut-patterns'] });
      setImportForm({ name: '', pieceCategory: 'FRONT_SIDE_LEFT', svgContent: '' });
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) =>
      api(`/cut-automotive/patterns/${id}/approve`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cut-patterns'] }),
  });

  return (
    <div>
      <PageHeader
        title="Biblioteca de moldes"
        description="Importação SVG → pendente de validação → aprovação para produção."
        action={
          <Link href="/corte-automotivo" className="text-sm underline">
            Voltar
          </Link>
        }
      />
      {canManage ? (
        <div className="mb-6 max-w-2xl space-y-2 rounded border bg-white p-4">
          <Input label="Nome da peça" value={importForm.name} onChange={(e) => setImportForm((f) => ({ ...f, name: e.target.value }))} />
          <label className="block text-sm">
            Categoria
            <select
              className="mt-1 w-full rounded border px-2 py-2"
              value={importForm.pieceCategory}
              onChange={(e) => setImportForm((f) => ({ ...f, pieceCategory: e.target.value }))}
            >
              <option value="WINDSHIELD">Para-brisa</option>
              <option value="REAR_GLASS">Vidro traseiro</option>
              <option value="FRONT_SIDE_LEFT">Lateral dianteira esq.</option>
              <option value="FRONT_SIDE_RIGHT">Lateral dianteira dir.</option>
              <option value="HOOD">Capô</option>
              <option value="OTHER">Outra</option>
            </select>
          </label>
          <label className="block text-sm">
            Conteúdo SVG
            <textarea
              className="mt-1 h-32 w-full rounded border p-2 font-mono text-xs"
              value={importForm.svgContent}
              onChange={(e) => setImportForm((f) => ({ ...f, svgContent: e.target.value }))}
              placeholder="<svg ...><path d=... /></svg>"
            />
          </label>
          <Button type="button" onClick={() => importSvg.mutate()} disabled={importSvg.isPending}>
            Importar (pendente validação)
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <table className="min-w-full rounded border bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Peça</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Dimensões (mm)</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/corte-automotivo/moldes/${p.id}`} className="underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.pieceCategory}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">
                  {Number(p.widthMm).toFixed(0)} × {Number(p.heightMm).toFixed(0)}
                </td>
                <td className="px-3 py-2">
                  {canValidate && p.status === 'PENDING_VALIDATION' ? (
                    <Button type="button" className="!px-2 !py-1 text-xs" onClick={() => approve.mutate(p.id)}>
                      Aprovar
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
