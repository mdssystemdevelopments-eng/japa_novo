'use client';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import { useCallback } from 'react';

export function useApi() {
  const { accessToken } = useAuth();

  return useCallback(
    <T,>(path: string, options: RequestInit = {}) =>
      apiRequest<T>(path, { ...options, token: accessToken }),
    [accessToken],
  );
}
