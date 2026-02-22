import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();

  if (!authStore.isLoggedIn) {
    authStore.loadFromStorage();
  }

  // Public routes: login, cadastro, root, or any tenant/project page
  const publicRoutes = ['/login', '/cadastro'];
  const isPainel = to.path.startsWith('/painel');
  const isPublic = publicRoutes.includes(to.path) || !isPainel;

  if (isPublic) {
    if (authStore.isLoggedIn && ['/login', '/cadastro'].includes(to.path)) {
      return navigateTo('/painel');
    }
    return;
  }

  // Root → redirect
  if (to.path === '/') {
    return navigateTo(authStore.isLoggedIn ? '/painel' : '/login');
  }

  // All /painel routes require auth
  if (!authStore.isLoggedIn) {
    return navigateTo('/login');
  }

  // Role-based route protection
  if (to.path.startsWith('/painel/usuarios') && !authStore.isAdmin) {
    return navigateTo('/painel');
  }
});
