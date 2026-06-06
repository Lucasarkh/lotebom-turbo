<template>
  <div class="space-y-6">
    <UiPageHeader title="Chaves API para Agentes (MCP)" description="Gerencie chaves de acesso que permitem que agentes de IA (MCP) editem dados dos seus projetos automaticamente." />

    <!-- Info Banner -->
    <div class="rounded-xl border border-p-accent/20 bg-p-accent/5 p-5">
      <div class="flex items-start gap-3">
        <i class="bi bi-robot text-2xl text-p-accent shrink-0 mt-0.5"></i>
        <div>
          <h3 class="text-sm font-bold text-p-text mb-1">O que são Chaves API para Agentes?</h3>
          <p class="text-sm text-p-text-secondary leading-relaxed">
            Estas chaves permitem que assistentes de IA (como Cursor, Claude, ChatGPT) acessem e editem dados dos seus projetos
            via protocolo MCP (Model Context Protocol). Cada chave pode ter permissões específicas (leitura/escrita em projetos, lotes, leads, IA)
            e escopo limitado a projetos específicos.
          </p>
          <p class="text-sm text-p-text-muted mt-2">
            <i class="bi bi-shield-check text-p-success mr-1"></i>
            <strong>Segurança:</strong> A chave completa é exibida apenas no momento da criação. Depois disso, apenas os primeiros 8 caracteres ficam visíveis.
            Armazene a chave em local seguro (como variável de ambiente <code>LOTIO_API_KEY</code> no seu cliente MCP).
          </p>
        </div>
      </div>
    </div>

    <!-- Create Key Button -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-p-text">Chaves Ativas</h2>
      <UiButton variant="primary" @click="showCreateModal = true">
        <i class="bi bi-plus-lg mr-1.5"></i> Nova Chave API
      </UiButton>
    </div>

    <!-- Loading -->
    <UiLoadingState v-if="loading" />

    <!-- Error -->
    <UiAlert v-else-if="error" variant="error" :title="error" />

    <!-- Empty -->
    <UiEmptyState
      v-else-if="keys.length === 0"
      title="Nenhuma chave API"
      description="Crie sua primeira chave para permitir que agentes de IA acessem seus projetos."
      icon="🔑"
    >
      <template #action>
        <UiButton variant="primary" @click="showCreateModal = true">Criar Chave API</UiButton>
      </template>
    </UiEmptyState>

    <!-- Keys List -->
    <div v-else class="space-y-3">
      <div
        v-for="key in keys"
        :key="key.id"
        class="rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-p-accent/30"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-2">
              <h3 class="text-sm font-bold text-p-text">{{ key.name }}</h3>
              <UiBadge :variant="key.isActive ? 'success' : 'neutral'" size="sm">
                {{ key.isActive ? 'Ativa' : 'Inativa' }}
              </UiBadge>
              <UiBadge v-if="key.expiresAt && new Date(key.expiresAt) < new Date()" variant="danger" size="sm">
                Expirada
              </UiBadge>
            </div>

            <div class="flex items-center gap-4 text-xs text-p-text-muted mb-3 flex-wrap">
              <span class="inline-flex items-center gap-1">
                <i class="bi bi-key"></i>
                <code class="bg-p-overlay px-1.5 py-0.5 rounded text-p-accent font-mono">{{ key.keyPrefix }}...</code>
              </span>
              <span v-if="key.projectCount > 0" class="inline-flex items-center gap-1">
                <i class="bi bi-folder2"></i>
                {{ key.projectCount }} projeto(s)
              </span>
              <span v-else class="inline-flex items-center gap-1">
                <i class="bi bi-globe2"></i>
                Todos os projetos
              </span>
              <span class="inline-flex items-center gap-1">
                <i class="bi bi-shield-lock"></i>
                {{ key.permissionCount }} permissões
              </span>
              <span v-if="key.lastUsedAt" class="inline-flex items-center gap-1">
                <i class="bi bi-clock"></i>
                Último uso: {{ formatDate(key.lastUsedAt) }}
              </span>
              <span v-else class="inline-flex items-center gap-1">
                <i class="bi bi-clock-history"></i>
                Nunca usada
              </span>
              <span v-if="key.expiresAt" class="inline-flex items-center gap-1">
                <i class="bi bi-calendar-x"></i>
                Expira: {{ formatDate(key.expiresAt) }}
              </span>
            </div>

            <!-- Permissions tags -->
            <div class="flex flex-wrap gap-1.5 mb-3">
              <span
                v-for="perm in key.permissions"
                :key="perm"
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                :class="perm.endsWith(':write')
                  ? 'bg-p-accent/10 text-p-accent border border-p-accent/20'
                  : 'bg-p-overlay text-p-text-secondary border border-p-border'"
              >
                {{ perm }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <UiButton
              variant="ghost"
              size="sm"
              :title="key.isActive ? 'Desativar chave' : 'Ativar chave'"
              @click="toggleKey(key)"
            >
              <i :class="key.isActive ? 'bi bi-pause-circle' : 'bi bi-play-circle'" class="text-lg"></i>
            </UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              title="Ver logs de auditoria"
              @click="viewLogs(key)"
            >
              <i class="bi bi-list-ul text-lg"></i>
            </UiButton>
            <UiButton
              variant="ghost-danger"
              size="sm"
              title="Revogar chave permanentemente"
              @click="confirmRevoke(key)"
            >
              <i class="bi bi-trash3 text-lg"></i>
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Audit Logs Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showLogsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60" @click="showLogsModal = false"></div>
          <div class="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-p-border bg-p-raised p-6 shadow-2xl">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-p-text">Logs de Auditoria — {{ logsKeyName }}</h3>
              <button class="text-p-text-muted hover:text-p-text" @click="showLogsModal = false">
                <i class="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            <UiLoadingState v-if="loadingLogs" />

            <div v-else-if="auditLogs.length === 0" class="py-8 text-center text-sm text-p-text-muted">
              Nenhum log de auditoria encontrado para esta chave.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="log in auditLogs"
                :key="log.id"
                class="rounded-lg border border-p-border bg-p-overlay p-3"
              >
                <div class="flex items-center gap-2 text-xs text-p-text-muted mb-1">
                  <UiBadge :variant="log.action.includes(':write') || log.action.includes(':create') || log.action.includes(':delete') || log.action.includes(':update') ? 'warning' : 'info'" size="sm">
                    {{ log.action }}
                  </UiBadge>
                  <span v-if="log.targetType" class="text-p-accent">{{ log.targetType }}</span>
                  <span v-if="log.targetId" class="font-mono text-p-text-secondary">{{ log.targetId }}</span>
                  <span class="ml-auto">{{ formatDate(log.createdAt) }}</span>
                </div>
                <div v-if="log.metadata" class="text-xs text-p-text-muted mt-1 font-mono">
                  {{ JSON.stringify(log.metadata) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create Key Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60" @click="showCreateModal = false"></div>
          <div class="relative w-full max-w-lg rounded-2xl border border-p-border bg-p-raised p-6 shadow-2xl">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-lg font-bold text-p-text">Nova Chave API</h3>
              <button class="text-p-text-muted hover:text-p-text" @click="showCreateModal = false">
                <i class="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            <form @submit.prevent="createKey" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-p-text-secondary mb-1">Nome da Chave</label>
                <input
                  v-model="newKey.name"
                  type="text"
                  class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none"
                  placeholder="Ex: Agente Principal, Cursor IDE, etc."
                  required
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-p-text-secondary mb-2">Permissões</label>
                <div class="grid grid-cols-2 gap-2">
                  <label
                    v-for="perm in availablePermissions"
                    :key="perm.value"
                    class="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors"
                    :class="newKey.permissions.includes(perm.value)
                      ? 'border-p-accent/40 bg-p-accent/5'
                      : 'border-p-border hover:border-p-accent/20'"
                  >
                    <input
                      type="checkbox"
                      :value="perm.value"
                      v-model="newKey.permissions"
                      class="h-3.5 w-3.5 accent-p-accent"
                    >
                    <span class="text-xs text-p-text-secondary">{{ perm.label }}</span>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-p-text-secondary mb-1">Expiração (opcional)</label>
                <input
                  v-model="newKey.expiresAt"
                  type="date"
                  class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none"
                  :min="today"
                >
                <p class="text-xs text-p-text-muted mt-1">Deixe em branco para chave sem expiração.</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-p-text-secondary mb-1">Projetos (opcional)</label>
                <select
                  v-model="newKey.projectIds"
                  multiple
                  class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none min-h-[100px]"
                >
                  <option v-for="p in projects" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }})
                  </option>
                </select>
                <p class="text-xs text-p-text-muted mt-1">Segure Ctrl/Cmd para selecionar múltiplos. Nenhum selecionado = acesso a todos os projetos.</p>
              </div>

              <div v-if="createError" class="rounded-lg border border-p-danger/20 bg-p-danger/5 p-3 text-sm text-p-danger">
                {{ createError }}
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <UiButton variant="ghost" type="button" @click="showCreateModal = false">Cancelar</UiButton>
                <UiButton variant="primary" type="submit" :disabled="creating">
                  {{ creating ? 'Criando...' : 'Gerar Chave' }}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Created Key Result Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showResultModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60" @click="closeResult"></div>
          <div class="relative w-full max-w-lg rounded-2xl border border-p-success/30 bg-p-raised p-6 shadow-2xl">
            <div class="text-center mb-4">
              <div class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-p-success/10 text-p-success mb-3">
                <i class="bi bi-check-circle-fill text-3xl"></i>
              </div>
              <h3 class="text-lg font-bold text-p-text">Chave API Gerada!</h3>
              <p class="text-sm text-p-text-secondary mt-1">
                ⚠️ <strong>Esta é a única vez que a chave completa será exibida.</strong> Copie e armazene em local seguro.
              </p>
            </div>

            <div class="rounded-lg border border-p-accent/30 bg-p-accent/5 p-4 mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-p-text-muted uppercase tracking-wider">CHAVE API COMPLETA</span>
                <button
                  class="text-xs text-p-accent hover:text-p-accent-hover font-medium"
                  @click="copyToClipboard(createdKey)"
                >
                  {{ copied ? 'Copiado!' : 'Copiar' }}
                </button>
              </div>
              <code class="block text-sm text-p-accent font-mono break-all select-all bg-p-overlay rounded-md p-3 border border-p-border">
                {{ createdKey }}
              </code>
            </div>

            <div class="rounded-lg border border-p-border bg-p-overlay p-3 mb-4">
              <p class="text-xs text-p-text-secondary mb-2 font-medium">Como usar no Cursor, Claude Desktop ou VS Code:</p>
              <code class="block text-xs text-p-text-muted font-mono whitespace-pre-wrap bg-p-raised rounded-md p-3 border border-p-border">{{ mcpConfigExample }}</code>
            </div>

            <div class="flex justify-center">
              <UiButton variant="primary" @click="closeResult">
                Entendi, guardei a chave
              </UiButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'painel' })

