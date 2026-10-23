'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { apiFormRequest } from '@/lib/api-form';
import { useApi } from '@/hooks/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type PreviewLine = {
  lineNumber: number;
  description: string;
  quantity: number;
  unitCost: number;
  productId?: string;
  extractConfidence?: number;
};

export default function EntradaMercadoriasPage() {
  const api = useApi();
  const { accessToken, hasPermission } = useAuth();
  const canManage = hasPermission('goods_receipt.manage');
  const router = useRouter();
  const qc = useQueryClient();
  const [lines, setLines] = useState<PreviewLine[]>([]);
  const [meta, setMeta] = useState({
    documentNumber: '',
    accessKey: '',
    supplierId: '',
  });

  const { data: suppliers } = useQuery<{ items: { id: string; legalName: string }[] }>({
    queryKey: ['suppliers'],
    queryFn: () => api('/suppliers?pageSize=100'),
  });

  const { data: products } = useQuery<{ items: { id: string; name: string }[] }>({
    queryKey: ['products-picker'],
    queryFn: () => api('/products?pageSize=200'),
  });

  const { data: list } = useQuery<{ items: { id: string; documentNumber: string | null; status: string }[] }>({
    queryKey: ['goods-receipts'],
    queryFn: () => api('/goods-receipts'),
  });

  const parseCsv = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFormRequest<{ lines: PreviewLine[] }>(
        '/goods-receipts/parse-csv',
        fd,
        accessToken,
      );
    },
    onSuccess: (res) => setLines(res.lines),
  });

  const saveDraft = useMutation<{ id: string }>({
    mutationFn: () =>
      api<{ id: string }>('/goods-receipts', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: meta.supplierId || undefined,
          documentNumber: meta.documentNumber || undefined,
          accessKey: meta.accessKey || undefined,
          items: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitCost: l.unitCost,
            productId: l.productId,
            extractConfidence: l.extractConfidence,
          })),
        }),
      }),
    onSuccess: (receipt: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['goods-receipts'] });
      router.push(`/entrada-mercadorias/${receipt.id}`);
    },
  });

  return (
    <div>
      <PageHeader
        title="Entrada de mercadorias"
        description="Importação CSV, conferência e confirmação de estoque."
      />

      {canManage ? (
        <section className="mb-8 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold">Importar planilha CSV</h2>
          <p className="mt-1 text-sm text-slate-600">
            PDF, imagens e XLSX dependem de OCR ou parser adicional. Use CSV com
            colunas como codigo, descricao, quantidade, valor_unitario.
          </p>
          <input
            type="file"
            accept=".csv,.txt"
            className="mt-3 text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseCsv.mutate(f);
            }}
          />
          {parseCsv.isError ? (
            <Alert>{parseCsv.error.message}</Alert>
          ) : null}
        </section>
      ) : null}

      {lines.length > 0 && canManage ? (
        <section className="mb-8 space-y-3 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold">Conferência</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              label="Número do documento"
              value={meta.documentNumber}
              onChange={(e) =>
                setMeta((m) => ({ ...m, documentNumber: e.target.value }))
              }
            />
            <Input
              label="Chave de acesso"
              value={meta.accessKey}
              onChange={(e) => setMeta((m) => ({ ...m, accessKey: e.target.value }))}
            />
            <label className="text-sm">
              Fornecedor
              <select
                className="mt-1 w-full rounded-md border px-2 py-2"
                value={meta.supplierId}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, supplierId: e.target.value }))
                }
              >
                <option value="">Opcional</option>
                {suppliers?.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.legalName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="divide-y border-t text-sm">
            {lines.map((line, idx) => (
              <li key={line.lineNumber} className="grid gap-2 py-3 sm:grid-cols-4">
                <span>{line.description}</span>
                <span>Qtd: {line.quantity}</span>
                <label>
                  Produto
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={line.productId ?? ''}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, productId: e.target.value || undefined };
                      setLines(next);
                    }}
                  >
                    <option value="">Selecione</option>
                    {products?.items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-slate-600">
                  Confiança:{' '}
                  {line.extractConfidence != null
                    ? `${Math.round(line.extractConfidence * 100)}%`
                    : 'N/A'}
                </span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            onClick={() => saveDraft.mutate()}
            disabled={saveDraft.isPending}
          >
            Salvar rascunho para conferência
          </Button>
        </section>
      ) : null}

      <h2 className="text-sm font-semibold">Entradas registradas</h2>
      <ul className="mt-2 divide-y rounded-lg border bg-white">
        {list?.items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-slate-600">
            Nenhuma entrada. Importe um CSV ou cadastre manualmente na conferência.
          </li>
        ) : (
          list?.items.map((r) => (
            <li key={r.id} className="flex justify-between px-4 py-3 text-sm">
              <span>
                {r.documentNumber ?? 'Sem número'} · {r.status}
              </span>
              <Link href={`/entrada-mercadorias/${r.id}`} className="underline">
                Abrir
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
