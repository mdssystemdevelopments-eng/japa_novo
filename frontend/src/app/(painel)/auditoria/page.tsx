'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useApi } from '@/hooks/use-api';
import { formatDateTime } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { fullName: string; email: string } | null;
};

type ListResponse = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AuditoriaPage() {
  const api = useApi();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery<ListResponse>({
    queryKey: ['audit', page],
    queryFn: () => api(`/audit?page=${page}&pageSize=20`),
  });

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Registro de operações sensíveis no sistema."
      />
      {isError ? (
        <Alert>Não foi possível carregar o histórico de auditoria.</Alert>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-600">
                    Nenhum registro ainda. Ações como login e alterações
                    cadastrais serão listadas aqui.
                  </td>
                </tr>
              ) : (
                data?.items.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {row.user?.fullName ?? 'Sistema'}
                    </td>
                    <td className="px-4 py-3">{row.action}</td>
                    <td className="px-4 py-3">
                      {row.entityType}
                      {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
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
