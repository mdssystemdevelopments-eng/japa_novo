'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useApi } from '@/hooks/use-api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  legalName: z.string().min(2, 'Informe a razão social.'),
  tradeName: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  timezone: z.string().min(1),
  locale: z.string().min(2),
});

type FormData = z.infer<typeof schema>;

type Company = FormData & { id: string };

export default function ConfiguracoesPage() {
  const api = useApi();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('company.update');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<Company>({
    queryKey: ['company'],
    queryFn: () => api('/companies/me'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data) {
      reset({
        legalName: data.legalName,
        tradeName: data.tradeName ?? '',
        document: data.document ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        timezone: data.timezone,
        locale: data.locale,
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (body: FormData) =>
      api<Company>('/companies/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (updated) => {
      reset(updated);
      qc.setQueryData(['company'], updated);
    },
  });

  return (
    <div>
      <PageHeader
        title="Configurações da empresa"
        description="Dados cadastrais e regionalização do sistema."
      />
      {isError ? (
        <Alert>Não foi possível carregar os dados da empresa.</Alert>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : (
        <form
          className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <Input
            label="Razão social"
            error={errors.legalName?.message}
            disabled={!canEdit}
            {...register('legalName')}
          />
          <Input
            label="Nome fantasia"
            disabled={!canEdit}
            {...register('tradeName')}
          />
          <Input
            label="CNPJ"
            disabled={!canEdit}
            {...register('document')}
          />
          <Input label="Telefone" disabled={!canEdit} {...register('phone')} />
          <Input
            label="E-mail"
            type="email"
            error={errors.email?.message}
            disabled={!canEdit}
            {...register('email')}
          />
          <Input
            label="Fuso horário"
            disabled={!canEdit}
            {...register('timezone')}
          />
          <Input
            label="Localidade"
            disabled={!canEdit}
            {...register('locale')}
          />
          {mutation.isError ? (
            <Alert>
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Erro ao salvar.'}
            </Alert>
          ) : null}
          {mutation.isSuccess ? (
            <Alert variant="success">Alterações salvas.</Alert>
          ) : null}
          {canEdit ? (
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          ) : (
            <p className="text-sm text-slate-600">
              Você possui apenas permissão de leitura nesta área.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
