import { useAuthStore } from '../stores/auth';

export const useApi = () => {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const router = useRouter();

  const baseUrl = `${config.public.apiBase}/api`;

  const buildHeaders = (extra: Record<string, string> = {}, json = true) => {
    const h: Record<string, string> = { ...extra };
    if (json) h['Content-Type'] = 'application/json';
    if (authStore.accessToken) h['Authorization'] = `Bearer ${authStore.accessToken}`;
    return h;
  };

  const handleUnauthorized = async (url: string, options: any) => {
    if (!authStore.refreshToken || !authStore.user?.id) {
      authStore.logout();
      router.push('/login');
      throw new Error('Sessão expirada');
    }
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: authStore.user.id, refresh_token: authStore.refreshToken }),
    });
    if (!res.ok) {
      authStore.logout();
      router.push('/login');
      throw new Error('Sessão expirada');
    }
    const data = await res.json();
    authStore.accessToken = data.access_token;
    if (import.meta.client) localStorage.setItem('access_token', data.access_token);

    const retryHeaders = { ...options.headers, Authorization: `Bearer ${data.access_token}` };
    const retry = await fetch(`${baseUrl}${url}`, { ...options, headers: retryHeaders });
    if (!retry.ok) throw new Error((await retry.json().catch(() => ({}))).message || 'Erro');
    const txt = await retry.text();
    return txt ? JSON.parse(txt) : null;
  };

  /** Standard JSON request */
  const fetchApi = async (url: string, options: any = {}) => {
    const headers = buildHeaders(options.headers);
    try {
      const res = await fetch(`${baseUrl}${url}`, { ...options, headers });
      if (res.status === 401) return handleUnauthorized(url, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro na requisição' }));
        throw new Error(err.message || `Erro ${res.status}`);
      }
      const txt = await res.text();
      return txt ? JSON.parse(txt) : null;
    } catch (e: any) {
      console.error('API Error:', e.message);
      throw e;
    }
  };

  /** Multipart upload (do NOT set Content-Type — browser sets boundary) */
  const uploadApi = async (url: string, formData: FormData) => {
    const headers: Record<string, string> = {};
    if (authStore.accessToken) headers['Authorization'] = `Bearer ${authStore.accessToken}`;
    const res = await fetch(`${baseUrl}${url}`, { method: 'POST', headers, body: formData });
    if (res.status === 401) return handleUnauthorized(url, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro no upload' }));
      throw new Error(err.message || `Erro ${res.status}`);
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  };

  return { fetchApi, uploadApi };
};