const { fetchApi } = useApi()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const keys = ref([])
const projects = ref([])

// Create modal
const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const newKey = ref({
  name: '',
  permissions: [
    'projects:read', 'projects:write',
    'lots:read', 'lots:write',
    'leads:read', 'leads:write',
    'ai:read', 'ai:write'
  ],
  expiresAt: '',
  projectIds: []
})

// Result modal
const showResultModal = ref(false)
const createdKey = ref('')
const copied = ref(false)

// Logs modal
const showLogsModal = ref(false)
const loadingLogs = ref(false)
const auditLogs = ref([])
const logsKeyName = ref('')

const today = computed(() => new Date().toISOString().split('T')[0])

const mcpConfigExample = computed(() => `{
  "mcpServers": {
    "lotio": {
      "url": "https://lotio.com.br/mcp",
      "headers": {
        "X-API-Key": "${createdKey.value || 'SUA_CHAVE_AQUI'}"
      }
    }
  }
}`)

const availablePermissions = [
  { value: 'projects:read', label: 'Projetos — Leitura' },
  { value: 'projects:write', label: 'Projetos — Escrita' },
  { value: 'lots:read', label: 'Lotes — Leitura' },
  { value: 'lots:write', label: 'Lotes — Escrita' },
  { value: 'leads:read', label: 'Leads — Leitura' },
  { value: 'leads:write', label: 'Leads — Escrita' },
  { value: 'ai:read', label: 'IA — Leitura' },
  { value: 'ai:write', label: 'IA — Escrita' }
]

