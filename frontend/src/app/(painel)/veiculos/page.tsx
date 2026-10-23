'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useApi } from '@/hooks/use-api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

type VehicleRow = {
  id: string;
  brand: string;
  model: string;
  plate: string;
  color: string | null;
  customer: { id: string; name: string };
};

function VeiculosContent() {
  const api = useApi();
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery<{
    items: VehicleRow[];
    total: number;
    pageSize: number;
  }>({
    queryKey: ['vehicles-all', page, search],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) p.set('q', search);
      return api(`/vehicles?${p}`);
    },
  });

  return (
    <div>
      <PageHeader
        title="Veículos"
        description="Consulta por placa, cliente, marca ou modelo."
      />
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Placa ou cliente"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setSearch(q);
            setPage(1);
          }}
        >
          Pesquisar
        </Button>
      </div>
      {isError ? <Alert>Não foi possível carregar veículos.</Alert> : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Cliente</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-slate-600">
                    Nenhum veículo encontrado. Cadastre veículos na ficha do
                    cliente.
                  </td>
                </tr>
              ) : (
                data?.items.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium">{v.plate}</td>
                    <td className="px-4 py-3">
                      {v.brand} {v.model}
                      {v.color ? ` · ${v.color}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${v.customer.id}`}
                        className="underline"
                      >
                        {v.customer.name}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VeiculosPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Carregando...</p>}>
      <VeiculosContent />
    </Suspense>
  );
}
