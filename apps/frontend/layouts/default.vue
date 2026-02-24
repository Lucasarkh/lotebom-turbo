<template>
  <div class="layout">
    <!-- Mobile hamburger overlay -->
    <div v-if="mobileMenuOpen && authStore.isLoggedIn" class="mobile-overlay" @click="mobileMenuOpen = false"></div>

    <aside v-if="authStore.isLoggedIn" class="sidebar" :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileMenuOpen }">
      <div class="sidebar-brand">
        <div class="brand-icon">L</div>
        <span v-if="!sidebarCollapsed" class="brand-text">Lotio</span>
      </div>

      <div v-if="!sidebarCollapsed" class="user-card">
        <div class="user-avatar">{{ initials }}</div>
        <div class="user-details">
          <div class="user-name">{{ authStore.user?.name }}</div>
          <div class="user-role">{{ roleLabel }}</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- Dashboard always present -->
        <NuxtLink to="/painel" class="nav-item" :title="sidebarCollapsed ? 'Dashboard' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span v-if="!sidebarCollapsed">Dashboard</span>
        </NuxtLink>

        <!-- SYSADMIN Menu -->
        <template v-if="authStore.isSysAdmin">
          <NuxtLink to="/painel/tenants" class="nav-item" :title="sidebarCollapsed ? 'Loteadoras' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21v-4m5 4v-4m5 4v-4m5 4v-4m-11-7a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2z"/></svg>
            <span v-if="!sidebarCollapsed">Loteadoras</span>
          </NuxtLink>
          <NuxtLink to="/painel/mensagens" class="nav-item" :title="sidebarCollapsed ? 'Mensagens' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span v-if="!sidebarCollapsed">Mensagens</span>
          </NuxtLink>
          <NuxtLink to="/painel/configuracoes" class="nav-item" :title="sidebarCollapsed ? 'Configurações' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span v-if="!sidebarCollapsed">Configurações</span>
          </NuxtLink>
        </template>

        <!-- LOTEADORA Menu -->
        <template v-if="authStore.isLoteadora">
          <NuxtLink to="/painel/projetos" class="nav-item" :title="sidebarCollapsed ? 'Projetos' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            <span v-if="!sidebarCollapsed">Projetos</span>
          </NuxtLink>

          <NuxtLink to="/painel/leads" class="nav-item" :title="sidebarCollapsed ? 'Leads' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Leads</span>
          </NuxtLink>

          <NuxtLink to="/painel/corretores" class="nav-item" :title="sidebarCollapsed ? 'Corretores' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Corretores</span>
          </NuxtLink>
        </template>

        <!-- CORRETOR Menu -->
        <template v-if="authStore.isCorretor">
           <NuxtLink to="/painel/leads" class="nav-item" :title="sidebarCollapsed ? 'Meus Leads' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Meus Leads</span>
          </NuxtLink>

          <NuxtLink to="/painel/campanhas" class="nav-item" :title="sidebarCollapsed ? 'Campanhas' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 15h2m-2-4h2m-2-4h2M9 21h6a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            <span v-if="!sidebarCollapsed">Campanhas</span>
          </NuxtLink>
        </template>

        <!-- Common items like Metrics if allowed -->
        <NuxtLink v-if="!authStore.isSysAdmin" to="/painel/metricas" class="nav-item" :title="sidebarCollapsed ? 'Métricas' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span v-if="!sidebarCollapsed">Métricas</span>
        </NuxtLink>

        <!-- User Management -->
        <template v-if="authStore.canManageUsers">
          <div class="nav-group-label" v-if="!sidebarCollapsed">Configurações</div>
          <NuxtLink to="/painel/usuarios" class="nav-item" :title="sidebarCollapsed ? 'Usuários' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span v-if="!sidebarCollapsed">Gerenciar Usuários</span>
          </NuxtLink>
        </template>

        <NuxtLink to="/painel/perfil" class="nav-item" :title="sidebarCollapsed ? 'Perfil' : undefined">
           <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
           <span v-if="!sidebarCollapsed">Meu Perfil</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item logout-btn" @click="handleLogout" :title="sidebarCollapsed ? 'Sair' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span v-if="!sidebarCollapsed">Sair</span>
        </button>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :style="{ transform: sidebarCollapsed ? 'rotate(180deg)' : '' }"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
        </button>
      </div>
    </aside>

    <main class="main-content" :class="{ 'no-sidebar': !authStore.isLoggedIn, 'sidebar-collapsed': authStore.isLoggedIn && sidebarCollapsed }">
      <!-- Mobile hamburger button -->
      <button v-if="authStore.isLoggedIn" class="mobile-hamburger" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const { success: toastSuccess } = useToast()
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)

