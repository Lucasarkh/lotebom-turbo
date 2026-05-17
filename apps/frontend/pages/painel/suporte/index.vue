<template>
  <div class="flex flex-col gap-6">
    <UiPageHeader
      title="Suporte"
      :description="authStore.isSysAdmin ? 'Gerencie todos os tickets de suporte da plataforma.' : 'Abra um ticket para solicitar ajuda. Nossa equipe responderá em breve.'"
    >
      <template #actions>
        <UiButton v-if="!authStore.isSysAdmin" variant="primary" @click="showCreateModal = true">
          <i class="pi pi-plus mr-2"></i>
          Novo Ticket
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Status filter tabs -->
    <div class="inline-flex items-center gap-1 rounded-lg border border-p-border bg-p-raised p-1 flex-wrap">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        type="button"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
        :class="activeTab === tab.value
          ? 'bg-p-accent text-white'
          : 'text-p-text-secondary hover:text-p-text hover:bg-p-overlay'"
        @click="activeTab = tab.value; fetchTickets()"
      >
        {{ tab.label }}
        <span
          v-if="tab.count !== undefined"
          class="inline-flex items-center justify-center min-w-[20px] rounded-full px-1.5 text-xs font-semibold"
          :class="tab.value === 'OPEN' ? 'bg-p-warning/20 text-p-warning' : 'bg-white/10 text-current'"
        >{{ tab.count }}</span>
      </button>
    </div>

    <UiLoadingState v-if="loading" />

    <UiEmptyState
      v-else-if="tickets.length === 0"
      title="Nenhum ticket encontrado"
      :description="!authStore.isSysAdmin ? 'Clique em &quot;Novo Ticket&quot; para abrir uma solicitação de suporte.' : 'Nenhum ticket com este status no momento.'"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" class="text-p-text-muted">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      </template>
    </UiEmptyState>

    <div v-else class="flex flex-col gap-3">
      <NuxtLink
        v-for="ticket in tickets"
        :key="ticket.id"
        :to="`/painel/suporte/${ticket.id}`"
        class="flex items-center gap-4 rounded-xl border border-p-border bg-p-elevated p-4 md:px-5 cursor-pointer transition-all hover:bg-p-overlay hover:border-p-accent/25 hover:-translate-y-px no-underline"
      >
        <div class="shrink-0">
          <div class="h-2.5 w-2.5 rounded-full" :class="statusDotClass(ticket.status)"></div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-2 flex-wrap">
            <span class="text-[15px] font-semibold text-p-text whitespace-nowrap overflow-hidden text-ellipsis">{{ ticket.title }}</span>
            <div class="flex gap-1.5 shrink-0">
              <UiBadge :variant="priorityBadgeVariant(ticket.priority)">{{ priorityLabel(ticket.priority) }}</UiBadge>
              <UiBadge variant="neutral">{{ categoryLabel(ticket.category) }}</UiBadge>
            </div>
          </div>
          <div class="flex gap-4 flex-wrap">
            <span v-if="authStore.isSysAdmin" class="flex items-center gap-1 text-xs text-p-text-muted">
              <i class="pi pi-user"></i>
              {{ ticket.user?.name }} ({{ roleLabel(ticket.user?.role) }})
            </span>
            <span class="flex items-center gap-1 text-xs text-p-text-muted">
              <i class="pi pi-clock"></i>
              {{ formatDateToBrasilia(ticket.createdAt) }}
            </span>
            <span class="flex items-center gap-1 text-xs text-p-text-muted">
              <i class="pi pi-comments"></i>
              {{ ticket._count?.messages ?? 0 }}
            </span>
          </div>
        </div>
        <div class="shrink-0 flex items-center gap-3">
          <span class="text-xs font-semibold px-2 py-1 rounded whitespace-nowrap" :class="statusBadgeClass(ticket.status)">
            {{ statusLabel(ticket.status) }}
          </span>
          <i class="pi pi-chevron-right text-p-text-muted text-xs"></i>
        </div>
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="meta.totalPages > 1" class="flex items-center justify-center gap-4">
      <UiButton variant="ghost" size="sm" :disabled="meta.page <= 1" @click="goToPage(meta.page - 1)">
        <i class="pi pi-chevron-left"></i>
      </UiButton>
      <span class="text-sm text-p-text-muted">{{ meta.page }} / {{ meta.totalPages }}</span>
      <UiButton variant="ghost" size="sm" :disabled="meta.page >= meta.totalPages" @click="goToPage(meta.page + 1)">
        <i class="pi pi-chevron-right"></i>
      </UiButton>
    </div>

    <!-- Create Ticket Modal -->
    <UiModal v-model="showCreateModal" title="Novo Ticket de Suporte">
      <form id="create-ticket-form" @submit.prevent="submitTicket" class="flex flex-col gap-4">
        <UiInput v-model="form.title" label="Título *" placeholder="Descreva o problema brevemente" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UiSelect v-model="form.category" label="Categoria">
            <option value="GENERAL">Geral</option>
            <option value="TECHNICAL">Técnico</option>
            <option value="BILLING">Financeiro</option>
            <option value="FEATURE_REQUEST">Sugestão de Melhoria</option>
            <option value="BUG">Bug</option>
          </UiSelect>
          <UiSelect v-model="form.priority" label="Prioridade">
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </UiSelect>
        </div>

        <div class="flex flex-col gap-1.5">
          <UiTextarea
            v-model="form.description"
            label="Descrição *"
            :rows="5"
            placeholder="Descreva seu problema em detalhes: o que aconteceu, o que esperava que acontecesse, passos para reproduzir..."
          />
          <span class="text-xs text-p-text-muted text-right">{{ form.description.length }}/5000</span>
        </div>

        <UiAlert v-if="createError" variant="error">{{ createError }}</UiAlert>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="secondary" type="button" @click="showCreateModal = false">Cancelar</UiButton>
          <UiButton variant="primary" type="submit" form="create-ticket-form" :disabled="createLoading" :loading="createLoading">
            {{ createLoading ? 'Enviando...' : 'Abrir Ticket' }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'painel' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const tickets = ref([])
const meta = ref({ page: 1, totalPages: 1, total: 0 })
const activeTab = ref('all')
const counts = ref({})

const showCreateModal = ref(false)
const createLoading = ref(false)
const createError = ref('')
const form = ref({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' })

const statusTabs = computed(() => {
  const tabs = [
    { value: 'all', label: 'Todos' },
    { value: 'OPEN', label: 'Abertos', count: counts.value.OPEN },
    { value: 'IN_PROGRESS', label: 'Em Andamento', count: counts.value.IN_PROGRESS },
    { value: 'WAITING_USER', label: 'Aguardando', count: counts.value.WAITING_USER },
    { value: 'RESOLVED', label: 'Resolvidos', count: counts.value.RESOLVED },
    { value: 'CLOSED', label: 'Fechados', count: counts.value.CLOSED },
  ]
  return tabs.filter(t => t.value === 'all' || t.count == null || t.count > 0 || activeTab.value === t.value)
})

async function fetchTickets(page = 1) {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page), limit: '15' })
    if (activeTab.value !== 'all') params.set('status', activeTab.value)
    const res = await api.get(`/support/tickets?${params}`)
    tickets.value = res.data
    meta.value = res.meta
  } catch (e) {
    toast.fromError(e, 'Erro ao carregar tickets.')
  } finally {
    loading.value = false
  }
}

