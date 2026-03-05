<template>
  <div class="notification-bell" ref="bellRef">
    <button class="bell-btn" @click="toggleDropdown" :aria-label="`Notificações${unreadCount > 0 ? ` — ${unreadCount} não lidas` : ''}`">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="notification-dropdown" :style="dropdownStyle">
        <div class="dropdown-header">
          <span class="dropdown-title">Notificações</span>
          <div class="header-actions">
            <button v-if="unreadCount > 0" class="mark-all-btn" @click="handleMarkAllAsRead">
              Marcar todas como lidas
            </button>
            <NuxtLink to="/painel/notificacoes" class="see-all-link" @click="open = false">
              Ver todas
            </NuxtLink>
          </div>
        </div>

        <div class="dropdown-body">
          <div v-if="loading" class="empty-state">
            <div class="spinner"></div>
          </div>
          <div v-else-if="recentItems.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p>Nenhuma notificação</p>
          </div>
          <template v-else>
            <div
              v-for="n in recentItems"
              :key="n.id"
              class="notification-item"
              :class="{ unread: !n.isRead }"
              @click="handleNotificationClick(n)"
            >
              <div class="item-icon" :class="typeIconClass(n.type)">
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
              <div class="item-content">
                <div class="item-title">{{ n.title }}</div>
                <div class="item-message">{{ n.message }}</div>
                <div class="item-time">{{ formatTime(n.createdAt) }}</div>
              </div>
              <div v-if="!n.isRead" class="unread-dot"></div>
            </div>
          </template>
        </div>
      </div>

      <!-- Backdrop -->
      <div v-if="open" class="dropdown-backdrop" @click="open = false"></div>
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

<style scoped>
.notification-bell { position: relative; display: flex; align-items: center; }

.bell-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-surface-300);
  padding: 8px;
  border-radius: var(--radius-md);
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bell-btn:hover { background: rgba(255,255,255,0.06); color: var(--color-surface-100); }

.badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: var(--color-primary-500);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
  border: 1.5px solid rgba(10, 15, 13, 0.85);
}

.notification-dropdown {
  position: fixed;
  width: 360px;
  background: rgba(14, 20, 17, 0.97);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  z-index: 9999;
  overflow: hidden;
  animation: dropdown-in 150ms ease;
}

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0);    }
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(52, 211, 153, 0.08);
  gap: 8px;
}
.dropdown-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-surface-50);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mark-all-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-primary-400);
  padding: 0;
  font-family: inherit;
  transition: color 150ms;
}
.mark-all-btn:hover { color: var(--color-primary-300); }
.see-all-link {
  font-size: 0.75rem;
  color: var(--color-surface-400);
  text-decoration: none;
  transition: color 150ms;
}
.see-all-link:hover { color: var(--color-surface-200); }

.dropdown-body { max-height: 420px; overflow-y: auto; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 12px;
  color: var(--color-surface-500);
}
.empty-state p { font-size: 0.875rem; margin: 0; }
.spinner {
  width: 24px; height: 24px;
  border: 2px solid rgba(52, 211, 153, 0.15);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 150ms;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: relative;
}
.notification-item:last-child { border-bottom: none; }
.notification-item:hover { background: rgba(255,255,255,0.04); }
.notification-item.unread { background: rgba(16, 185, 129, 0.04); }
.notification-item.unread:hover { background: rgba(16, 185, 129, 0.08); }

.item-icon {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.icon-lead         { background: rgba(16, 185, 129, 0.12); color: var(--color-primary-400); }
.icon-scheduling   { background: rgba(59, 130, 246, 0.12); color: #60a5fa; }
.icon-milestone    { background: rgba(234, 179, 8, 0.12);  color: #fbbf24; }
.icon-system       { background: rgba(139, 92, 246, 0.12); color: #a78bfa; }

.item-content { flex: 1; min-width: 0; }
.item-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-surface-100);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-message {
  font-size: 0.75rem;
  color: var(--color-surface-400);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.item-time {
  font-size: 0.6875rem;
  color: var(--color-surface-500);
  margin-top: 4px;
}

.unread-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--color-primary-500);
  flex-shrink: 0;
  margin-top: 6px;
}

@media (max-width: 480px) {
  .notification-dropdown { width: calc(100vw - 16px); right: 8px !important; }
}
</style>