const initials = computed(() => {
  const n = authStore.user?.name ?? ''
  if (!n) return '?'
  const parts = n.split(' ').filter(Boolean)
  return parts.length > 1 
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase()
})

const roleLabel = computed(() => {
  const map = { 
    SYSADMIN: 'System Admin', 
    LOTEADORA: 'Loteadora', 
    CORRETOR: 'Corretor' 
  }
  return map[authStore.user?.role] ?? 'Usuário'
})

const handleLogout = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  toastSuccess('Sessão encerrada')
  mobileMenuOpen.value = false
  router.push('/login')
}
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }

.sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  overflow-y: auto;
}
.sidebar.collapsed { width: 64px; }

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--gray-100);
}
.brand-icon {
  width: 36px; height: 36px;
  background: var(--primary);
  color: white;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.1rem;
  flex-shrink: 0;
}
.brand-text { font-weight: 700; font-size: 1.1rem; color: var(--gray-900); }

.user-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  margin: var(--space-3) var(--space-3) 0;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}
.user-avatar {
  width: 34px; height: 34px;
  border-radius: var(--radius-full);
  background: var(--primary-light);
  color: var(--primary);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
  flex-shrink: 0;
}
.user-details { overflow: hidden; }
.user-name { font-size: 0.8125rem; font-weight: 600; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 0.75rem; color: var(--gray-500); }

.sidebar-nav { flex: 1; padding: var(--space-3); display: flex; flex-direction: column; gap: 2px; }
.nav-group-label { padding: var(--space-3) var(--space-3) var(--space-1); font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gray-400); margin-top: var(--space-3); }

.nav-item {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--gray-600);
  font-size: 0.875rem; font-weight: 500;
  text-decoration: none;
  transition: all var(--transition);
  cursor: pointer; border: none; background: none; width: 100%; text-align: left;
  font-family: var(--font-sans);
}
.nav-item:hover { background: var(--gray-100); color: var(--gray-900); }
.nav-item.router-link-active { background: var(--primary-light); color: var(--primary); font-weight: 600; }
.nav-icon { width: 20px; height: 20px; flex-shrink: 0; }

.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--gray-100);
  display: flex; flex-direction: column; gap: 2px;
}
.logout-btn:hover { color: var(--danger); }
.collapse-btn {
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-2);
  border: none; background: none; cursor: pointer;
  color: var(--gray-400); border-radius: var(--radius-md);
}
.collapse-btn:hover { background: var(--gray-100); color: var(--gray-600); }

.main-content {
  flex: 1; margin-left: 260px;
  padding: var(--space-8);
  transition: margin-left 0.2s ease;
  min-height: 100vh;
  max-width: 100%;
  overflow-x: hidden;
}
.main-content.sidebar-collapsed { margin-left: 64px; }
.main-content.no-sidebar { margin-left: 0; }

@media (max-width: 768px) {
  .sidebar { width: 260px; left: -260px; transition: left 0.25s ease; }
  .sidebar.mobile-open { left: 0; }
  .sidebar .brand-text,
  .sidebar .user-card,
  .sidebar .nav-group-label,
  .sidebar .nav-item span,
  .sidebar .logout-btn span { display: revert; }
  .main-content { margin-left: 0 !important; padding-top: 56px; }
  .mobile-hamburger { display: flex; }
}

.mobile-overlay {
  display: none;
}

.mobile-hamburger {
  display: none;
  position: fixed; top: var(--space-3); left: var(--space-3); z-index: 99;
  background: white; border: 1px solid var(--gray-200); border-radius: var(--radius-md);
  padding: var(--space-2); cursor: pointer; color: var(--gray-700);
  box-shadow: var(--shadow-sm); align-items: center; justify-content: center;
}

@media (max-width: 768px) {
  .mobile-overlay {
    display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 99;
  }
  .sidebar.mobile-open { z-index: 200; }
  .mobile-hamburger { display: flex; }
}
</style>
