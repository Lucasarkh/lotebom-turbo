<template>
  <div class="relative flex items-center" ref="bellRef">
    <button
      class="relative flex items-center justify-center p-2 rounded-lg bg-transparent border-none cursor-pointer text-p-text-muted transition-all duration-150 hover:bg-white/[0.06] hover:text-p-text-secondary"
      @click="toggleDropdown"
      :aria-label="`Notificações${unreadCount > 0 ? ` — ${unreadCount} não lidas` : ''}`"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute top-0.5 right-0.5 bg-p-accent text-white text-[0.625rem] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 leading-none border-[1.5px] border-p-base"
      >{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed w-[360px] max-sm:w-[calc(100vw-16px)] max-sm:!right-2 bg-p-base/[0.97] backdrop-blur-[20px] border border-p-border rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[9999] overflow-hidden animate-[dropdown-in_150ms_ease]"
        :style="dropdownStyle"
      >
        <div class="flex items-center justify-between px-4 py-3.5 border-b border-p-border gap-2">
          <span class="text-sm font-bold text-p-text">Notificações</span>
          <div class="flex items-center gap-3">
            <button
              v-if="unreadCount > 0"
              class="bg-transparent border-none cursor-pointer text-xs text-p-accent p-0 font-inherit transition-colors duration-150 hover:text-p-accent-hover"
              @click="handleMarkAllAsRead"
            >
              Marcar todas como lidas
            </button>
            <NuxtLink
              to="/painel/notificacoes"
              class="text-xs text-p-text-muted no-underline transition-colors duration-150 hover:text-p-text-secondary"
              @click="open = false"
            >
              Ver todas
            </NuxtLink>
          </div>
        </div>

        <div class="max-h-[420px] overflow-y-auto">
          <div v-if="loading" class="flex flex-col items-center justify-center py-10 px-4 gap-3 text-p-text-muted">
            <div class="w-6 h-6 border-2 border-p-border border-t-p-accent rounded-full animate-spin"></div>
          </div>
          <div v-else-if="recentItems.length === 0" class="flex flex-col items-center justify-center py-10 px-4 gap-3 text-p-text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p class="text-sm m-0">Nenhuma notificação</p>
          </div>
          <template v-else>
            <div
              v-for="n in recentItems"
              :key="n.id"
              class="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 border-b border-white/[0.04] last:border-b-0 relative"
              :class="!n.isRead ? 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]' : 'hover:bg-white/[0.04]'"
              @click="handleNotificationClick(n)"
            >
              <div
                class="w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                :class="{
                  'bg-emerald-500/[0.12] text-emerald-400': n.type === 'NEW_LEAD',
                  'bg-blue-500/[0.12] text-blue-400': n.type === 'NEW_SCHEDULING',
                  'bg-yellow-500/[0.12] text-yellow-400': n.type === 'LEAD_MILESTONE' || n.type === 'ACCESS_MILESTONE',
                  'bg-violet-500/[0.12] text-violet-400': n.type !== 'NEW_LEAD' && n.type !== 'NEW_SCHEDULING' && n.type !== 'LEAD_MILESTONE' && n.type !== 'ACCESS_MILESTONE'
                }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
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
              <div class="flex-1 min-w-0">
                <div class="text-[0.8125rem] font-semibold text-p-text mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{{ n.title }}</div>
                <div class="text-xs text-p-text-muted leading-[1.4] line-clamp-2">{{ n.message }}</div>
                <div class="text-[0.6875rem] text-p-text-muted mt-1">{{ formatTime(n.createdAt) }}</div>
              </div>
              <div v-if="!n.isRead" class="w-[7px] h-[7px] rounded-full bg-p-accent shrink-0 mt-1.5"></div>
            </div>
          </template>
        </div>
      </div>

      <!-- Backdrop -->
      <div v-if="open" class="fixed inset-0 z-[9998]" @click="open = false"></div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const { unreadCount, notifications, loading, fetchNotifications, markAsRead, markAllAsRead, startPolling, stopPolling } = useNotifications()
const router = useRouter()

const open = ref(false)
const bellRef = ref(null)
const dropdownStyle = ref({})

const recentItems = computed(() => notifications.value.items.slice(0, 8))

function toggleDropdown() {
  open.value = !open.value
  if (open.value) {
    fetchNotifications(1, 20)
    positionDropdown()
  }
}

function positionDropdown() {
  if (!bellRef.value) return
  const rect = bellRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
}

async function handleNotificationClick(n) {
  if (!n.isRead) await markAsRead(n.id)
  open.value = false
  if (n.actionUrl) router.push(n.actionUrl)
}

async function handleMarkAllAsRead() {
  await markAllAsRead()
}

function typeIconClass(type) {
  return {
    'system': 'icon-system',
    'NEW_LEAD': 'icon-lead',
    'NEW_SCHEDULING': 'icon-scheduling',
    'LEAD_MILESTONE': 'icon-milestone',
    'ACCESS_MILESTONE': 'icon-milestone',
  }[type] || 'icon-system'
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Agora mesmo'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} dias atrás`
  return date.toLocaleDateString('pt-BR')
}

onMounted(() => {
  startPolling(60000)
  window.addEventListener('resize', positionDropdown)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('resize', positionDropdown)
})
</script>
