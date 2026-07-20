import type { LoginInput, ProgressInput, RegisterInput, UserProgress } from '@manyou/shared';

const base = import.meta.env.VITE_API_BASE ?? '/api';
let accessToken = '';

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${base}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401 && retry && path !== '/auth/refresh') {
    const restored = await refreshSession();
    if (restored) return request<T>(path, options, false);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? '请求失败');
  }
  if (response.status === 204) return undefined as T;
  return (await response.json() as { data: T }).data;
}

export interface Session { user: { id: string; username: string; displayName: string }; accessToken: string }

export async function register(input: RegisterInput) {
  const session = await request<Session>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
  accessToken = session.accessToken;
  return session.user;
}

export async function login(input: LoginInput) {
  const session = await request<Session>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  accessToken = session.accessToken;
  return session.user;
}

export async function refreshSession() {
  try {
    const session = await request<Session>('/auth/refresh', { method: 'POST' }, false);
    accessToken = session.accessToken;
    return session.user;
  } catch {
    accessToken = '';
    return null;
  }
}

export async function logout() {
  await request<void>('/auth/logout', { method: 'POST' }, false).catch(() => undefined);
  accessToken = '';
}

export const getProgress = () => request<UserProgress | null>('/users/me/progress');
export const saveProgress = (input: ProgressInput) => request<UserProgress>('/users/me/progress', { method: 'PUT', body: JSON.stringify(input) });
export const checkin = (spotId: string) => request<UserProgress>('/users/me/checkins', { method: 'POST', body: JSON.stringify({ spotId }) });
export const cancelCheckin = (spotId: string) => request<void>('/users/me/checkins/' + spotId, { method: 'DELETE' });
