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
    // Only init if we have a context or it's first page load
    // Note: initTracking has internal guard against multiple init
    await tracking.initTracking({});
  }

  // Tracking page view (will only work if session already exists, i.e., non-entry pages)
  tracking.trackPageView({
    path: to.fullPath,
    label: (to.name as string) || to.path,
  });
});
