import { useTracking } from '../composables/useTracking';

export default defineNuxtRouteMiddleware(async (to) => {
  if (!process.client) return;

  const tracking = useTracking();
  const route = useRoute();

  // Extract tenant/project from URL if available
  // Path format: /[tenant]/[project]
  const tenant = to.params.tenant as string;
  const project = to.params.project as string;

  // Initializing session if needed
  if (tenant || project) {
    // Pass slugs so backend can resolve early for correct association in dashboard
    await tracking.initTracking({
      tenantSlug: tenant,
      projectSlug: project,
      realtorCode: to.query.c as string,
    });
  }

  // Tracking page view (will only work if session already exists, i.e., non-entry pages)
  const isLotPage = to.path.includes('/lote/');
  const isProjectPage = to.params.project && to.path.includes(to.params.project as string);
  
  // Create a clean, human-readable label
  let label = (to.meta.title as string) || '';
  
  if (isLotPage) {
    // extract code directly from URL to be safe
    const parts = to.path.split('/');
    const code = to.params.code || parts[parts.length - 1];
    label = `Lote ${code || '?'}`;
  } else if (isProjectPage && !to.path.includes('/painel')) {
    label = 'Mapa do Empreendimento';
  } else if (to.path === '/' || to.path === '/painel') {
    label = 'Painel Administrativo';
  } else if (!label) {
    const parts = to.path.split('/').filter(Boolean);
    label = parts.length > 0 ? parts[parts.length - 1] : to.path;
  }

  // Ensure label is never a route name
  if (label && label.includes('-') && label.includes('tenant')) {
     label = to.path;
  }

  tracking.trackPageView({
    path: to.path,
    label: label,
    category: isLotPage ? 'LOT' : 'PAGE',
  });
});
