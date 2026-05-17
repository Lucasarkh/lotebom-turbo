<template>
  <div>
    <UiLoadingState v-if="loading" />

    <UiEmptyState v-else-if="!ticket" title="Ticket não encontrado">
      <template #action>
        <UiButton variant="secondary" to="/painel/suporte">Voltar para Suporte</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="flex flex-col gap-5">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/painel/suporte" class="flex items-center gap-1 text-p-accent no-underline hover:opacity-80 transition-opacity">
          <i class="pi pi-angle-left"></i>
          Suporte
        </NuxtLink>
        <span class="text-p-text-muted">/</span>
        <span class="text-p-text-secondary">Ticket #{{ ticket.id.slice(-8).toUpperCase() }}</span>
      </div>

      <div class="grid grid-cols-1 gap-6 items-start lg:grid-cols-[1fr_280px]">
        <!-- Main content: thread -->
        <div class="flex flex-col gap-5">
          <!-- Ticket header -->
          <UiCard>
            <div class="flex items-start justify-between gap-4 mb-3">
              <h1 class="text-xl font-bold text-p-text flex-1">{{ ticket.title }}</h1>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap" :class="statusBadgeClass(ticket.status)">
                {{ statusLabel(ticket.status) }}
              </span>
            </div>
            <div class="flex flex-wrap gap-4 mb-4">
              <span class="flex items-center gap-1.5 text-[13px] text-p-text-muted"><i class="pi pi-tag"></i> {{ categoryLabel(ticket.category) }}</span>
              <span class="flex items-center gap-1.5 text-[13px]" :class="priorityColorClass(ticket.priority)"><i class="pi pi-flag"></i> {{ priorityLabel(ticket.priority) }}</span>
              <span class="flex items-center gap-1.5 text-[13px] text-p-text-muted"><i class="pi pi-clock"></i> {{ formatDateToBrasilia(ticket.createdAt) }}</span>
              <span v-if="authStore.isSysAdmin && ticket.user" class="flex items-center gap-1.5 text-[13px] text-p-text-muted">
                <i class="pi pi-user"></i> {{ ticket.user.name }} ({{ roleLabel(ticket.user.role) }})
              </span>
            </div>
            <div class="border-t border-p-border pt-4">
              <p class="text-[15px] text-p-text-secondary leading-relaxed whitespace-pre-wrap">{{ ticket.description }}</p>
            </div>
          </UiCard>

          <!-- Messages thread -->
          <UiCard>
            <h3 class="text-[15px] font-semibold text-p-text-secondary mb-5">Conversação</h3>

            <div v-if="ticket.messages.length === 0" class="text-center py-8 text-sm text-p-text-muted">
              Ainda não há respostas neste ticket. Nossa equipe responderá em breve.
            </div>

            <div v-else class="flex flex-col gap-4 mb-6">
              <div
                v-for="msg in ticket.messages"
                :key="msg.id"
                class="flex gap-3.5"
                :class="{
                  'flex-row': msg.user?.role === 'SYSADMIN',
                  'flex-row-reverse': msg.user?.role !== 'SYSADMIN',
                  'opacity-70': msg.isInternal,
                }"
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  :class="msg.user?.role === 'SYSADMIN'
                    ? 'bg-p-accent/15 text-p-accent border-[1.5px] border-p-accent/40'
                    : 'bg-p-info/15 text-p-info border-[1.5px] border-p-info/30'"
                >
                  {{ initials(msg.user?.name) }}
                </div>
                <div class="flex-1 max-w-[80%]" :class="msg.user?.role !== 'SYSADMIN' ? 'text-right' : ''">
                  <div class="flex items-center gap-2 mb-1 flex-wrap" :class="msg.user?.role !== 'SYSADMIN' ? 'justify-end' : ''">
                    <span class="text-[13px] font-semibold text-p-text-secondary flex items-center gap-1">
                      {{ msg.user?.name }}
                      <UiBadge v-if="msg.user?.role === 'SYSADMIN'" variant="success" size="sm">Suporte</UiBadge>
                      <UiBadge v-if="msg.isInternal" variant="warning" size="sm">Nota Interna</UiBadge>
                    </span>
                    <span class="text-xs text-p-text-muted">{{ formatDateToBrasilia(msg.createdAt) }}</span>
                  </div>
                  <div
                    class="rounded-lg border px-4 py-3 text-sm text-p-text leading-relaxed whitespace-pre-wrap inline-block text-left"
                    :class="messageTextClasses(msg)"
                  >{{ msg.message }}</div>
                </div>
              </div>
            </div>

            <!-- Add message form -->
            <div v-if="ticket.status !== 'CLOSED'" class="border-t border-p-border pt-5 mt-5">
              <div v-if="authStore.isSysAdmin" class="mb-3">
                <label class="flex items-center gap-2 cursor-pointer text-[13px] text-p-text-muted">
                  <input type="checkbox" v-model="replyInternal" class="rounded border-p-border" />
                  Nota interna (não visível ao usuário)
                </label>
              </div>
              <div class="flex gap-3 items-end">
                <textarea
                  v-model="replyText"
                  class="flex-1 rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent resize-y min-h-[80px]"
                  rows="3"
                  :placeholder="replyInternal ? 'Nota interna...' : 'Escreva sua resposta...'"
                  @keydown.ctrl.enter="sendReply"
                ></textarea>
                <UiButton variant="primary" :disabled="!replyText.trim() || replying" :loading="replying" class="shrink-0 h-10" @click="sendReply">
                  <span v-if="replying">Enviando...</span>
                  <span v-else><i class="pi pi-send"></i> Enviar</span>
                </UiButton>
              </div>
              <span class="text-xs text-p-text-muted block mt-1.5">Ctrl+Enter para enviar</span>
            </div>
            <div v-else class="mt-5 flex items-center gap-2 rounded-lg bg-gray-500/10 px-4 py-3 text-sm text-p-text-muted">
              <i class="pi pi-lock"></i> Este ticket está fechado. Abra um novo ticket se precisar de mais ajuda.
            </div>
          </UiCard>
        </div>

        <!-- Sidebar: ticket actions (SYSADMIN only) -->
        <div v-if="authStore.isSysAdmin" class="flex flex-col gap-4">
          <UiCard>
            <h4 class="text-sm font-bold uppercase tracking-wide text-p-text-secondary mb-4">Gerenciar Ticket</h4>

            <div class="mb-3.5">
              <UiSelect v-model="adminStatus" label="Status">
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="WAITING_USER">Aguardando Resposta</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="CLOSED">Fechado</option>
              </UiSelect>
            </div>

            <div class="mb-3.5">
              <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">
                Mensagem ao atualizar <span class="font-normal text-p-text-muted">(opcional)</span>
              </label>
              <textarea
                v-model="adminReply"
                class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent resize-y min-h-[70px]"
                rows="3"
                placeholder="Informe o usuário sobre a atualização..."
              ></textarea>
            </div>

            <UiButton
              variant="primary"
              class="w-full"
              :disabled="updatingStatus || adminStatus === ticket.status"
              :loading="updatingStatus"
              @click="updateStatus"
            >
              {{ updatingStatus ? 'Salvando...' : 'Salvar Alterações' }}
            </UiButton>
          </UiCard>

          <UiCard>
            <h4 class="text-sm font-bold uppercase tracking-wide text-p-text-secondary mb-4">Informações</h4>
            <div class="flex flex-col divide-y divide-p-border">
              <div class="flex items-center justify-between py-2">
                <span class="text-[13px] text-p-text-muted">ID</span>
                <span class="text-[13px] font-medium text-p-text-secondary">#{{ ticket.id.slice(-8).toUpperCase() }}</span>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-[13px] text-p-text-muted">Criado em</span>
                <span class="text-[13px] font-medium text-p-text-secondary">{{ formatDateToBrasilia(ticket.createdAt) }}</span>
              </div>
              <div v-if="ticket.resolvedAt" class="flex items-center justify-between py-2">
                <span class="text-[13px] text-p-text-muted">Resolvido em</span>
                <span class="text-[13px] font-medium text-p-text-secondary">{{ formatDateToBrasilia(ticket.resolvedAt) }}</span>
              </div>
              <div v-if="ticket.closedAt" class="flex items-center justify-between py-2">
                <span class="text-[13px] text-p-text-muted">Fechado em</span>
                <span class="text-[13px] font-medium text-p-text-secondary">{{ formatDateToBrasilia(ticket.closedAt) }}</span>
              </div>
            </div>
          </UiCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'painel' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

