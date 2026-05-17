<template>
  <div class="space-y-6">
    <UiPageHeader title="Configurações do Sistema" description="Gerencie contatos do site e preferências da plataforma." />

    <div class="grid gap-6 md:grid-cols-2">
      <!-- Settings Card -->
      <UiCard>
        <h2 class="mb-5 flex items-center gap-2 text-lg font-semibold text-p-text">
          <i class="pi pi-cog text-p-accent"></i>
          Landing Page
        </h2>

        <UiLoadingState v-if="loading" />
        <form v-else @submit.prevent="saveSettings" class="space-y-4">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">WhatsApp de Contato</label>
            <input
              :value="settings.contactWhatsapp"
              @input="settings.contactWhatsapp = applyPhoneMask($event.target.value)"
              type="text"
              class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none"
              placeholder="(00) 00000-0000"
            >
            <p class="mt-1 text-xs text-p-text-muted">Se preenchido, o site mostrará o botão de WhatsApp.</p>
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">E-mail de Contato</label>
            <input
              v-model="settings.contactEmail"
              type="email"
              class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none"
              placeholder="contato@empresa.com"
            >
          </div>

          <div class="flex items-center gap-2">
            <input v-model="settings.leadFormEnabled" type="checkbox" id="form-en" class="h-4 w-4">
            <label for="form-en" class="text-sm font-medium text-p-text-secondary">Ativar formulário de lead no site</label>
          </div>

          <UiButton variant="primary" type="submit" class="w-full" :disabled="saving">
            {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
          </UiButton>
        </form>
      </UiCard>

      <!-- Maintenance Mode Card -->
      <UiCard>
        <h2 class="mb-5 flex items-center gap-2 text-lg font-semibold text-p-text">
          <i class="pi pi-wrench text-amber-500"></i>
          Modo Manutenção
        </h2>

        <UiLoadingState v-if="maintenanceLoading" />
        <div v-else class="space-y-5">
          <div class="flex items-center gap-3">
            <UiBadge :variant="maintenance.enabled ? 'danger' : 'success'" size="md">
              {{ maintenance.enabled ? 'ATIVO' : 'INATIVO' }}
            </UiBadge>
            <span v-if="maintenance.enabled && maintenance.enabledAt" class="text-xs text-p-text-muted">
              Desde {{ formatDate(maintenance.enabledAt) }}
            </span>
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">Mensagem de Manutenção</label>
            <textarea
              v-model="maintenance.message"
              class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none resize-y"
              rows="3"
              placeholder="Sistema em manutenção. Voltaremos em breve."
            ></textarea>
            <p class="mt-1 text-xs text-p-text-muted">
              Mensagem exibida aos visitantes durante a manutenção.
            </p>
          </div>

          <UiButton
            v-if="!maintenance.enabled"
            variant="warning"
            class="w-full"
            :disabled="maintenanceSaving"
            @click="toggleMaintenance(true)"
          >
            {{ maintenanceSaving ? 'Ativando...' : 'Ativar Manutenção' }}
          </UiButton>
          <UiButton
            v-else
            variant="primary"
            class="w-full"
            :disabled="maintenanceSaving"
            @click="toggleMaintenance(false)"
          >
            {{ maintenanceSaving ? 'Desativando...' : 'Desativar Manutenção' }}
          </UiButton>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'painel' })

const authStore = useAuthStore()
if (!authStore.isSysAdmin) {
  navigateTo(authStore.getDashboardRoute())
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const settings = ref({
  contactWhatsapp: '',
  contactEmail: '',
  leadFormEnabled: true
})

const maintenanceLoading = ref(true)
const maintenanceSaving = ref(false)
const maintenance = ref({
  enabled: false,
  message: '',
  enabledAt: null,
  enabledBy: null
})

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchMaintenance()])
})

async function fetchSettings() {
  loading.value = true
  try {
    // Actually our public endpoint is safer if we want to pre-fill
    const publicData = await api.get('/p/settings')
    if (publicData) settings.value = { ...publicData }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await api.patch('/settings', settings.value)
    toast.success('Configurações salvas com sucesso!')
  } catch (e) {
    toast.error('Erro ao salvar configurações.')
  } finally {
    saving.value = false
  }
}

async function fetchMaintenance() {
  maintenanceLoading.value = true
  try {
    const data = await api.get('/settings/maintenance')
    if (data) maintenance.value = data
  } catch (e) {
    console.error(e)
  } finally {
    maintenanceLoading.value = false
  }
}

async function toggleMaintenance(enabled) {
  maintenanceSaving.value = true
  try {
    const data = await api.post('/settings/maintenance', {
      enabled,
      message: maintenance.value.message || ''
    })
    if (data) maintenance.value = data
    toast.success(enabled ? 'Modo manutenção ativado!' : 'Modo manutenção desativado!')
  } catch (e) {
    toast.error('Erro ao alterar modo manutenção.')
  } finally {
    maintenanceSaving.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
