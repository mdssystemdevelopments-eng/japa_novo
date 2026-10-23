'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { formatCurrency } from '@/lib/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

type Product = {
  id: string;
  internalCode: string;
  name: string;
  unitOfMeasure: string;
  stockQty: string;
  minStock: string;
  salePrice: string;
  _count: { bobinas: number };
};

export default function ProdutosPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('products.manage');
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    internalCode: '',
    name: '',
    unitOfMeasure: 'UN',
    minStock: '0',
    salePrice: '0',
    filmType: '',
  });

  const { data, isLoading, isError } = useQuery<{ items: Product[] }>({
    queryKey: ['products', search],
    queryFn: () => {
      const p = new URLSearchParams({ pageSize: '50' });
      if (search) p.set('q', search);
      return api(`/products?${p}`);
    },
  });

  const create = useMutation({
    mutationFn: () =>
      api('/products', {
        method: 'POST',
        body: JSON.stringify({
          internalCode: form.internalCode,
          name: form.name,
          unitOfMeasure: form.unitOfMeasure,
          minStock: Number(form.minStock),
          salePrice: Number(form.salePrice),
          filmType: form.filmType || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
    },
  });

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Películas, materiais e controle de unidade de medida."
        action={
          canManage ? (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Fechar' : 'Novo produto'}
            </Button>
          ) : null
        }
      />
      <div className="mb-4 flex gap-2">
        <Input
          className="max-w-md"
          placeholder="Código ou nome"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setSearch(q)}
        >
          Pesquisar
        </Button>
      </div>
      {showForm && canManage ? (
        <div className="mb-6 grid max-w-2xl gap-2 rounded-lg border bg-white p-4 sm:grid-cols-2">
          <Input
            label="Código interno"
            value={form.internalCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, internalCode: e.target.value }))
            }
          />
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <label className="text-sm">
            Unidade
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
              value={form.unitOfMeasure}
              onChange={(e) =>
                setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))
              }
            >
              <option value="UN">Unidade</option>
              <option value="M">Metro (bobina)</option>
              <option value="M2">m²</option>
            </select>
          </label>
          <Input
            label="Estoque mínimo"
            value={form.minStock}
            onChange={(e) =>
              setForm((f) => ({ ...f, minStock: e.target.value }))
            }
          />
          <Input
            label="Preço de venda"
            value={form.salePrice}
            onChange={(e) =>
              setForm((f) => ({ ...f, salePrice: e.target.value }))
            }
          />
          <Input
            label="Tipo de película"
            value={form.filmType}
            onChange={(e) =>
              setForm((f) => ({ ...f, filmType: e.target.value }))
            }
          />
          {create.isError ? (
            <div className="sm:col-span-2">
              <Alert>
                {create.error instanceof Error
                  ? create.error.message
                  : 'Erro ao salvar.'}
              </Alert>
            </div>
          ) : null}
          <Button
            type="button"
            className="sm:col-span-2"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            Salvar produto
          </Button>
        </div>
      ) : null}
      {isError ? <Alert>Erro ao listar produtos.</Alert> : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Estoque</th>
                <th className="px-4 py-3 text-left">Preço</th>
                <th className="px-4 py-3 text-left">Bobinas</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-600">
                    Nenhum produto. Cadastre películas e materiais para movimentar
                    estoque.
                  </td>
                </tr>
              ) : (
                data?.items.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{p.internalCode}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/produtos/${p.id}`}
                        className="font-medium underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {Number(p.stockQty)} {p.unitOfMeasure}
                      {Number(p.stockQty) < Number(p.minStock) ? (
                        <span className="ml-2 text-red-700">Abaixo do mínimo</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(Number(p.salePrice))}
                    </td>
                    <td className="px-4 py-3">{p._count.bobinas}</td>
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
