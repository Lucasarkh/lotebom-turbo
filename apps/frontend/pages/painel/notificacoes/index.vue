<template>
  <div class="flex flex-col gap-6">
    <UiPageHeader title="Notificações" description="Acompanhe novidades, alertas e marcos importantes.">
      <template #actions>
        <UiButton v-if="unreadCount > 0" variant="secondary" @click="handleMarkAllAsRead">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Marcar todas como lidas
        </UiButton>
        <UiButton v-if="authStore.isSysAdmin" variant="primary" to="/painel/notificacoes/broadcast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
          </svg>
          Enviar notificação
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Filter tabs -->
    <div class="inline-flex items-center gap-1 rounded-lg border border-p-border bg-p-raised p-1">
      <button
        type="button"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="filter === 'all'
          ? 'bg-p-accent text-white'
          : 'text-p-text-secondary hover:text-p-text hover:bg-p-overlay'"
        @click="filter = 'all'"
      >
        Todas
      </button>
      <button
        type="button"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
        :class="filter === 'unread'
          ? 'bg-p-accent text-white'
          : 'text-p-text-secondary hover:text-p-text hover:bg-p-overlay'"
        @click="filter = 'unread'"
      >
        Não lidas
        <span v-if="unreadCount > 0" class="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[11px] font-bold px-1.5 bg-p-danger/20 text-p-danger">{{ unreadCount }}</span>
      </button>
    </div>

    <!-- Loading -->
    <UiLoadingState v-if="loading" />

    <!-- Empty state -->
    <UiEmptyState
      v-else-if="filteredItems.length === 0"
      title="Nenhuma notificação"
      :description="filter === 'unread' ? 'Você está em dia! Nenhuma notificação não lida.' : 'Você não possui notificações ainda.'"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" class="text-p-text-muted">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </template>
    </UiEmptyState>

    <!-- List -->
    <div v-else class="flex flex-col gap-0.5">
      <div
        v-for="n in filteredItems"
        :key="n.id"
        class="flex items-start gap-3.5 rounded-lg border p-4 cursor-pointer transition-all"
        :class="n.isRead
          ? 'bg-p-raised/50 border-p-border hover:bg-p-overlay hover:border-p-border'
          : 'bg-p-accent/5 border-p-accent/15 hover:bg-p-accent/10'"
        @click="handleItemClick(n)"
      >
        <div class="shrink-0 pt-0.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg" :class="typeIconBg(n.type)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <template v-if="n.type === 'NEW_LEAD'">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </template>
              <template v-else-if="n.type === 'NEW_SCHEDULING'">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </template>
              <template v-else-if="n.type === 'LEAD_MILESTONE' || n.type === 'ACCESS_MILESTONE'">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </template>
              <template v-else>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </template>
            </svg>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
            <span class="text-[15px] font-semibold text-p-text">{{ n.title }}</span>
            <span class="text-xs text-p-text-muted whitespace-nowrap">{{ formatTime(n.createdAt) }}</span>
          </div>
          <p class="text-sm text-p-text-secondary mb-2 leading-relaxed">{{ n.message }}</p>
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-p-text-muted bg-p-overlay px-2 py-0.5 rounded">{{ typeLabel(n.type) }}</span>
          </div>
        </div>
        <div class="shrink-0 flex items-center pt-0.5">
          <div v-if="!n.isRead" class="h-2.5 w-2.5 rounded-full bg-p-accent" title="Não lida"></div>
          <button
            v-else-if="n.actionUrl"
            class="rounded p-1 text-p-text-muted hover:text-p-text transition-colors"
            @click.stop="navigateTo(n.actionUrl)"
            title="Ver detalhes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="notifications.totalPages > 1" class="flex items-center justify-center gap-3 py-4">
      <button
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-p-border bg-p-raised text-p-text-secondary transition-colors hover:bg-p-overlay hover:text-p-text disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="notifications.page <= 1"
        @click="loadPage(notifications.page - 1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="text-sm text-p-text-muted">{{ notifications.page }} / {{ notifications.totalPages }}</span>
      <button
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-p-border bg-p-raised text-p-text-secondary transition-colors hover:bg-p-overlay hover:text-p-text disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="notifications.page >= notifications.totalPages"
        @click="loadPage(notifications.page + 1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'painel' })

const authStore = useAuthStore()
const router = useRouter()
const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()

const filter = ref('all')
const pageSize = 20

const filteredItems = computed(() => {
  if (filter.value === 'unread') return notifications.value.items.filter(n => !n.isRead)
  return notifications.value.items
})

async function loadPage(page) {
  await fetchNotifications(page, pageSize)
}

async function handleMarkAllAsRead() {
  await markAllAsRead()
}

async function handleItemClick(n) {
  if (!n.isRead) await markAsRead(n.id)
  if (n.actionUrl) router.push(n.actionUrl)
}

function navigateTo(url) {
  router.push(url)
}

function typeIconBg(type) {
  return {
    NEW_LEAD: 'bg-p-accent/15 text-p-accent',
    NEW_SCHEDULING: 'bg-p-info/15 text-p-info',
    LEAD_MILESTONE: 'bg-p-warning/15 text-p-warning',
    ACCESS_MILESTONE: 'bg-p-warning/15 text-p-warning',
    SYSTEM: 'bg-purple-500/15 text-purple-400',
  }[type] || 'bg-purple-500/15 text-purple-400'
}

function typeLabel(type) {
  return {
    NEW_LEAD: 'Novo lead',
    NEW_SCHEDULING: 'Agendamento',
    LEAD_MILESTONE: 'Marco de leads',
    ACCESS_MILESTONE: 'Marco de acessos',
    SYSTEM: 'Sistema',
  }[type] || 'Notificação'
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Agora mesmo'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} dias atrás`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(() => {
  fetchNotifications(1, pageSize)
})
</script>
