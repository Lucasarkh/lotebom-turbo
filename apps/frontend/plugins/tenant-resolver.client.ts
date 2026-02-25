import { defineNuxtPlugin } from '#app';
import { useTenantStore } from '~/stores/tenant';
import { usePublicApi } from '~/composables/usePublicApi';

export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run in client for SPA context (hostname check)
  if (!process.client) return;

  const tenantStore = useTenantStore();
  const api = usePublicApi();
  const hostname = window.location.hostname;
  const mainDomain = 'lotio.com.br'; // Should be config driven in production

  // 1. Determine if we need to resolve via Host (Custom Domain)
  // Or handle it universally by calling the resolve-tenant endpoint
  // The endpoint is designed to catch BOTH Host-based and Path-based if configured.
  // We'll call it for every load since Host must be checked ANYWAY.
  
  try {
    // We send current query/project slugs if they exist on load for fallback logic
    // But since this is a global plugin, we focus on the Host resolution.
    const config = await api.get('/p/resolve-tenant').catch(async (e) => {
        // Fallback for path-based slugs (lotio.com.br/projeto-slug)
        // Nuxt router/params will handle pages, but store needs common data
        return null;
    });

    if (config) {
      tenantStore.setTenantConfig(config);
      
      // Handle initial redirect if we match a project domain at the root
      if (window.location.pathname === '/' && config.projectId && config.project?.slug) {
          const hostname = window.location.hostname;
          const isMainDomain = hostname === 'lotio.com.br' || hostname === 'localhost';

          if (isMainDomain) {
            const slug = config.project.slug;
            navigateTo(`/${slug}`, { replace: true });
          }
      }
    } else {
        // Non-recognized domain or main domain without project context
        // This is normal for index.vue, but we set isLoaded to continue.
        tenantStore.isLoaded = true;
    }
  } catch (err: any) {
    console.error('Failed to resolve tenant configuration:', err);
    tenantStore.setError('Loteadora não encontrada ou erro na plataforma.');
    
    // If essential for application load, redirect or block
    if (hostname !== mainDomain && !hostname.includes('localhost')) {
       // navigateTo('/404') or similar logic
    }
  }
});
