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

  // Canonicalize project routes so main and custom domains use the same page files.
  if (tenantStore.config?.projectId && tenantStore.config.project?.slug) {
    const slug = tenantStore.config.project.slug;
    const canonicalMap: Record<string, string> = {
      '/': '',
      '/unidades': '/unidades',
      '/galeria': '/galeria',
      '/espelho-planta': '/espelho-planta',
    };

    const suffix = canonicalMap[to.path];
    if (suffix !== undefined) {
      return navigateTo(
        { path: `/${slug}${suffix}`, query: to.query },
        { replace: true },
      );
    }
  }

  // If a tenant domain is used but no specific project (e.g. vendas.loteadora.com.br)
  // You could redirect to a list of projects or a specific featured project here.
  if (to.path === '/' && tenantStore.config?.tenantId && !tenantStore.config?.projectId) {
     // Optional: navigateTo('/empreendimentos') 
  }
});
