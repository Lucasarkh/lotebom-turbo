import { defineStore } from 'pinia';

export interface TenantConfig {
  tenantId: string;
  projectId?: string;
  project?: any;
  logo?: string;
  colors?: { primary: string; secondary: string };
  name?: string;
}

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    config: null as TenantConfig | null,
    isLoaded: false,
    error: null as string | null
  }),

  actions: {
    setTenantConfig(config: TenantConfig) {
      this.config = config;
      this.isLoaded = true;
      this.error = null;
    },
    setError(message: string) {
      this.error = message;
      this.isLoaded = true;
    }
  }
});
