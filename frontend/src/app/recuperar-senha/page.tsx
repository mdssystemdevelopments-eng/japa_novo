'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-slate-900">Recuperar acesso</h1>
        <p className="mt-2 text-sm text-slate-600">
          Informe o e-mail cadastrado. Em produção, o link será enviado por e-mail
          após configurar o serviço de envio. Em desenvolvimento, o link aparece no
          log do backend.
        </p>
        {sent ? (
          <Alert variant="success">
            Se o e-mail estiver cadastrado, você receberá instruções para redefinir
            a senha.
          </Alert>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error ? <Alert>{error}</Alert> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-sm">
          <Link href="/login" className="text-slate-700 underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
