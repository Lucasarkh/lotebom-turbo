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
  layout: 'painel'
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
    systemPrompt: '',
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
    apiKey: '',
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
  <div class="space-y-6">
    <UiPageHeader title="Configurações de IA" description="Gerencie modelos e chaves de API para os assistentes virtuais dos seus projetos.">
      <template #actions>
        <UiButton variant="primary" @click="openCreate">
          <span>+ Nova Configuração</span>
        </UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" />

    <UiEmptyState
      v-else-if="configs.length === 0"
      title="Nenhuma configuração de IA"
      description="Crie sua primeira configuração para habilitar o assistente nos seus projetos."
    >
      <template #icon>
        <i class="bi bi-robot text-2xl text-p-text-muted"></i>
      </template>
      <template #action>
        <UiButton variant="primary" size="lg" @click="openCreate">Começar agora</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
      <div
        v-for="config in configs"
        :key="config.id"
        class="flex flex-col rounded-xl border border-p-border bg-p-elevated p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-p-accent/20 min-h-[240px]"
      >
        <div class="flex justify-between items-start mb-6">
          <div class="flex flex-col gap-2">
            <h3 class="text-[17px] font-bold text-p-text leading-tight">{{ config.name }}</h3>
            <UiBadge :variant="config.isActive ? 'success' : 'neutral'">
              {{ config.isActive ? 'Ativo' : 'Inativo' }}
            </UiBadge>
          </div>
          <div class="flex items-center justify-center text-[0.68rem] font-extrabold tracking-wider bg-p-overlay min-w-[82px] h-[30px] rounded-md text-p-text-secondary border border-p-border px-2.5 uppercase">
            {{ config.provider.toUpperCase() }}
          </div>
        </div>

        <div class="flex flex-col gap-2.5 mb-5 py-3.5 border-t border-b border-p-border">
          <div class="flex justify-between items-center gap-3 py-0.5">
            <span class="text-[0.72rem] font-bold uppercase tracking-wide text-p-text-muted">Modelo</span>
            <span class="font-semibold text-sm text-p-text-secondary text-right">{{ config.model }}</span>
          </div>
          <div class="flex justify-between items-center gap-3 py-0.5">
            <span class="text-[0.72rem] font-bold uppercase tracking-wide text-p-text-muted">API Key</span>
            <span class="font-semibold text-sm text-p-text-secondary text-right font-mono">{{ config.apiKey ? '••••••••••••' : 'Não configurada' }}</span>
          </div>
          <div v-if="config.systemPrompt" class="flex justify-between items-center gap-3 py-0.5">
            <span class="text-[0.72rem] font-bold uppercase tracking-wide text-p-text-muted">Prompt custom</span>
            <span class="font-semibold text-sm text-p-accent text-right">Configurado</span>
          </div>
        </div>

        <div class="flex items-center gap-2.5 pt-3.5 mt-auto">
          <UiButton variant="outline" size="sm" class="flex-1" @click="openEdit(config)">
            <i class="pi pi-pencil mr-1"></i> Editar
          </UiButton>
          <UiButton variant="danger" size="sm" class="min-w-[112px]" @click="removeConfig(config.id)">
            <i class="pi pi-trash mr-1"></i> Excluir
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <UiModal v-model="showModal" :title="editingConfig ? 'Editar Configuração' : 'Nova Configuração'" size="lg">
      <form @submit.prevent="saveConfig">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UiInput v-model="form.name" label="Nome da Configuração" placeholder="Ex: Assistente Padrão" required />

          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Provedor</label>
            <select v-model="form.provider" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" @change="form.model = suggestedModels[0]?.value || ''">
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
            </select>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Modelo</label>
            <div>
              <input v-model="form.model" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent" list="model-suggestions" placeholder="Ex: gpt-4o, gpt-3.5-turbo" required />
              <datalist id="model-suggestions">
                 <option v-for="m in suggestedModels" :key="m.value" :value="m.value">{{ m.label }}</option>
              </datalist>
              <div class="text-[0.7rem] text-p-text-muted mt-1" v-if="suggestedModels.length">
                 Sugestões:
                 <button type="button" @click="form.model = m.value" v-for="m in suggestedModels.slice(0, 3)" :key="m.value" class="bg-p-overlay border-none rounded px-1.5 py-px ml-1 cursor-pointer text-p-text-secondary hover:bg-p-raised">
                   {{ m.value }}
                 </button>
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Chave de API (API Key)</label>
            <AppPasswordInput
              v-model="form.apiKey"
              :placeholder="editingConfig ? 'Deixe em branco para manter a chave atual' : apiKeyPlaceholder"
              :class="{ 'border-p-danger': validateApiKey }"
              :required="!editingConfig"
            />
            <small v-if="validateApiKey" class="text-p-danger text-xs block mt-1">{{ validateApiKey }}</small>
            <small v-else class="text-p-text-muted text-xs block mt-1">Sua chave é salva com segurança.</small>
          </div>

          <UiInput v-model.number="form.temperature" label="Temperatura (0.0 a 1.0)" type="number" step="0.1" min="0" max="1" />

          <UiInput v-model.number="form.maxTokens" label="Máximo de Tokens" type="number" />
        </div>

        <div class="mt-4 flex items-center gap-2">
          <input type="checkbox" v-model="form.isActive" id="config-active" class="rounded border-p-border" />
          <label for="config-active" class="text-sm text-p-text-secondary">Configuração Ativa</label>
        </div>

        <div class="mt-4">
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Prompt Personalizado (opcional)</label>
          <textarea
            v-model="form.systemPrompt"
            class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent resize-y min-h-[100px]"
            rows="5"
            maxlength="2000"
            placeholder="Ex: Seja sempre muito simpático e trate os clientes pelo nome. Mencione que nosso loteamento fica próximo ao Shopping XYZ."
          ></textarea>
          <small class="text-p-text-muted text-xs block mt-1">
            Instruções adicionais de personalidade e contexto para o assistente. São sempre acrescentadas <em>após</em> as regras de segurança obrigatórias da plataforma — você não pode desativá-las.
            <span :class="form.systemPrompt.length > 1800 ? 'text-p-danger' : ''">{{ form.systemPrompt.length }}/2000</span>
          </small>
        </div>

        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-p-border">
          <UiButton type="button" variant="ghost" @click="showModal = false">Cancelar</UiButton>
          <UiButton type="submit" variant="primary">Salvar</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
