<script setup lang="ts">
const { get, post, patch, delete: del } = useApi()
const toast = useToast()
const authStore = useAuthStore()
const canWriteCampaigns = computed(() => authStore.canWriteFeature('campaigns'))
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects')
})

const campaigns = ref<any[]>([])
const projects = ref<any[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingCampaign = ref<any>(null)

const form = ref({
  projectId: '',
  name: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  budget: 0,
  active: true
})

async function fetchData() {
  loading.value = true
  try {
    const campaignsData = await get('/campaigns')
    campaigns.value = campaignsData

    if (canLoadProjectsCatalog.value) {
      const projectsRes = await get('/projects')
      projects.value = projectsRes.data
    } else {
      projects.value = []
    }
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

async function saveCampaign() {
  try {
    if (editingCampaign.value) {
      await patch(`/campaigns/${editingCampaign.value.id}`, form.value)
      toast.success('Campanha atualizada com sucesso')
    } else {
      await post('/campaigns', form.value)
      toast.success('Campanha criada com sucesso')
    }
    showModal.value = false
    fetchData()
  } catch (error) {
    toast.error('Erro ao salvar campanha')
  }
}

async function removeCampaign(id: string) {
  if (!confirm('Tem certeza que deseja remover esta campanha?')) return
  try {
    await del(`/campaigns/${id}`)
    toast.success('Campanha removida')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover campanha')
  }
}

function openCreate() {
  editingCampaign.value = null
  form.value = {
    projectId: '',
    name: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    budget: 0,
    active: true
  }
  showModal.value = true
}

function openEdit(campaign: any) {
  editingCampaign.value = campaign
  form.value = {
    projectId: campaign.projectId,
    name: campaign.name,
    utmSource: campaign.utmSource,
    utmMedium: campaign.utmMedium || '',
    utmCampaign: campaign.utmCampaign,
    utmContent: campaign.utmContent || '',
    utmTerm: campaign.utmTerm || '',
    budget: campaign.budget || 0,
    active: campaign.active
  }
  showModal.value = true
}

function generateLink(campaign: any) {
  if (!campaign.project) return ''
  const projectSlug = campaign.project.slug

  // Build URL with query params
  let url = `${window.location.origin}/${projectSlug}?utm_source=${campaign.utmSource}&utm_campaign=${campaign.utmCampaign}`

  if (campaign.utmMedium) url += `&utm_medium=${campaign.utmMedium}`
  if (campaign.utmContent) url += `&utm_content=${campaign.utmContent}`
  if (campaign.utmTerm) url += `&utm_term=${campaign.utmTerm}`

  return url
}

function copyLink(campaign: any) {
  const url = generateLink(campaign)
  if (!url) return
  navigator.clipboard.writeText(url)
  toast.success('Link UTM copiado!')
}

onMounted(fetchData)

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader title="Gestão de Campanhas" description="Crie e gerencie links UTM para seus empreendimentos">
      <template #actions>
        <UiButton variant="primary" :disabled="!canWriteCampaigns" :title="!canWriteCampaigns ? writePermissionHint : undefined" @click="openCreate">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nova Campanha
        </UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" text="Carregando..." />

    <UiCard v-else padding="none">
      <UiEmptyState
        v-if="campaigns.length === 0"
        title="Nenhuma campanha cadastrada"
        description="Crie campanhas UTM para rastrear a origem dos seus leads."
        icon="📢"
      />

      <UiTable v-else>
        <template #head>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Nome</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Empreendimento</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Parâmetros UTM</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
          <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
        </template>
        <tr v-for="campaign in campaigns" :key="campaign.id" class="border-b border-p-border">
          <td class="px-4 py-3 text-sm font-semibold text-p-text">{{ campaign.name }}</td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ campaign.project?.name || '-' }}</td>
          <td class="px-4 py-3 text-sm">
            <div class="flex flex-wrap gap-1.5">
              <UiBadge variant="neutral">src: {{ campaign.utmSource }}</UiBadge>
              <UiBadge variant="neutral">cmp: {{ campaign.utmCampaign }}</UiBadge>
            </div>
          </td>
          <td class="px-4 py-3 text-sm">
            <UiBadge :variant="campaign.active ? 'success' : 'danger'">
              {{ campaign.active ? 'Ativa' : 'Inativa' }}
            </UiBadge>
          </td>
          <td class="px-4 py-3 text-sm">
            <div class="flex items-center justify-end gap-2">
              <UiButton variant="outline" size="sm" :to="`/painel/campanhas/${campaign.id}`">Performance</UiButton>
              <UiButton variant="outline" size="sm" @click="copyLink(campaign)">Copiar Link</UiButton>
              <button class="rounded-lg p-1.5 text-p-text-muted hover:bg-p-overlay hover:text-p-text transition-colors" :disabled="!canWriteCampaigns" @click="openEdit(campaign)" :title="!canWriteCampaigns ? writePermissionHint : 'Editar'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="rounded-lg p-1.5 text-p-danger hover:bg-p-danger/10 transition-colors" :disabled="!canWriteCampaigns" @click="removeCampaign(campaign.id)" :title="!canWriteCampaigns ? writePermissionHint : 'Remover'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      </UiTable>
    </UiCard>

    <!-- Modal Form -->
    <UiModal v-model="showModal" :title="editingCampaign ? 'Editar Campanha' : 'Nova Campanha'" size="lg">
      <form @submit.prevent="saveCampaign" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-p-text-secondary">Nome da Campanha (Interno)</label>
          <input v-model="form.name" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: Campanha Facebook Março" required />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-p-text-secondary">Empreendimento</label>
          <select v-model="form.projectId" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none appearance-none" required>
            <option value="" disabled>Selecione um projeto</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">UTM Source</label>
            <input v-model="form.utmSource" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: facebook, google" required />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">UTM Medium</label>
            <input v-model="form.utmMedium" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: cpc, organic" />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-p-text-secondary">UTM Campaign</label>
          <input v-model="form.utmCampaign" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: lancamento_fase1" required />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">UTM Content</label>
            <input v-model="form.utmContent" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: anuncio_A" />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-p-text-secondary">UTM Term</label>
            <input v-model="form.utmTerm" type="text" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: palavra_chave" />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-p-text-secondary">Verba Mensal Estimada (Opcional)</label>
          <div class="flex items-center">
            <span class="pointer-events-none absolute pl-3 text-sm text-p-text-muted">R$</span>
            <input v-model.number="form.budget" type="number" step="0.01" class="w-full rounded-lg border border-p-border bg-p-raised py-2.5 pl-9 pr-3.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="0,00" />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="form.active" id="active-check" class="h-4 w-4" />
          <label for="active-check" class="text-sm font-medium text-p-text-secondary">Campanha Ativa</label>
        </div>

      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showModal = false">Cancelar</UiButton>
          <UiButton variant="primary" @click="saveCampaign">
            {{ editingCampaign ? 'Salvar Alterações' : 'Criar Campanha' }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
