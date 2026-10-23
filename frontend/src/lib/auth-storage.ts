export type StoredUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  company: { id: string; tradeName: string };
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
};

const KEY = 'japa_auth_session';

export function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
