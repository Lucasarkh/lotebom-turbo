import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();

  if (!authStore.isLoggedIn) {
    authStore.loadFromStorage();
  }

  // Public routes: login, root, or any tenant/project page
  const publicRoutes = ['/login'];
  const isPainel = to.path.startsWith('/painel');
  const isPublic = publicRoutes.includes(to.path) || !isPainel;

  if (isPublic) {
    if (authStore.isLoggedIn && ['/login'].includes(to.path)) {
      return navigateTo('/painel');
    }
    return;
  }

  // All /painel routes require auth
  if (!authStore.isLoggedIn) {
    return navigateTo('/login');
  }

  // Role-based route protection
  if (to.path.startsWith('/painel/tenants') && !authStore.canManageTenants) {
    return navigateTo('/painel');
  }
  if (to.path.startsWith('/painel/usuarios') && !authStore.canManageUsers) {
    return navigateTo('/painel');
  }
});
