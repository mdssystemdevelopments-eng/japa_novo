const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function apiFormRequest<T>(
  path: string,
  form: FormData,
  token?: string | null,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : 'Não foi possível concluir a operação.';
    throw new Error(message);
  }
  return data as T;
}
