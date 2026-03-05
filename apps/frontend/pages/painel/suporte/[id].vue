<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner"></div>
  </div>

  <div v-else-if="!ticket" class="empty-state">
    <h3>Ticket não encontrado</h3>
    <NuxtLink to="/painel/suporte" class="btn btn-secondary">Voltar para Suporte</NuxtLink>
  </div>

  <div v-else class="ticket-detail-page">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <NuxtLink to="/painel/suporte" class="breadcrumb-link">
        <i class="pi pi-angle-left"></i>
        Suporte
      </NuxtLink>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">Ticket #{{ ticket.id.slice(-8).toUpperCase() }}</span>
    </div>

    <div class="ticket-layout">
      <!-- Main content: thread -->
      <div class="ticket-main">
        <!-- Ticket header -->
        <div class="ticket-header-card">
          <div class="ticket-header-top">
            <h1 class="ticket-title">{{ ticket.title }}</h1>
            <span class="ticket-status-badge" :class="`status-badge-${ticket.status.toLowerCase()}`">
              {{ statusLabel(ticket.status) }}
            </span>
          </div>
          <div class="ticket-meta-row">
            <span><i class="pi pi-tag"></i> {{ categoryLabel(ticket.category) }}</span>
            <span :class="`priority-${ticket.priority.toLowerCase()}`"><i class="pi pi-flag"></i> {{ priorityLabel(ticket.priority) }}</span>
            <span><i class="pi pi-clock"></i> {{ formatDateToBrasilia(ticket.createdAt) }}</span>
            <span v-if="authStore.isSysAdmin && ticket.user">
              <i class="pi pi-user"></i> {{ ticket.user.name }} ({{ roleLabel(ticket.user.role) }})
            </span>
          </div>
          <div class="ticket-description">
            <p>{{ ticket.description }}</p>
          </div>
        </div>

        <!-- Messages thread -->
        <div class="messages-section">
          <h3 class="messages-title">Conversação</h3>

          <div v-if="ticket.messages.length === 0" class="no-messages">
            Ainda não há respostas neste ticket. Nossa equipe responderá em breve.
          </div>

          <div v-else class="messages-list">
            <div
              v-for="msg in ticket.messages"
              :key="msg.id"
              class="message-item"
              :class="{
                'message-admin': msg.user?.role === 'SYSADMIN',
                'message-user': msg.user?.role !== 'SYSADMIN',
                'message-internal': msg.isInternal,
              }"
            >
              <div class="message-avatar" :class="msg.user?.role === 'SYSADMIN' ? 'avatar-admin' : 'avatar-user'">
                {{ initials(msg.user?.name) }}
              </div>
              <div class="message-bubble">
                <div class="message-meta">
                  <span class="message-author">
                    {{ msg.user?.name }}
                    <span v-if="msg.user?.role === 'SYSADMIN'" class="admin-badge">Suporte</span>
                    <span v-if="msg.isInternal" class="internal-badge">Nota Interna</span>
                  </span>
                  <span class="message-date">{{ formatDateToBrasilia(msg.createdAt) }}</span>
                </div>
                <div class="message-text">{{ msg.message }}</div>
              </div>
            </div>
          </div>

          <!-- Add message form -->
          <div v-if="ticket.status !== 'CLOSED'" class="reply-form">
            <div v-if="authStore.isSysAdmin" class="reply-options">
              <label class="toggle-label">
                <input type="checkbox" v-model="replyInternal" />
                <span class="toggle-mark"></span>
                Nota interna (não visível ao usuário)
              </label>
            </div>
            <div class="reply-input-row">
              <textarea
                v-model="replyText"
                class="reply-textarea"
                rows="3"
                :placeholder="replyInternal ? 'Nota interna...' : 'Escreva sua resposta...'"
                @keydown.ctrl.enter="sendReply"
              ></textarea>
              <button class="btn btn-primary reply-btn" :disabled="!replyText.trim() || replying" @click="sendReply">
                <span v-if="replying">Enviando...</span>
                <span v-else><i class="pi pi-send"></i> Enviar</span>
              </button>
            </div>
            <span class="reply-hint">Ctrl+Enter para enviar</span>
          </div>
          <div v-else class="ticket-closed-notice">
            <i class="pi pi-lock"></i> Este ticket está fechado. Abra um novo ticket se precisar de mais ajuda.
          </div>
        </div>
      </div>

      <!-- Sidebar: ticket actions (SYSADMIN only) -->
      <div v-if="authStore.isSysAdmin" class="ticket-sidebar">
        <div class="sidebar-card">
          <h4 class="sidebar-title">Gerenciar Ticket</h4>

          <div class="form-group">
            <label>Status</label>
            <select v-model="adminStatus" class="form-control">
              <option value="OPEN">Aberto</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="WAITING_USER">Aguardando Resposta</option>
              <option value="RESOLVED">Resolvido</option>
              <option value="CLOSED">Fechado</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mensagem ao atualizar <span class="optional">(opcional)</span></label>
            <textarea v-model="adminReply" class="form-control" rows="3" placeholder="Informe o usuário sobre a atualização..."></textarea>
          </div>

          <button
            class="btn btn-primary w-full"
            :disabled="updatingStatus || adminStatus === ticket.status"
            @click="updateStatus"
          >
            {{ updatingStatus ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </div>

        <div class="sidebar-card sidebar-info">
          <h4 class="sidebar-title">Informações</h4>
          <div class="info-row">
            <span class="info-label">ID</span>
            <span class="info-value">#{{ ticket.id.slice(-8).toUpperCase() }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Criado em</span>
            <span class="info-value">{{ formatDateToBrasilia(ticket.createdAt) }}</span>
          </div>
          <div v-if="ticket.resolvedAt" class="info-row">
            <span class="info-label">Resolvido em</span>
            <span class="info-value">{{ formatDateToBrasilia(ticket.resolvedAt) }}</span>
          </div>
          <div v-if="ticket.closedAt" class="info-row">
            <span class="info-label">Fechado em</span>
            <span class="info-value">{{ formatDateToBrasilia(ticket.closedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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

onMounted(fetchTicket)
</script>

<style scoped>
.loading-state { display: flex; justify-content: center; padding: 4rem; }
.loading-spinner { width: 36px; height: 36px; border: 3px solid rgba(52,211,153,0.15); border-top-color: var(--color-primary-400); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 4rem; }
.empty-state h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-surface-200); margin: 0 0 1rem; }

.ticket-detail-page { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.breadcrumb { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; font-size: 0.875rem; }
.breadcrumb-link { color: var(--color-primary-400); text-decoration: none; display: flex; align-items: center; gap: 4px; transition: opacity 150ms; }
.breadcrumb-link:hover { opacity: 0.8; }
.breadcrumb-sep { color: var(--color-surface-600); }
.breadcrumb-current { color: var(--color-surface-300); }

.ticket-layout { display: grid; grid-template-columns: 1fr 280px; gap: 1.5rem; align-items: start; }
@media (max-width: 900px) { .ticket-layout { grid-template-columns: 1fr; } }

.ticket-main { display: flex; flex-direction: column; gap: 1.25rem; }

.ticket-header-card {
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg); padding: 1.5rem;
}
.ticket-header-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.ticket-title { font-size: 1.25rem; font-weight: 700; color: var(--color-surface-50); margin: 0; flex: 1; }
.ticket-status-badge { font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-md); flex-shrink: 0; white-space: nowrap; }
.status-badge-open { background: rgba(52,211,153,0.12); color: #34d399; }
.status-badge-in_progress { background: rgba(96,165,250,0.12); color: #60a5fa; }
.status-badge-waiting_user { background: rgba(251,191,36,0.12); color: #fbbf24; }
.status-badge-resolved { background: rgba(167,139,250,0.12); color: #a78bfa; }
.status-badge-closed { background: rgba(107,114,128,0.12); color: #9ca3af; }

.ticket-meta-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.ticket-meta-row span { display: flex; align-items: center; gap: 5px; font-size: 0.8rem; color: var(--color-surface-400); }
.priority-urgent { color: #f87171 !important; }
.priority-high { color: #fbbf24 !important; }
.priority-medium { color: #60a5fa !important; }
.priority-low { color: #9ca3af !important; }

.ticket-description { padding-top: 1rem; border-top: 1px solid var(--glass-border-subtle); }
.ticket-description p { font-size: 0.9375rem; color: var(--color-surface-200); line-height: 1.6; margin: 0; white-space: pre-wrap; }

.messages-section {
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg); padding: 1.5rem;
}
.messages-title { font-size: 0.9375rem; font-weight: 600; color: var(--color-surface-200); margin: 0 0 1.25rem; }
.no-messages { text-align: center; padding: 2rem; color: var(--color-surface-500); font-size: 0.875rem; }

.messages-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }

.message-item { display: flex; gap: 0.875rem; }
.message-item.message-admin { flex-direction: row; }
.message-item.message-user { flex-direction: row-reverse; }
.message-item.message-internal { opacity: 0.7; }

.message-avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}
.avatar-admin { background: rgba(16,185,129,0.15); color: var(--color-primary-400); border: 1.5px solid var(--color-primary-600); }
.avatar-user { background: rgba(96,165,250,0.12); color: #60a5fa; border: 1.5px solid rgba(96,165,250,0.3); }

.message-bubble { flex: 1; max-width: 80%; }
.message-item.message-user .message-bubble { text-align: right; }
.message-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; flex-wrap: wrap; }
.message-item.message-user .message-meta { justify-content: flex-end; }
.message-author { font-size: 0.8125rem; font-weight: 600; color: var(--color-surface-200); display: flex; align-items: center; gap: 4px; }
.message-date { font-size: 0.75rem; color: var(--color-surface-500); }
.admin-badge { background: rgba(16,185,129,0.12); color: #34d399; font-size: 0.6875rem; padding: 1px 5px; border-radius: var(--radius-sm); font-weight: 600; }
.internal-badge { background: rgba(251,191,36,0.12); color: #fbbf24; font-size: 0.6875rem; padding: 1px 5px; border-radius: var(--radius-sm); font-weight: 600; }
.message-text {
  background: var(--glass-bg); border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: 0.875rem;
  color: var(--color-surface-100); line-height: 1.5; white-space: pre-wrap;
}
.message-item.message-admin .message-text { border-radius: 4px 12px 12px 12px; }
.message-item.message-user .message-text { border-radius: 12px 4px 12px 12px; background: rgba(96,165,250,0.06); }
.message-internal .message-text { border: 1px dashed rgba(251,191,36,0.2); background: rgba(251,191,36,0.04); }

.reply-form { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--glass-border-subtle); }
.reply-options { margin-bottom: 0.75rem; }
.toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem; color: var(--color-surface-400); }
.toggle-label input { display: none; }
.toggle-mark {
  width: 18px; height: 18px; border: 2px solid var(--glass-border); border-radius: var(--radius-sm);
  display: inline-flex; align-items: center; justify-content: center; transition: all 150ms;
}
.toggle-label input:checked + .toggle-mark { background: #fbbf24; border-color: #fbbf24; }
.toggle-label input:checked + .toggle-mark::after {
  content: ''; display: block; width: 4px; height: 7px; border: solid white;
  border-width: 0 2px 2px 0; transform: rotate(45deg); margin-top: -1px;
}
.reply-input-row { display: flex; gap: 0.75rem; align-items: flex-end; }
.reply-textarea {
  flex: 1; padding: 0.625rem 0.875rem; border-radius: var(--radius-md); font-size: 0.875rem; resize: vertical;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: var(--color-surface-100); font-family: inherit; transition: border-color 150ms ease; min-height: 80px;
}
.reply-textarea:focus { outline: none; border-color: rgba(52,211,153,0.35); }
.reply-btn { flex-shrink: 0; height: 40px; }
.reply-hint { font-size: 0.75rem; color: var(--color-surface-600); display: block; margin-top: 6px; }

.ticket-closed-notice {
  margin-top: 1.25rem; padding: 1rem; border-radius: var(--radius-md);
  background: rgba(107,114,128,0.1); color: var(--color-surface-500);
  font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;
}

/* Sidebar */
.ticket-sidebar { display: flex; flex-direction: column; gap: 1rem; }
.sidebar-card {
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg); padding: 1.25rem;
}
.sidebar-title { font-size: 0.875rem; font-weight: 700; color: var(--color-surface-300); margin: 0 0 1rem; text-transform: uppercase; letter-spacing: 0.04em; }
.form-group { margin-bottom: 0.875rem; }
label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-surface-300); margin-bottom: 0.375rem; }
.optional { font-weight: 400; color: var(--color-surface-500); }
.form-control {
  width: 100%; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: var(--color-surface-100); font-family: inherit; transition: border-color 150ms; box-sizing: border-box;
}
.form-control:focus { outline: none; border-color: rgba(52,211,153,0.35); }
textarea.form-control { resize: vertical; min-height: 70px; }
.w-full { width: 100%; }

.sidebar-info {}
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--glass-border-subtle); }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 0.8125rem; color: var(--color-surface-500); }
.info-value { font-size: 0.8125rem; color: var(--color-surface-200); font-weight: 500; }
</style>