const loading = ref(true)
const ticket = ref(null)
const replyText = ref('')
const replyInternal = ref(false)
const replying = ref(false)
const adminStatus = ref('')
const adminReply = ref('')
const updatingStatus = ref(false)

async function fetchTicket() {
  loading.value = true
  try {
    ticket.value = await api.get(`/support/tickets/${route.params.id}`)
    adminStatus.value = ticket.value.status
  } catch (e) {
    toast.fromError(e, 'Erro ao carregar ticket.')
    ticket.value = null
  } finally {
    loading.value = false
  }
}

async function sendReply() {
  if (!replyText.value.trim() || replying.value) return
  replying.value = true
  try {
    const msg = await api.post(`/support/tickets/${route.params.id}/messages`, {
      message: replyText.value.trim(),
      isInternal: replyInternal.value,
    })
    ticket.value.messages.push(msg)
    replyText.value = ''
    replyInternal.value = false
    // Refresh to get updated status (WAITING_USER → IN_PROGRESS)
    await fetchTicket()
  } catch (e) {
    toast.fromError(e, 'Erro ao enviar mensagem.')
  } finally {
    replying.value = false
  }
}

async function updateStatus() {
  if (updatingStatus.value || adminStatus.value === ticket.value.status) return
  updatingStatus.value = true
  try {
    await api.patch(`/support/tickets/${route.params.id}/status`, {
      status: adminStatus.value,
      replyMessage: adminReply.value.trim() || undefined,
    })
    toast.success('Status atualizado!')
    adminReply.value = ''
    await fetchTicket()
  } catch (e) {
    toast.fromError(e, 'Erro ao atualizar status.')
  } finally {
    updatingStatus.value = false
  }
}

