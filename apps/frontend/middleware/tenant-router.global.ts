import { useTenantStore } from '~/stores/tenant';

export default defineNuxtRouteMiddleware(async (to) => {
  const tenantStore = useTenantStore();

  // On client side, wait for the resolver plugin to finish if needed
  if (process.client && !tenantStore.isLoaded) {
    // Polling or a more reactive way to wait for isLoaded
    // This is simple and effective for initial load
    let count = 0;
    while (!tenantStore.isLoaded && count < 20) { // Max 2 seconds
        await new Promise(r => setTimeout(r, 100));
        count++;
    }
  }

  // If we are at the root '/' and a project was resolved via Domain
  if (to.path === '/' && tenantStore.config?.projectId && tenantStore.config.project?.slug) {
    const slug = tenantStore.config.project.slug;
    
    // Only redirect to /[slug] if we are on the main domain (lotio.com.br or localhost)
    // On a custom domain, we want to keep the URL as '/'
    const host = process.client ? window.location.host : '';
    const isMainDomain = host.includes('lotio.com.br') || host.includes('localhost:3000');

    if (isMainDomain) {
      return navigateTo(`/${slug}`, { replace: true });
    }
  }

  // If a tenant domain is used but no specific project (e.g. vendas.loteadora.com.br)
  // You could redirect to a list of projects or a specific featured project here.
  if (to.path === '/' && tenantStore.config?.tenantId && !tenantStore.config?.projectId) {
     // Optional: navigateTo('/empreendimentos') 
  }
});
