import { useTracking } from '../composables/useTracking';

export default defineNuxtRouteMiddleware(async (to) => {
  if (!process.client) return;

  const tracking = useTracking();
  const route = useRoute();

  // Extract project from URL if available
  // Path format: /[slug]
  const projectSlug = to.params.slug as string;

  // Initializing session if needed
  if (projectSlug) {
    // Pass slug so backend can resolve early for correct association in dashboard
    await tracking.initTracking({
      projectSlug: projectSlug,
      realtorCode: to.query.c as string,
    });
  }

  // Tracking page view (will only work if session already exists, i.e., non-entry pages)
  const isLotPage = to.path.includes('/lote/');
  const isProjectPage = to.params.slug && to.path.includes(to.params.slug as string);
  
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
