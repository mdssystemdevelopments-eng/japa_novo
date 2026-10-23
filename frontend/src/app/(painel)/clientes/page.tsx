'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import {
  CustomerForm,
  emptyCustomerForm,
  formToPayload,
} from '@/components/customers/customer-form';
import { useAuth } from '@/contexts/auth-context';
import { ApiError } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

type Customer = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  status: string;
};

type ListResponse = {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
};

export default function ClientesPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('customers.manage');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCustomerForm);
  const [duplicates, setDuplicates] = useState<
    { id: string; name: string; document: string | null }[] | null
  >(null);

  const { data, isLoading, isError } = useQuery<ListResponse>({
    queryKey: ['customers', page, search],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (search) params.set('q', search);
      return api(`/customers?${params}`);
    },
  });

  const createCustomer = useMutation({
    mutationFn: (force: boolean) =>
      api('/customers' + (force ? '?force=true' : ''), {
        method: 'POST',
        body: JSON.stringify(formToPayload(form)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setForm(emptyCustomerForm);
      setDuplicates(null);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409 && err.body) {
        const body = err.body as {
          message?: { duplicates?: typeof duplicates };
        };
        const list = body.message?.duplicates;
        if (list?.length) {
          setDuplicates(list);
          return;
        }
      }
      setDuplicates(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Cadastro e consulta de clientes da operação."
        action={
          canManage ? (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Fechar' : 'Novo cliente'}
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por nome, telefone ou documento"
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

      {showForm && canManage ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <CustomerForm
            values={form}
            onChange={setForm}
            onSubmit={() => createCustomer.mutate(false)}
            submitLabel={
              createCustomer.isPending ? 'Salvando...' : 'Salvar cliente'
            }
            error={
              createCustomer.isError && !duplicates?.length
                ? createCustomer.error instanceof Error
                  ? createCustomer.error.message
                  : 'Erro ao salvar.'
                : null
            }
          />
          {duplicates?.length ? (
            <div className="mt-4">
              <Alert variant="info">
                Cadastros semelhantes encontrados. Confirme se deseja criar mesmo
                assim.
              </Alert>
              <ul className="mt-2 text-sm text-slate-700">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link href={`/clientes/${d.id}`} className="underline">
                      {d.name}
                    </Link>
                    {d.document ? ` · ${d.document}` : ''}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="mt-2"
                variant="secondary"
                onClick={() => createCustomer.mutate(true)}
              >
                Criar mesmo assim
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {isError ? <Alert>Não foi possível carregar os clientes.</Alert> : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-600">
                    Nenhum cliente cadastrado. Use &quot;Novo cliente&quot; para
                    incluir o primeiro registro.
                  </td>
                </tr>
              ) : (
                data?.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="text-slate-900 underline-offset-2 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.document ?? 'Não informado'}
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ?? c.whatsapp ?? 'Não informado'}
                    </td>
                    <td className="px-4 py-3">{c.city ?? 'Não informado'}</td>
                    <td className="px-4 py-3">
                      {c.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {data && data.total > data.pageSize ? (
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="self-center text-sm text-slate-600">
                Página {data.page}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
