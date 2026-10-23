const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar à API. Inicie o backend (npm run dev na pasta japa) e o banco (npm run db:dev).',
      0,
    );
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        'Resposta inválida do servidor. Verifique se a API está rodando em http://localhost:3001.',
        res.status,
      );
    }
  }

  if (!res.ok) {
    let message: string | null = null;
    const body = data as { message?: unknown } | null;
    if (body?.message) {
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (
        typeof body.message === 'object' &&
        body.message &&
        'message' in body.message &&
        typeof (body.message as { message: string }).message === 'string'
      ) {
        message = (body.message as { message: string }).message;
      }
    }
    throw new ApiError(
      message ?? 'Não foi possível concluir a operação.',
      res.status,
      data,
    );
  }

  return data as T;
}
