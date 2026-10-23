'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function Form() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Token ausente. Solicite um novo link de recuperação.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8">
      <h1 className="text-xl font-semibold text-slate-900">Nova senha</h1>
      {done ? (
        <>
          <Alert variant="success">Senha redefinida com sucesso.</Alert>
          <p className="mt-4 text-sm">
            <Link href="/login" className="text-slate-700 underline">
              Ir para o login
            </Link>
          </p>
        </>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input
            label="Nova senha"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Suspense fallback={<p className="text-sm text-slate-600">Carregando...</p>}>
        <Form />
      </Suspense>
    </div>
  );
}
