<template>
  <div class="painel-layout min-h-screen bg-p-base text-p-text">
    <!-- Top Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 h-14 border-b border-p-border bg-p-raised/95 backdrop-blur-sm">
      <div class="flex h-full items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <!-- Hamburger (mobile) -->
          <button
            type="button"
            class="rounded-lg p-1.5 -ml-1.5 text-p-text-secondary hover:bg-p-overlay hover:text-p-text transition-colors md:hidden"
            @click="sidebarOpen = !sidebarOpen"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!sidebarOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <NuxtLink :to="homeRoute" class="flex items-center">
            <img src="/img/logo-white.svg" alt="Lotio" class="h-6" />
          </NuxtLink>
          <span class="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 bg-p-accent/10 text-p-accent">
            {{ roleLabel }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/painel/notificacoes"
            class="relative rounded-lg p-2 text-p-text-secondary hover:bg-p-overlay hover:text-p-text transition-colors"
          >
            <i class="bi bi-bell text-xl"></i>
            <span v-if="unreadCount > 0" class="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-p-danger px-1 text-[10px] font-bold text-white">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg p-2 text-p-text-secondary hover:bg-p-overlay hover:text-p-text transition-colors"
            :title="themeStore.isDark ? 'Modo claro' : 'Modo escuro'"
            @click="themeStore.toggle()"
          >
            <i :class="themeStore.isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill'" class="text-lg"></i>
          </button>
          <span class="hidden sm:block text-sm text-p-text-secondary">{{ authStore.user?.name }}</span>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-p-text-muted hover:text-p-danger transition-colors"
            @click="handleLogout"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/60 md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <div class="pt-14">
      <div class="flex w-full">
        <!-- Sidebar -->
        <aside
          class="fixed left-0 top-14 bottom-0 z-40 w-64 flex flex-col border-r border-p-border bg-p-raised transition-transform duration-200 md:translate-x-0 overflow-y-auto"
          :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
        >
          <!-- User card -->
          <div class="border-b border-p-border px-4 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-p-accent/15 text-p-accent text-xs font-bold">
                {{ initials }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-p-text">{{ authStore.user?.name }}</p>
                <p class="truncate text-xs text-p-text-muted">{{ roleLabel }}</p>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 px-3 py-4">
            <div class="space-y-1">
              <!-- Dashboard -->
              <NuxtLink
                v-if="showDashboardEntry"
                :to="homeRoute"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                :class="isActive(homeRoute)
                  ? 'bg-p-accent/10 text-p-accent'
                  : 'text-p-text-secondary hover:bg-p-overlay hover:text-p-text'"
                @click="sidebarOpen = false"
              >
                <i class="bi bi-grid text-[18px] shrink-0"></i>
                <span>Dashboard</span>
              </NuxtLink>

              <!-- Notifications -->
              <NuxtLink
                to="/painel/notificacoes"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                :class="isActive('/painel/notificacoes')
                  ? 'bg-p-accent/10 text-p-accent'
                  : 'text-p-text-secondary hover:bg-p-overlay hover:text-p-text'"
                @click="sidebarOpen = false"
              >
                <div class="relative">
                  <i class="bi bi-bell text-[18px] shrink-0"></i>
                  <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-p-danger" />
                </div>
                <span class="flex-1">Notificações</span>
                <span v-if="unreadCount > 0" class="rounded-full bg-p-danger/15 px-2 py-0.5 text-[11px] font-bold text-p-danger">
                  {{ unreadCount > 99 ? '99+' : unreadCount }}
                </span>
              </NuxtLink>

              <!-- SYSADMIN Menu -->
              <template v-if="authStore.isSysAdmin">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Administração</span>
                </div>
                <NavItem to="/painel/tenants" label="Loteadoras" @click="sidebarOpen = false">
                  <i class="bi bi-buildings text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/mensagens" label="Mensagens" @click="sidebarOpen = false">
                  <i class="bi bi-chat-left-text text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/configuracoes" label="Configurações" @click="sidebarOpen = false">
                  <i class="bi bi-gear text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/backups" label="Backups" @click="sidebarOpen = false">
                  <i class="bi bi-cloud-arrow-down text-[18px] shrink-0"></i>
                </NavItem>
              </template>

              <!-- LOTEADORA Menu -->
              <template v-if="authStore.isLoteadora">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Gestão</span>
                </div>
                <NavItem v-if="authStore.canReadFeature('projects')" to="/painel/projetos" label="Projetos" @click="sidebarOpen = false">
                  <i class="bi bi-folder2 text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('projects')" to="/painel/reservas" label="Reservas" @click="sidebarOpen = false">
                  <i class="bi bi-bookmark-plus text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('leads')" to="/painel/leads" label="Leads" @click="sidebarOpen = false">
                  <i class="bi bi-people text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('distribution')" to="/painel/distribuicao" label="Distribuição" @click="sidebarOpen = false">
                  <i class="bi bi-diagram-3 text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('scheduling')" to="/painel/agendamentos" label="Agendamentos" @click="sidebarOpen = false">
                  <i class="bi bi-calendar3 text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('agencies')" to="/painel/imobiliarias" label="Imobiliárias" @click="sidebarOpen = false">
                  <i class="bi bi-building text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('realtors')" to="/painel/corretores" label="Corretores" @click="sidebarOpen = false">
                  <i class="bi bi-person-badge text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('payments')" to="/painel/pagamentos" label="Pagamentos" @click="sidebarOpen = false">
                  <i class="bi bi-credit-card text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('campaigns')" to="/painel/campanhas" label="Campanhas" @click="sidebarOpen = false">
                  <i class="bi bi-megaphone text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('ai')" to="/painel/ai" label="Assistente IA" @click="sidebarOpen = false">
                  <i class="bi bi-robot text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('signupLinks')" to="/painel/links-cadastro" label="Links de Cadastro" @click="sidebarOpen = false">
                  <i class="bi bi-link-45deg text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem v-if="authStore.canReadFeature('metrics') || authStore.isCorretor" to="/painel/metricas" label="Métricas" @click="sidebarOpen = false">
                  <i class="bi bi-bar-chart-line text-[18px] shrink-0"></i>
                </NavItem>
              </template>

              <!-- CORRETOR Menu -->
              <template v-if="authStore.isCorretor">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Minha Área</span>
                </div>
                <NavItem to="/painel/leads" label="Meus Leads" @click="sidebarOpen = false">
                  <i class="bi bi-people text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/meus-links" label="Meus Links" @click="sidebarOpen = false">
                  <i class="bi bi-link-45deg text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/reservar" label="Reservar Lote" @click="sidebarOpen = false">
                  <i class="bi bi-geo-alt text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/agendamentos" label="Agendamentos" @click="sidebarOpen = false">
                  <i class="bi bi-calendar3 text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/campanhas" label="Campanhas" @click="sidebarOpen = false">
                  <i class="bi bi-megaphone text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/metricas" label="Métricas" @click="sidebarOpen = false">
                  <i class="bi bi-bar-chart-line text-[18px] shrink-0"></i>
                </NavItem>
              </template>

              <!-- IMOBILIARIA Menu -->
              <template v-if="authStore.isImobiliaria">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Equipe</span>
                </div>
                <NavItem to="/painel/leads" label="Leads da Equipe" @click="sidebarOpen = false">
                  <i class="bi bi-people text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/corretores" label="Minha Equipe" @click="sidebarOpen = false">
                  <i class="bi bi-person-badge text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/reservar" label="Reservar Lote" @click="sidebarOpen = false">
                  <i class="bi bi-geo-alt text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/agendamentos" label="Agendamentos" @click="sidebarOpen = false">
                  <i class="bi bi-calendar3 text-[18px] shrink-0"></i>
                </NavItem>
                <NavItem to="/painel/metricas-imobiliaria" label="Métricas da Equipe" @click="sidebarOpen = false">
                  <i class="bi bi-bar-chart-line text-[18px] shrink-0"></i>
                </NavItem>
              </template>

              <!-- API Keys for Agents -->
              <template v-if="authStore.isLoteadora">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Integrações</span>
                </div>
                <NavItem to="/painel/chaves-api" label="Chaves API (Agentes)" @click="sidebarOpen = false">
                  <i class="bi bi-key text-[18px] shrink-0"></i>
                </NavItem>
              </template>

              <!-- Common: User Management -->
              <template v-if="authStore.canManageUsers">
                <div class="pt-4 pb-1 px-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Configurações</span>
                </div>
                <NavItem to="/painel/usuarios" label="Gerenciar Usuários" @click="sidebarOpen = false">
                  <i class="bi bi-person-gear text-[18px] shrink-0"></i>
                </NavItem>
              </template>

              <!-- Common: Support & Profile -->
              <div class="pt-4 pb-1 px-3">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Conta</span>
              </div>
              <NavItem to="/painel/suporte" label="Suporte" @click="sidebarOpen = false">
                <i class="bi bi-question-circle text-[18px] shrink-0"></i>
              </NavItem>
              <NavItem to="/painel/perfil" label="Meu Perfil" @click="sidebarOpen = false">
                <i class="bi bi-person-circle text-[18px] shrink-0"></i>
              </NavItem>
            </div>
          </nav>
        </aside>

        <!-- Main content -->
        <main class="min-w-0 flex-1 px-4 py-6 md:ml-64 md:px-8 md:py-8">
          <slot />
        </main>
      </div>
    </div>

    <!-- Terms Acceptance Modal -->
    <CommonTermsAcceptanceModal
      :visible="showTermsModal"
      @accepted="onTermsAccepted"
      @declined="onTermsDeclined"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const router = useRouter()
const route = useRoute()
const { success: toastSuccess } = useToast()
const sidebarOpen = ref(false)
const homeRoute = computed(() => authStore.getDashboardRoute())
const showDashboardEntry = computed(() => !(authStore.isLoteadora && authStore.hasPanelRestrictions))

const { unreadCount, startPolling, stopPolling } = useNotifications()

onMounted(() => {
  themeStore.init()
  if (authStore.isLoggedIn) startPolling(60000)
})
onUnmounted(() => stopPolling())

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

// Terms acceptance modal
const showTermsModal = computed(() => {
  return authStore.isLoggedIn && !authStore.hasAcceptedTerms
})

const onTermsAccepted = () => {
  toastSuccess('Termos aceitos com sucesso!')
}

const onTermsDeclined = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  toastSuccess('Sessão encerrada')
  router.push('/login')
}

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
    LOTEADORA: authStore.hasPanelRestrictions ? 'Usuário do sistema' : 'Loteadora',
    IMOBILIARIA: 'Imobiliária',
    CORRETOR: 'Corretor'
  }
  return map[authStore.user?.role] ?? 'Usuário'
})

const handleLogout = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  toastSuccess('Sessão encerrada')
  sidebarOpen.value = false
  router.push('/login')
}

function isActive(to) {
  if (to === '/painel' || to === '/painel/') return route.path === '/painel' || route.path === '/painel/'
  return route.path.startsWith(to)
}

// Close sidebar on route change (mobile)
watch(() => route.path, () => {
  sidebarOpen.value = false
})

// NavItem functional component
const NavItem = defineComponent({
  props: {
    to: { type: String, required: true },
    label: { type: String, required: true },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => h(
      resolveComponent('NuxtLink'),
      {
        to: props.to,
        class: [
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive(props.to)
            ? 'bg-p-accent/10 text-p-accent'
            : 'text-p-text-secondary hover:bg-p-overlay hover:text-p-text'
        ],
        onClick: () => emit('click')
      },
      () => [slots.default?.(), h('span', null, props.label)]
    )
  }
})
</script>