async function fetchCounts() {
  try {
    const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED']
    const results = await Promise.all(
      statuses.map(s => api.get(`/support/tickets?status=${s}&limit=1`).then(r => ({ s, count: r.meta.total })).catch(() => ({ s, count: 0 })))
    )
    counts.value = Object.fromEntries(results.map(r => [r.s, r.count]))
  } catch {}
}

async function submitTicket() {
  if (!form.value.title.trim() || !form.value.description.trim()) return
  createLoading.value = true
  createError.value = ''
  try {
    const ticket = await api.post('/support/tickets', {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      category: form.value.category,
      priority: form.value.priority,
    })
    toast.success('Ticket aberto com sucesso!')
    showCreateModal.value = false
    form.value = { title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' }
    router.push(`/painel/suporte/${ticket.id}`)
  } catch (e) {
    createError.value = e.message || 'Erro ao criar ticket.'
  } finally {
    createLoading.value = false
  }
}

function goToPage(page) {
  fetchTickets(page)
  meta.value.page = page
}

function statusLabel(s) {
  const m = { OPEN: 'Aberto', IN_PROGRESS: 'Em Andamento', WAITING_USER: 'Aguardando Resposta', RESOLVED: 'Resolvido', CLOSED: 'Fechado' }
  return m[s] ?? s
}
function priorityLabel(p) {
  const m = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' }
  return m[p] ?? p
}
function priorityBadgeVariant(p) {
  return { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' }[p] ?? 'neutral'
}
function categoryLabel(c) {
  const m = { GENERAL: 'Geral', TECHNICAL: 'Técnico', BILLING: 'Financeiro', FEATURE_REQUEST: 'Melhoria', BUG: 'Bug' }
  return m[c] ?? c
}
function roleLabel(r) {
  return { SYSADMIN: 'Admin', LOTEADORA: 'Loteadora', IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor' }[r] ?? r
}

function statusDotClass(s) {
  return {
    OPEN: 'bg-emerald-400',
    IN_PROGRESS: 'bg-blue-400',
    WAITING_USER: 'bg-amber-400',
    RESOLVED: 'bg-purple-400',
    CLOSED: 'bg-gray-500',
  }[s] ?? 'bg-gray-500'
}

function statusBadgeClass(s) {
  return {
    OPEN: 'bg-emerald-400/15 text-emerald-400',
    IN_PROGRESS: 'bg-blue-400/15 text-blue-400',
    WAITING_USER: 'bg-amber-400/15 text-amber-400',
    RESOLVED: 'bg-purple-400/15 text-purple-400',
    CLOSED: 'bg-gray-500/15 text-gray-400',
  }[s] ?? 'bg-gray-500/15 text-gray-400'
}

onMounted(async () => {
  await Promise.all([fetchTickets(), fetchCounts()])
})
</script>
