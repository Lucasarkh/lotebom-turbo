import { defineStore } from 'pinia';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SYSADMIN' | 'LOTEADORA' | 'CORRETOR';
  tenantId?: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: null as string | null,
    refreshToken: null as string | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.accessToken,
    isSysAdmin: (state) => state.user?.role === 'SYSADMIN',
    isLoteadora: (state) => state.user?.role === 'LOTEADORA',
    isCorretor: (state) => state.user?.role === 'CORRETOR',
    canManageTenants: (state) => state.user?.role === 'SYSADMIN',
    canManageUsers: (state) => ['SYSADMIN', 'LOTEADORA'].includes(state.user?.role ?? ''),
    canEdit: (state) => ['SYSADMIN', 'LOTEADORA'].includes(state.user?.role ?? ''),
    userRole: (state) => state.user?.role ?? null,
  },

  actions: {
    setAuth(data: { user: User; access_token: string; refresh_token: string }) {
      this.user = data.user;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      if (import.meta.client) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    },

    logout() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      if (import.meta.client) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    },

    loadFromStorage() {
      if (import.meta.client) {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        const raw = localStorage.getItem('user');
        if (raw) {
          try { this.user = JSON.parse(raw); } catch { this.user = null; }
        }
      }
    },

    getDashboardRoute(): string {
      return '/painel';
    },
  },
});
