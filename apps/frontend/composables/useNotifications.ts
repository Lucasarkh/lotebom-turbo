import { ref, computed } from 'vue'

interface Notification {
  id: string
  userId: string
  type: 'SYSTEM' | 'NEW_LEAD' | 'NEW_SCHEDULING' | 'LEAD_MILESTONE' | 'ACCESS_MILESTONE'
  title: string
  message: string
  isRead: boolean
  actionUrl?: string
  metadata?: Record<string, any>
  createdAt: string
}

interface NotificationsState {
  items: Notification[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const unreadCount = ref(0)
const notifications = ref<NotificationsState>({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 })
const loading = ref(false)

let pollInterval: ReturnType<typeof setInterval> | null = null

export function useNotifications() {
  const { get, patch, post } = useApi()

  async function fetchUnreadCount() {
    try {
      const data = await get('/notifications/unread-count')
      unreadCount.value = data.count ?? 0
    } catch {}
  }

  async function fetchNotifications(page = 1, limit = 20) {
    loading.value = true
    try {
      const data = await get(`/notifications?page=${page}&limit=${limit}`)
      notifications.value = data
    } catch {
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id: string) {
    try {
      await patch(`/notifications/${id}/read`, {})
      const item = notifications.value.items.find((n) => n.id === id)
      if (item && !item.isRead) {
        item.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch {}
  }

  async function markAllAsRead() {
    try {
      await patch('/notifications/read-all', {})
      notifications.value.items.forEach((n) => (n.isRead = true))
      unreadCount.value = 0
    } catch {}
  }

  async function broadcast(dto: {
    title: string
    message: string
    tenantId?: string
    role?: string
    sendEmail?: boolean
    actionUrl?: string
  }) {
    return post('/notifications/broadcast', dto)
  }

  function startPolling(intervalMs = 60000) {
    fetchUnreadCount()
    if (pollInterval) clearInterval(pollInterval)
    pollInterval = setInterval(fetchUnreadCount, intervalMs)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  return {
    unreadCount: computed(() => unreadCount.value),
    notifications: computed(() => notifications.value),
    loading: computed(() => loading.value),
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    broadcast,
    startPolling,
    stopPolling,
  }
}
