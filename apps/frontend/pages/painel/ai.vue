<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

interface AiConfig {
  id: string
  name: string
  provider: string
  model: string
  apiKey?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  isActive: boolean
}

definePageMeta({
  layout: 'default'
})

const { get, post, put, delete: del } = useApi()
const toast = useToast()

const configs = ref<AiConfig[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingConfig = ref<AiConfig | null>(null)

const form = ref({
  name: '',
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: '',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 1000,
  isActive: true
})

const providerModels: Record<string, { label: string, value: string }[]> = {
  openai: [
    { label: 'GPT-4o (Recomendado)', value: 'gpt-4o' },
    { label: 'GPT-4o Mini (Econômico)', value: 'gpt-4o-mini' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
  ],
  anthropic: [
    { label: 'Claude 3.5 Sonnet (Recomendado)', value: 'claude-3-5-sonnet-20240620' },
    { label: 'Claude 3 Haiku (Rápido)', value: 'claude-3-haiku-20240307' },
    { label: 'Claude 3 Opus (Poderoso)', value: 'claude-3-opus-20240229' }
  ],
  google: [
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
  ]
}

const suggestedModels = computed(() => providerModels[form.value.provider] || [])

const apiKeyPlaceholder = computed(() => {
  const placeholders: Record<string, string> = {
    openai: 'sk-... (Ex: sk-proj-...)',
    anthropic: 'sk-ant-...',
    google: 'AIza...'
  }
  return placeholders[form.value.provider] || 'Sua API Key'
})

const validateApiKey = computed(() => {
  const key = form.value.apiKey || ''
  if (!key) return null
  if (form.value.provider === 'openai' && !key.startsWith('sk-')) return 'Chave OpenAI deve começar com sk-'
  if (form.value.provider === 'anthropic' && !key.startsWith('sk-ant-')) return 'Chave Anthropic deve começar com sk-ant-'
  return null
})

async function fetchData() {
  loading.value = true
  try {
    const data = await get('/ai/configs')
    configs.value = data as AiConfig[]
  } catch (error) {
    console.error('Error fetching AI configs:', error)
    toast.error('Erro ao carregar configurações de IA')
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  try {
    const payload = { ...form.value }

    if (editingConfig.value) {
      await put(`/ai/configs/${editingConfig.value.id}`, payload)
      toast.success('Configuração atualizada')
    } else {
      await post('/ai/configs', payload)
      toast.success('Configuração criada')
    }
    showModal.value = false
    fetchData()
  } catch (error: any) {
    toast.error(error?.data?.message || 'Erro ao salvar configuração')
  }
}

async function removeConfig(id: string) {
  if (!confirm('Tem certeza que deseja remover esta configuração? Projetos vinculados deixarão de usar a IA.')) return
  try {
    await del(`/ai/configs/${id}`)
    toast.success('Configuração removida')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover configuração')
  }
}

function openCreate() {
  editingConfig.value = null
  form.value = {
    name: '',
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: '',
    systemPrompt: 'Você é um assistente virtual especializado em ajudar clientes a encontrar o lote ideal.',
    temperature: 0.7,
    maxTokens: 1000,
    isActive: true
  }
  showModal.value = true
}

function openEdit(config: AiConfig) {
  editingConfig.value = config
  form.value = {
    name: config.name,
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey || '',
    systemPrompt: config.systemPrompt || '',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 1000,
    isActive: config.isActive
  }
  showModal.value = true
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Configurações de IA</h1>
        <p class="page-subtitle">Gerencie modelos e chaves de API para os assistentes virtuais dos seus projetos.</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <span>+ Nova Configuração</span>
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="configs.length === 0" class="empty-state card">
      <div class="empty-state-icon">🤖</div>
      <h3>Nenhuma configuração de IA</h3>
      <p>Crie sua primeira configuração para habilitar o assistente nos seus projetos.</p>
      <button class="btn btn-primary" @click="openCreate">Começar agora</button>
    </div>

    <div v-else class="ai-config-grid">
      <div v-for="config in configs" :key="config.id" class="card ai-config-card">
        <div class="ai-card-header">
          <div class="ai-card-info">
            <h3 class="config-name">{{ config.name }}</h3>
            <span class="badge" :class="config.isActive ? 'badge-success' : 'badge-neutral'">
              {{ config.isActive ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div class="provider-badge">{{ config.provider.toUpperCase() }}</div>
        </div>
        
        <div class="ai-config-details">
          <div class="detail-item">
            <span class="detail-label">Modelo</span>
            <span class="detail-value">{{ config.model }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">API Key</span>
            <span class="detail-value font-mono">{{ config.apiKey ? '••••••••••••' : 'Não configurada' }}</span>
          </div>
        </div>

        <div class="ai-card-actions mt-auto border-t border-gray-100 pt-5 flex gap-2">
          <button class="btn btn-outline btn-sm flex-1" @click="openEdit(config)">
             <i class="pi pi-pencil mr-1"></i> Editar
          </button>
          <button class="btn btn-ghost btn-sm text-danger" @click="removeConfig(config.id)">
             <i class="pi pi-trash mr-1"></i> Excluir
          </button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-card max-w-2xl">
        <div class="modal-header">
          <h2>{{ editingConfig ? 'Editar Configuração' : 'Nova Configuração' }}</h2>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        
        <form @submit.prevent="saveConfig" class="modal-body">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Nome da Configuração</label>
              <input v-model="form.name" class="form-input" placeholder="Ex: Assistente Padrão" required />
            </div>

            <div class="form-group">
              <label class="form-label">Provedor</label>
              <select v-model="form.provider" class="form-input" @change="form.model = suggestedModels[0]?.value || ''">
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="google">Google (Gemini)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Modelo</label>
              <div class="model-selection-wrapper">
                <input v-model="form.model" class="form-input" list="model-suggestions" placeholder="Ex: gpt-4o, gpt-3.5-turbo" required />
                <datalist id="model-suggestions">
                   <option v-for="m in suggestedModels" :key="m.value" :value="m.value">{{ m.label }}</option>
                </datalist>
                <div class="model-hint" v-if="suggestedModels.length">
                   Sugestões: 
                   <button type="button" @click="form.model = m.value" v-for="m in suggestedModels.slice(0, 3)" :key="m.value" class="hint-btn">
                     {{ m.value }}
                   </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Chave de API (API Key)</label>
              <input v-model="form.apiKey" type="password" class="form-input" :placeholder="apiKeyPlaceholder" :class="{ 'input-error': validateApiKey }" required />
              <small v-if="validateApiKey" class="error-msg">{{ validateApiKey }}</small>
              <small v-else class="text-muted">Sua chave é salva com segurança.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Temperatura (0.0 a 1.0)</label>
              <input v-model.number="form.temperature" type="number" step="0.1" min="0" max="1" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Máximo de Tokens</label>
              <input v-model.number="form.maxTokens" type="number" class="form-input" />
            </div>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Instruções do Sistema (System Prompt) - Opcional</label>
            <textarea v-model="form.systemPrompt" class="form-textarea" rows="4" placeholder="Defina a personalidade e regras base do assistente..."></textarea>
            <small class="text-muted">Nota: O sistema já inclui travas de segurança automáticas.</small>
          </div>

          <div class="form-group mt-4 flex items-center gap-2">
            <input type="checkbox" v-model="form.isActive" id="config-active" />
            <label for="config-active">Configuração Ativa</label>
          </div>

          <div class="modal-footer mt-6">
            <button type="button" class="btn btn-ghost" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: var(--space-6);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.page-subtitle {
  color: var(--gray-500);
}

.ai-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 400px));
  gap: var(--space-6);
}

.ai-config-card {
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  min-height: 220px;
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  padding: var(--space-6);
}

.ai-config-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-light);
}

.ai-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
}

.ai-card-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.config-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.provider-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  background: var(--gray-100);
  min-width: 70px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--gray-500);
  border: 1px solid var(--gray-200);
  padding: 0 var(--space-2);
  text-transform: uppercase;
}

.ai-config-card:hover .provider-badge {
  background: white;
  border-color: var(--primary-light);
  color: var(--primary);
}

.ai-config-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
}

.detail-label {
  color: var(--gray-400);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--gray-700);
}

.font-mono {
  font-family: var(--font-mono);
}

.ai-card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.text-danger {
  color: var(--danger);
}

.empty-state {
  text-align: center;
  padding: var(--space-12);
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.modal-card {
  background: white;
  border-radius: var(--radius-lg);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-100);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: var(--space-6);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--gray-100);
}

.model-selection-wrapper {
  position: relative;
}

.model-hint {
  font-size: 0.7rem;
  color: var(--gray-500);
  margin-top: 4px;
}

.hint-btn {
  background: var(--gray-100);
  border: none;
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: 4px;
  cursor: pointer;
}

.hint-btn:hover {
  background: var(--gray-200);
}

.input-error {
  border-color: var(--danger) !important;
}

.error-msg {
  color: var(--danger);
  font-size: 0.75rem;
  display: block;
  margin-top: 4px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--gray-400);
}
</style>