function initials(name) {
  if (!name) return '?'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}
function statusLabel(s) {
  return { OPEN: 'Aberto', IN_PROGRESS: 'Em Andamento', WAITING_USER: 'Aguardando Resposta', RESOLVED: 'Resolvido', CLOSED: 'Fechado' }[s] ?? s
}
function priorityLabel(p) {
  return { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' }[p] ?? p
}
function categoryLabel(c) {
  return { GENERAL: 'Geral', TECHNICAL: 'Técnico', BILLING: 'Financeiro', FEATURE_REQUEST: 'Melhoria', BUG: 'Bug' }[c] ?? c
}
function roleLabel(r) {
  return { SYSADMIN: 'Admin', LOTEADORA: 'Loteadora', IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor' }[r] ?? r
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

function priorityColorClass(p) {
  return {
    URGENT: 'text-red-400',
    HIGH: 'text-amber-400',
    MEDIUM: 'text-blue-400',
    LOW: 'text-gray-400',
  }[p] ?? 'text-gray-400'
}

function messageTextClasses(msg) {
  if (msg.isInternal) return 'border-dashed border-p-warning/25 bg-p-warning/5'
  if (msg.user?.role === 'SYSADMIN') return 'rounded-tl-sm border-p-border bg-p-elevated'
  return 'rounded-tr-sm border-p-info/15 bg-p-info/5'
}

onMounted(fetchTicket)
</script>