onMounted(() => {
  loadKeys()
  loadProjects()
})

async function loadKeys() {
  loading.value = true
  error.value = ''
  try {
    keys.value = await fetchApi('/agent-keys')
  } catch (e) {
    error.value = e.message || 'Erro ao carregar chaves'
  } finally {
    loading.value = false
  }
}

async function loadProjects() {
  try {
    const res = await fetchApi('/projects?limit=100')
    projects.value = res.data || res || []
  } catch {}
}

async function createKey() {
  creating.value = true
  createError.value = ''
  try {
    const body = {
      name: newKey.value.name,
      permissions: newKey.value.permissions,
      projectIds: newKey.value.projectIds
    }
    if (newKey.value.expiresAt) {
      body.expiresAt = new Date(newKey.value.expiresAt).toISOString()
    }

    const result = await fetchApi('/agent-keys', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })

    showCreateModal.value = false
    createdKey.value = result.apiKey
    showResultModal.value = true

    // Reset form
    newKey.value = {
      name: '',
      permissions: ['projects:read', 'projects:write', 'lots:read', 'lots:write', 'leads:read', 'leads:write', 'ai:read', 'ai:write'],
      expiresAt: '',
      projectIds: []
    }

    // Reload list
    await loadKeys()
  } catch (e) {
    createError.value = e.message || 'Erro ao criar chave'
  } finally {
    creating.value = false
  }
}

function closeResult() {
  showResultModal.value = false
  createdKey.value = ''
  copied.value = false
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

async function toggleKey(key) {
  try {
    await fetchApi(`/agent-keys/${key.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !key.isActive }),
      headers: { 'Content-Type': 'application/json' }
    })
    await loadKeys()
  } catch (e) {
    console.error('Erro ao alternar chave:', e)
  }
}

async function confirmRevoke(key) {
  if (!confirm(`Tem certeza que deseja revogar permanentemente a chave "${key.name}"? Esta ação não pode ser desfeita.`)) return

  try {
    await fetchApi(`/agent-keys/${key.id}`, { method: 'DELETE' })
    await loadKeys()
  } catch (e) {
    console.error('Erro ao revogar chave:', e)
  }
}

async function viewLogs(key) {
  logsKeyName.value = key.name
  showLogsModal.value = true
  loadingLogs.value = true
  auditLogs.value = []

  try {
    const res = await fetchApi(`/agent-keys/${key.id}/logs?limit=100`)
    auditLogs.value = res.data || res || []
  } catch (e) {
    console.error('Erro ao carregar logs:', e)
  } finally {
    loadingLogs.value = false
  }
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
