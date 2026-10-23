'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type Supplier = {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  phone: string | null;
};

export default function FornecedoresPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('suppliers.manage');
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    legalName: '',
    tradeName: '',
    document: '',
    phone: '',
    email: '',
    paymentTermDays: '',
  });

  const { data, isLoading, isError } = useQuery<{ items: Supplier[] }>({
    queryKey: ['suppliers'],
    queryFn: () => api('/suppliers?pageSize=50'),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          legalName: form.legalName,
          tradeName: form.tradeName || undefined,
          document: form.document || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          paymentTermDays: form.paymentTermDays
            ? Number(form.paymentTermDays)
            : undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setShowForm(false);
    },
  });

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores e condições comerciais."
        action={
          canManage ? (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Fechar' : 'Novo fornecedor'}
            </Button>
          ) : null
        }
      />
      {showForm && canManage ? (
        <div className="mb-6 grid max-w-2xl gap-2 rounded-lg border bg-white p-4 sm:grid-cols-2">
          <Input
            label="Razão social"
            value={form.legalName}
            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
          />
          <Input
            label="Nome fantasia"
            value={form.tradeName}
            onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
          />
          <Input
            label="CNPJ"
            value={form.document}
            onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
          />
          <Input
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="E-mail"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Prazo de pagamento (dias)"
            value={form.paymentTermDays}
            onChange={(e) =>
              setForm((f) => ({ ...f, paymentTermDays: e.target.value }))
            }
          />
          {create.isError ? (
            <div className="sm:col-span-2">
              <Alert>
                {create.error instanceof Error ? create.error.message : 'Erro.'}
              </Alert>
            </div>
          ) : null}
          <Button
            type="button"
            className="sm:col-span-2"
            onClick={() => create.mutate()}
            disabled={!form.legalName.trim() || create.isPending}
          >
            Salvar fornecedor
          </Button>
        </div>
      ) : null}
      {isError ? <Alert>Erro ao carregar fornecedores.</Alert> : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Razão social</th>
                <th className="px-4 py-3 text-left">CNPJ</th>
                <th className="px-4 py-3 text-left">Telefone</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-slate-600">
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              ) : (
                data?.items.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="px-4 py-3">{s.legalName}</td>
                    <td className="px-4 py-3">{s.document ?? 'Não informado'}</td>
                    <td className="px-4 py-3">{s.phone ?? 'Não informado'}</td>
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
