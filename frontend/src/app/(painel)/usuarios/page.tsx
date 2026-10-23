'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roles: string[];
  lastLoginAt: string | null;
};

type ListResponse = {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
};

const ROLES = [
  'ADMINISTRADOR',
  'GERENTE',
  'ATENDENTE',
  'TECNICO',
  'FINANCEIRO',
] as const;

export default function UsuariosPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users.manage');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roles: ['ATENDENTE'] as string[],
  });

  const { data, isLoading, isError } = useQuery<ListResponse>({
    queryKey: ['users', page],
    queryFn: () => api(`/users?page=${page}&pageSize=20`),
  });

  const createUser = useMutation({
    mutationFn: () =>
      api('/users', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm({
        fullName: '',
        email: '',
        password: '',
        roles: ['ATENDENTE'],
      });
    },
  });

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Contas de acesso e perfis da equipe."
        action={
          canManage ? (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Fechar formulário' : 'Novo usuário'}
            </Button>
          ) : null
        }
      />

      {showForm && canManage ? (
        <div className="mb-6 max-w-lg space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <Input
            label="Nome completo"
            value={form.fullName}
            onChange={(e) =>
              setForm((f) => ({ ...f, fullName: e.target.value }))
            }
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Senha inicial"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Perfis
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.roles.includes(role)}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        roles: e.target.checked
                          ? [...f.roles, role]
                          : f.roles.filter((r) => r !== role),
                      }));
                    }}
                  />
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </fieldset>
          {createUser.isError ? (
            <Alert>
              {createUser.error instanceof Error
                ? createUser.error.message
                : 'Erro ao criar usuário.'}
            </Alert>
          ) : null}
          <Button
            type="button"
            onClick={() => createUser.mutate()}
            disabled={createUser.isPending}
          >
            {createUser.isPending ? 'Salvando...' : 'Cadastrar usuário'}
          </Button>
        </div>
      ) : null}

      {isError ? <Alert>Não foi possível listar os usuários.</Alert> : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Perfis</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-600">
                    Nenhum usuário além do administrador inicial. Cadastre
                    membros da equipe conforme necessário.
                  </td>
                </tr>
              ) : (
                data?.items.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{u.fullName}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.roles.join(', ')}</td>
                    <td className="px-4 py-3">{u.status}</td>
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
