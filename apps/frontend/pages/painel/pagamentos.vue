<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

definePageMeta({
  layout: 'painel'
})

const { get, post, patch, delete: del } = useApi()
const toast = useToast()
const authStore = useAuthStore()
const canWritePayments = computed(() => authStore.canWriteFeature('payments'))
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'

type PaymentProvider = 'STRIPE' | 'ASAAS' | 'MERCADO_PAGO' | 'PAGAR_ME' | 'PAGSEGURO'

type PaymentKeys = {
  secretKey: string
  apiKey: string
  accessToken: string
  token: string
  isSandbox: boolean
}

type PaymentSecretField = 'secretKey' | 'apiKey' | 'accessToken' | 'token'

type PaymentConfigRecord = {
  id: string
  name: string
  provider: PaymentProvider
  keysJson?: Partial<PaymentKeys>
  configuredKeys?: Partial<Record<PaymentSecretField, boolean>>
  isActive: boolean
  webhookSecretConfigured?: boolean
  projects?: Array<{ id: string }>
}

type ApiError = {
  data?: {
    message?: string
  }
}

const configs = ref<PaymentConfigRecord[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingConfig = ref<PaymentConfigRecord | null>(null)

const form = ref({
  name: '',
  provider: 'STRIPE' as PaymentProvider,
  keysJson: {
    secretKey: '',
    apiKey: '',
    accessToken: '',
    token: '',
    isSandbox: false
  } as PaymentKeys,
  isActive: true,
  webhookSecret: ''
})

// Auto-reset when modal closes or opens to ensure clean state
watch(showModal, (val) => {
  if (!val) return
  if (!editingConfig.value) {
    if (typeof window !== 'undefined' && typeof window.crypto?.getRandomValues === 'function') {
      // Force a re-render of inputs by clearing and resetting
      form.value.keysJson = {
        secretKey: '',
        apiKey: '',
        accessToken: '',
        token: '',
        isSandbox: false
      }
    }
  }
})

async function fetchData() {
  loading.value = true
  try {
    const configsData = await get('/admin/payment-config')
    configs.value = configsData
  } catch (error) {
    console.error('Error fetching payment configs:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

const formErrors = ref<string[]>([])

const providerSecretFields: Record<PaymentProvider, PaymentSecretField[]> = {
  STRIPE: ['secretKey'],
  ASAAS: ['apiKey'],
  MERCADO_PAGO: ['accessToken'],
  PAGAR_ME: ['secretKey'],
  PAGSEGURO: ['token']
}

const sandboxProviders = new Set<PaymentProvider>(['ASAAS', 'PAGSEGURO'])

function hasStoredSecret(field: PaymentSecretField): boolean {
  return Boolean(editingConfig.value?.configuredKeys?.[field])
}

function hasSecretValue(field: PaymentSecretField): boolean {
  const value = form.value.keysJson[field]
  return typeof value === 'string' && value.trim().length > 0
}

function isSecretSatisfied(field: PaymentSecretField): boolean {
  return hasSecretValue(field) || hasStoredSecret(field)
}

function getSecretPlaceholder(field: PaymentSecretField, emptyPlaceholder: string): string {
  if (editingConfig.value && hasStoredSecret(field)) {
    return 'Já configurada. Preencha apenas para substituir.'
  }

  return emptyPlaceholder
}

function getProviderSlug(provider: PaymentProvider): string {
  const slugs: Record<PaymentProvider, string> = {
    STRIPE: 'stripe',
    ASAAS: 'asaas',
    MERCADO_PAGO: 'mercadopago',
    PAGAR_ME: 'pagarme',
    PAGSEGURO: 'pagseguro'
  }

  return slugs[provider]
}

function buildKeysPayload(provider: PaymentProvider, keys: PaymentKeys, isEditing: boolean): Partial<PaymentKeys> {
  const payload: Partial<PaymentKeys> = {}

  for (const field of providerSecretFields[provider]) {
    const value = keys[field]
    if (!isEditing || (typeof value === 'string' && value.trim().length > 0)) {
      payload[field] = value.trim()
    }
  }

  if (sandboxProviders.has(provider)) {
    payload.isSandbox = Boolean(keys.isSandbox)
  }

  return payload
}

function validateForm(): boolean {
  formErrors.value = []

  if (!form.value.name?.trim()) {
    formErrors.value.push('Nome do perfil é obrigatório.')
  }

  const keys = form.value.keysJson || {}
  const provider = form.value.provider

  if (provider === 'STRIPE') {
    if (!isSecretSatisfied('secretKey')) {
      formErrors.value.push('Secret Key do Stripe é obrigatória.')
    }
  } else if (provider === 'ASAAS') {
    if (!isSecretSatisfied('apiKey')) {
      formErrors.value.push('API Key do Asaas é obrigatória.')
    }
  } else if (provider === 'MERCADO_PAGO') {
    if (!isSecretSatisfied('accessToken')) {
      formErrors.value.push('Access Token do Mercado Pago é obrigatório.')
    }
  } else if (provider === 'PAGAR_ME') {
    if (!isSecretSatisfied('secretKey')) {
      formErrors.value.push('Secret Key do Pagar.me é obrigatória.')
    }
  } else if (provider === 'PAGSEGURO') {
    if (!isSecretSatisfied('token')) {
      formErrors.value.push('Token de Acesso do PagSeguro é obrigatório.')
    }
  }

  return formErrors.value.length === 0
}

async function saveConfig() {
  if (!validateForm()) {
    toast.error(formErrors.value[0] || 'Revise os campos obrigatórios.')
    return
  }
  try {
    const isEditing = Boolean(editingConfig.value)
    const payload: Record<string, any> = {
      name: form.value.name,
      provider: form.value.provider,
      isActive: form.value.isActive,
      keysJson: buildKeysPayload(form.value.provider, form.value.keysJson, isEditing)
    }

    const normalizedWebhookSecret = form.value.webhookSecret.trim()

    if (isEditing) {
      if (normalizedWebhookSecret) {
        payload.webhookSecret = normalizedWebhookSecret
      }

      await patch(`/admin/payment-config/${editingConfig.value.id}`, payload)
      toast.success('Configuração atualizada')
    } else {
      if (normalizedWebhookSecret) {
        payload.webhookSecret = normalizedWebhookSecret
      }

      await post('/admin/payment-config', payload)
      toast.success('Configuração criada')
    }
    showModal.value = false
    fetchData()
  } catch (error) {
    toast.error((error as ApiError)?.data?.message || 'Erro ao salvar configuração')
  }
}

async function removeConfig(id: string) {
  if (!confirm('Tem certeza que deseja remover este gateway? Projetos que o utilizam deixarão de aceitar pagamentos.')) return
  try {
    await del(`/admin/payment-config/${id}`)
    toast.success('Configuração removida')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover configuração')
  }
}

function openCreate() {
  editingConfig.value = null
  formErrors.value = []
  form.value = {
    name: '',
    provider: 'STRIPE',
    keysJson: {
      secretKey: '',
      apiKey: '',
      accessToken: '',
      token: '',
      isSandbox: false
    },
    isActive: true,
    webhookSecret: ''
  }
  showModal.value = true
}

function openEdit(config: PaymentConfigRecord) {
  editingConfig.value = config
  formErrors.value = []

  // Ensure keysJson is initialized even if empty in DB
  const baseKeys = {
    secretKey: '',
    apiKey: '',
    accessToken: '',
    token: '',
    isSandbox: false
  }

  form.value = {
    name: config.name,
    provider: config.provider,
    keysJson: { ...baseKeys, ...(config.keysJson || {}) },
    isActive: config.isActive,
    webhookSecret: ''
  }
  showModal.value = true
}

function getWebhookUrl(provider: PaymentProvider, projectId?: string) {
  if (!process.client) return ''
  const base = `${window.location.origin}/api`
  return `${base}/webhooks/${getProviderSlug(provider)}/${projectId || ':projectId'}`
}

function copyWebhookUrl(provider: PaymentProvider, projectId?: string) {
  const url = getWebhookUrl(provider, projectId)
  navigator.clipboard.writeText(url)
  toast.success('URL copiada!')
}

// Reset keysJson when provider changes (only for new gateways)
watch(() => form.value.provider, () => {
  if (!editingConfig.value) {
    form.value.keysJson = {
      secretKey: '',
      apiKey: '',
      accessToken: '',
      token: '',
      isSandbox: false
    }
    form.value.webhookSecret = ''
  }
  formErrors.value = []
})

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader title="Configurações de Pagamento" description="Gerencie suas chaves de API e gateways de forma centralizada.">
      <template #actions>
        <UiButton variant="primary" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="openCreate">
          + Novo Gateway
        </UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" />

    <UiEmptyState
      v-else-if="configs.length === 0"
      title="Nenhum gateway configurado"
      description="Configure um gateway (Stripe, Asaas, etc) para permitir reservas online nos seus projetos."
    >
      <UiButton variant="primary" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="openCreate">
        Configurar Primeiro Gateway
      </UiButton>
    </UiEmptyState>

    <div v-else class="grid gap-6">
      <div v-for="config in configs" :key="config.id" class="rounded-xl border-l-4 border border-p-border bg-p-elevated p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg" :class="{ 'border-l-p-accent': true }">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-4">
            <span class="rounded-full px-3 py-1 text-xs font-bold uppercase text-white"
              :class="{
                'bg-[#635bff]': config.provider === 'STRIPE',
                'bg-[#0062ff]': config.provider === 'ASAAS',
                'bg-[#009ee3]': config.provider === 'MERCADO_PAGO',
                'bg-[#3c5af4]': config.provider === 'PAGAR_ME',
                'bg-[#3fb43f]': config.provider === 'PAGSEGURO',
              }">
              {{ config.provider }}
            </span>
            <div>
              <h3 class="text-lg font-semibold text-p-text">{{ config.name }}</h3>
              <p class="mt-1 text-sm" :class="config.isActive ? 'text-p-success' : 'text-p-text-muted'">
                {{ config.isActive ? '● Ativo Globalmente' : '○ Desativado' }}
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <UiButton variant="secondary" size="sm" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="openEdit(config)">Editar</UiButton>
            <UiButton variant="danger" size="sm" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="removeConfig(config.id)">Remover</UiButton>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <div class="text-sm">
            <span class="text-p-text-muted">Projetos vinculados:</span>
            <span class="ml-2 font-semibold text-p-text-secondary">{{ config.projects?.length || 0 }}</span>
          </div>
          <div class="text-sm">
            <span class="text-p-text-muted">Webhook URL:</span>
            <div class="mt-1 flex items-center gap-2 rounded-lg bg-p-raised px-3 py-2">
              <code class="flex-1 truncate text-xs text-p-text-secondary">{{ getWebhookUrl(config.provider, config.projects?.length === 1 ? config.projects[0]?.id : undefined) }}</code>
              <button @click="copyWebhookUrl(config.provider, config.projects?.length === 1 ? config.projects[0]?.id : undefined)" class="shrink-0 rounded border border-p-border bg-p-overlay px-2 py-0.5 text-xs text-p-text-muted hover:bg-p-raised transition-colors">Copiar</button>
            </div>
            <small v-if="config.projects?.length !== 1" class="mt-2 block text-xs text-p-text-muted">Use o ID do projeto no lugar de :projectId ao configurar o provedor.</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <UiModal v-model="showModal" :title="(editingConfig ? 'Editar' : 'Novo') + ' Gateway de Pagamento'" size="lg">
      <form @submit.prevent="saveConfig" class="space-y-4">
        <!-- Validation errors -->
        <div v-if="formErrors.length > 0" class="rounded-lg border border-p-danger/30 bg-p-danger-subtle p-3">
          <p v-for="err in formErrors" :key="err" class="text-sm text-p-danger">{{ err }}</p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-p-text-secondary">Nome do Perfil (Ex: Stripe Principal)</label>
          <input v-model="form.name" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Identificador para uso interno" required />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Gateway Operador</label>
            <select v-model="form.provider" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none">
              <option value="STRIPE">Stripe</option>
              <option value="ASAAS">Asaas</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="PAGAR_ME">Pagar.me</option>
              <option value="PAGSEGURO">PagSeguro</option>
            </select>
          </div>
          <div class="flex items-end">
            <div class="mb-2 flex items-center gap-2">
              <input type="checkbox" v-model="form.isActive" id="chkActive" />
              <label for="chkActive" class="text-sm font-medium text-p-text-secondary">Ativo</label>
            </div>
          </div>
        </div>

        <hr class="border-p-border" />

        <!-- Provider Specific Fields -->
        <div v-if="form.provider === 'STRIPE'" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Secret Key (sk_...)</label>
            <AppPasswordInput v-model="form.keysJson.secretKey" :placeholder="getSecretPlaceholder('secretKey', 'Insira sua Secret Key do Stripe')" required autocomplete="new-password" />
            <small v-if="editingConfig && hasStoredSecret('secretKey')" class="mt-2 block text-xs text-p-text-muted">Secret Key já salva. Deixe em branco para manter.</small>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Webhook Signing Secret (whsec_...)</label>
            <AppPasswordInput v-model="form.webhookSecret" :placeholder="editingConfig && editingConfig.webhookSecretConfigured ? 'Já configurado. Preencha apenas para substituir.' : 'Opcional'" autocomplete="new-password" />
            <small v-if="editingConfig && editingConfig.webhookSecretConfigured" class="mt-2 block text-xs text-p-text-muted">Webhook secret já salvo. Deixe em branco para manter.</small>
          </div>
        </div>

        <div v-if="form.provider === 'ASAAS'" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">API Key ($...)</label>
            <AppPasswordInput v-model="form.keysJson.apiKey" :placeholder="getSecretPlaceholder('apiKey', 'Access Token do Asaas')" required autocomplete="new-password" />
            <small v-if="editingConfig && hasStoredSecret('apiKey')" class="mt-2 block text-xs text-p-text-muted">API Key já salva. Deixe em branco para manter.</small>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <input type="checkbox" v-model="form.keysJson.isSandbox" id="chkAsaasSandbox" />
            <label for="chkAsaasSandbox" class="text-sm text-p-text-secondary">Ambiente Sandbox</label>
          </div>
        </div>

        <div v-if="form.provider === 'MERCADO_PAGO'">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Access Token (APP_USR-...)</label>
            <AppPasswordInput v-model="form.keysJson.accessToken" :placeholder="getSecretPlaceholder('accessToken', 'Insira seu Access Token do Mercado Pago')" required autocomplete="new-password" />
            <small v-if="editingConfig && hasStoredSecret('accessToken')" class="mt-2 block text-xs text-p-text-muted">Access Token já salvo. Deixe em branco para manter.</small>
          </div>
        </div>

        <div v-if="form.provider === 'PAGAR_ME'">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Secret Key (ak_...)</label>
            <AppPasswordInput v-model="form.keysJson.secretKey" :placeholder="getSecretPlaceholder('secretKey', 'Insira sua Secret Key do Pagar.me')" required autocomplete="new-password" />
            <small v-if="editingConfig && hasStoredSecret('secretKey')" class="mt-2 block text-xs text-p-text-muted">Secret Key já salva. Deixe em branco para manter.</small>
          </div>
        </div>

        <div v-if="form.provider === 'PAGSEGURO'" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Token de Acesso</label>
            <AppPasswordInput v-model="form.keysJson.token" :placeholder="getSecretPlaceholder('token', 'Insira seu token do PagSeguro')" required autocomplete="new-password" />
            <small v-if="editingConfig && hasStoredSecret('token')" class="mt-2 block text-xs text-p-text-muted">Token já salvo. Deixe em branco para manter.</small>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <input type="checkbox" v-model="form.keysJson.isSandbox" id="chkPagSeguroSandbox" />
            <label for="chkPagSeguroSandbox" class="text-sm text-p-text-secondary">Ambiente Sandbox</label>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showModal = false">Cancelar</UiButton>
          <UiButton variant="primary" @click="saveConfig">Salvar Perfil</UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
