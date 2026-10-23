'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

export default function CatalogoCortePage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cut.manage');
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ manufacturer: '', model: '', yearFrom: '', yearTo: '' });

  const { data, isLoading } = useQuery<
    { id: string; manufacturer: string; model: string; yearFrom?: number; yearTo?: number; _count: { patterns: number } }[]
  >({
    queryKey: ['cut-catalog', q],
    queryFn: () => api(`/cut-automotive/catalog${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/cut-automotive/catalog', {
        method: 'POST',
        body: JSON.stringify({
          manufacturer: form.manufacturer,
          model: form.model,
          yearFrom: form.yearFrom ? Number(form.yearFrom) : undefined,
          yearTo: form.yearTo ? Number(form.yearTo) : undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cut-catalog'] });
      setForm({ manufacturer: '', model: '', yearFrom: '', yearTo: '' });
    },
  });

  return (
    <div>
      <PageHeader
        title="Catálogo de veículos (corte)"
        description="Identificação por fabricante, modelo e anos — moldes compatíveis por vínculo."
        action={
          <Link href="/corte-automotivo" className="text-sm underline">
            Voltar
          </Link>
        }
      />
      <div className="mb-4 flex gap-2">
        <Input label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {canManage ? (
        <div className="mb-6 grid max-w-lg gap-2 rounded border bg-white p-4">
          <Input label="Fabricante" value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} />
          <Input label="Modelo" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
          <Input label="Ano inicial" value={form.yearFrom} onChange={(e) => setForm((f) => ({ ...f, yearFrom: e.target.value }))} />
          <Input label="Ano final" value={form.yearTo} onChange={(e) => setForm((f) => ({ ...f, yearTo: e.target.value }))} />
          <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
            Cadastrar veículo
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <table className="min-w-full rounded border bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Fabricante</th>
              <th className="px-3 py-2 text-left">Modelo</th>
              <th className="px-3 py-2 text-left">Anos</th>
              <th className="px-3 py-2 text-left">Moldes</th>
            </tr>
          </thead>
          <tbody>
            {data?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-600">
                  Nenhum veículo no catálogo. Cadastre ou importe moldes autorizados.
                </td>
              </tr>
            ) : (
              data?.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2">{v.manufacturer}</td>
                  <td className="px-3 py-2">{v.model}</td>
                  <td className="px-3 py-2">
                    {v.yearFrom ?? '—'} – {v.yearTo ?? '—'}
                  </td>
                  <td className="px-3 py-2">{v._count.patterns}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
