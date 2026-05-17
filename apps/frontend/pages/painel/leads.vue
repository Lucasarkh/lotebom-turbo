<template>
  <div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-p-text md:text-2xl">Gestão de Leads</h1>
        <p class="mt-1 text-sm text-p-text-muted">{{ pageMode === 'prelaunch' ? 'Gerencie a fila por empreendimento e por lote sem perder a distribuição rotativa de corretores.' : 'Acompanhe o funil de vendas e gerencie interessados em tempo real.' }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="flex rounded-lg border border-p-border bg-p-elevated p-1">
          <button type="button" class="rounded-md px-4 py-2 text-sm font-semibold transition-all" :class="pageMode === 'leads' ? 'bg-p-overlay text-p-accent shadow-sm' : 'text-p-text-muted hover:text-p-text'" @click="pageMode = 'leads'">Leads</button>
          <button type="button" class="rounded-md px-4 py-2 text-sm font-semibold transition-all" :class="pageMode === 'prelaunch' ? 'bg-p-overlay text-p-accent shadow-sm' : 'text-p-text-muted hover:text-p-text'" @click="pageMode = 'prelaunch'">Pré-lançamento</button>
        </div>
        <div v-if="pageMode === 'leads'" class="flex rounded-lg border border-p-border bg-p-elevated p-1">
          <button type="button" class="rounded-md px-4 py-2 text-sm font-semibold transition-all" :class="viewMode === 'kanban' ? 'bg-p-overlay text-p-accent shadow-sm' : 'text-p-text-muted hover:text-p-text'" @click="viewMode = 'kanban'">Kanban</button>
          <button type="button" class="rounded-md px-4 py-2 text-sm font-semibold transition-all" :class="viewMode === 'table' ? 'bg-p-overlay text-p-accent shadow-sm' : 'text-p-text-muted hover:text-p-text'" @click="viewMode = 'table'">Tabela</button>
        </div>
        <UiButton v-if="pageMode === 'leads'" variant="primary" :disabled="!canWriteLeads" :title="!canWriteLeads ? writePermissionHint : undefined" @click="showCreateModal = true">+ Novo Lead</UiButton>
      </div>
    </div>

    <!-- Filters (leads mode) -->
    <div v-if="pageMode === 'leads'" class="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-p-border bg-p-elevated p-5">
      <div class="min-w-[200px] flex-1">
        <UiSelect v-model="filters.projectId" label="Projeto" @change="loadLeads(filters)">
          <option value="">Todos os projetos</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </UiSelect>
      </div>
      <div class="min-w-[200px] flex-1">
        <UiSelect v-model="filters.status" label="Status" @change="loadLeads(filters)">
          <option value="">Todos os status</option>
          <option value="NEW">Novo</option>
          <option value="CONTACTED">Contatado</option>
          <option value="QUALIFIED">Qualificado</option>
          <option value="NEGOTIATING">Negociando</option>
          <option value="RESERVATION">Reserva solicitada</option>
          <option value="WON">Convertido</option>
          <option value="LOST">Perdido</option>
          <option value="ABANDONED">Abandonou Checkout</option>
        </UiSelect>
      </div>
      <div class="min-w-[200px] flex-[2]">
        <UiInput v-model="filters.search" label="Buscar nome ou e-mail" placeholder="Pesquisar..." @keyup.enter="loadLeads(filters)" />
      </div>
      <UiButton variant="secondary" size="sm" @click="resetFilters">Limpar</UiButton>
    </div>

    <!-- Pre-launch mode -->
    <div v-else class="mt-6 space-y-6">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <UiCard padding="md">
          <span class="block text-xs font-bold uppercase tracking-wider text-p-text-muted">Na fila</span>
          <strong class="mt-2 block text-2xl font-bold text-p-text">{{ preLaunchQueueSummary.active }}</strong>
        </UiCard>
        <UiCard padding="md">
          <span class="block text-xs font-bold uppercase tracking-wider text-p-text-muted">Contatados</span>
          <strong class="mt-2 block text-2xl font-bold text-p-text">{{ preLaunchQueueSummary.contacted }}</strong>
        </UiCard>
        <UiCard padding="md">
          <span class="block text-xs font-bold uppercase tracking-wider text-p-text-muted">Convertidos</span>
          <strong class="mt-2 block text-2xl font-bold text-p-text">{{ preLaunchQueueSummary.converted }}</strong>
        </UiCard>
        <UiCard padding="md">
          <span class="block text-xs font-bold uppercase tracking-wider text-p-text-muted">Removidos</span>
          <strong class="mt-2 block text-2xl font-bold text-p-text">{{ preLaunchQueueSummary.removed }}</strong>
        </UiCard>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UiCard>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold text-p-text">Empreendimentos na fila</h2>
            <span class="text-sm text-p-text-muted">{{ preLaunchProjectBuckets.length }}</span>
          </div>
          <div v-if="preLaunchProjectBuckets.length" class="flex flex-wrap gap-2">
            <button v-for="bucket in preLaunchProjectBuckets" :key="bucket.projectId" type="button" class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all" :class="queueFilters.projectId === bucket.projectId ? 'border-amber-400/45 bg-amber-400/12 text-amber-300' : 'border-p-border bg-p-overlay/50 text-p-text-secondary hover:border-p-border-hover'" @click="applyProjectBucket(bucket.projectId)">
              <span>{{ bucket.projectName }}</span>
              <strong class="text-xs">{{ bucket.total }}</strong>
            </button>
          </div>
          <p v-else class="text-sm text-p-text-muted">Nenhum empreendimento com fila ativa no momento.</p>
        </UiCard>

        <UiCard>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold text-p-text">Lotes com fila</h2>
            <span class="text-sm text-p-text-muted">{{ filteredLotBuckets.length }}</span>
          </div>
          <div v-if="filteredLotBuckets.length" class="flex flex-wrap gap-2">
            <button v-for="bucket in filteredLotBuckets" :key="bucket.mapElementId" type="button" class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all" :class="queueFilters.mapElementId === bucket.mapElementId ? 'border-amber-400/45 bg-amber-400/12 text-amber-300' : 'border-p-border bg-p-overlay/50 text-p-text-secondary hover:border-p-border-hover'" @click="applyLotBucket(bucket.mapElementId, bucket.projectId)">
              <span>{{ bucket.lotCode }}</span>
              <strong class="text-xs">{{ bucket.total }}</strong>
            </button>
          </div>
          <p v-else class="text-sm text-p-text-muted">Selecione um empreendimento ou aguarde novos interessados na fila.</p>
        </UiCard>
      </div>

      <!-- Pre-launch filters -->
      <div class="flex flex-wrap items-end gap-4 rounded-xl border border-p-border bg-p-elevated p-5">
        <div class="min-w-[200px] flex-1">
          <UiSelect v-model="queueFilters.projectId" label="Empreendimento" @change="onQueueProjectChange">
            <option value="">Todos os empreendimentos</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </UiSelect>
        </div>
        <div class="min-w-[200px] flex-1">
          <UiSelect v-model="queueFilters.mapElementId" label="Lote" @change="loadPreLaunchQueue(queueFilters)">
            <option value="">Todos os lotes</option>
            <option v-for="bucket in filteredLotBuckets" :key="bucket.mapElementId" :value="bucket.mapElementId">{{ bucket.lotCode }}</option>
          </UiSelect>
        </div>
        <div class="min-w-[200px] flex-1">
          <UiSelect v-model="queueFilters.status" label="Status da fila" @change="loadPreLaunchQueue(queueFilters)">
            <option value="">Todos</option>
            <option value="ACTIVE">Na fila</option>
            <option value="CONTACTED">Contatado</option>
            <option value="CONVERTED">Convertido</option>
            <option value="REMOVED">Removido</option>
          </UiSelect>
        </div>
        <div class="min-w-[200px] flex-[2]">
          <UiInput v-model="queueFilters.search" label="Buscar lead, corretor, lote ou e-mail" placeholder="Pesquisar..." @keyup.enter="loadPreLaunchQueue(queueFilters)" />
        </div>
        <UiButton variant="secondary" size="sm" @click="resetQueueFilters">Limpar</UiButton>
      </div>
    </div>

    <!-- Count bar -->
    <div v-if="pageMode === 'leads' && meta.totalItems > 0" class="mt-4 flex items-center gap-2 text-sm text-p-text-muted">
      <span>{{ meta.totalItems }} lead{{ meta.totalItems !== 1 ? 's' : '' }} encontrado{{ meta.totalItems !== 1 ? 's' : '' }}</span>
      <span v-if="meta.totalPages > 1">— página {{ meta.currentPage }} de {{ meta.totalPages }}</span>
    </div>
    <div v-else-if="pageMode === 'prelaunch' && preLaunchQueueMeta.totalItems > 0" class="mt-4 flex items-center gap-2 text-sm text-p-text-muted">
      <span>{{ preLaunchQueueMeta.totalItems }} registro{{ preLaunchQueueMeta.totalItems !== 1 ? 's' : '' }} na fila</span>
      <span v-if="preLaunchQueueMeta.totalPages > 1">— página {{ preLaunchQueueMeta.currentPage }} de {{ preLaunchQueueMeta.totalPages }}</span>
    </div>

    <!-- Loading -->
    <UiLoadingState v-if="pageMode === 'leads' && loading" />
    <UiLoadingState v-else-if="pageMode === 'prelaunch' && queueLoading" />

    <!-- Empty states -->
    <UiEmptyState v-else-if="pageMode === 'leads' && leads.length === 0" title="Nenhum lead encontrado" description="Ajuste os filtros ou cadastre um novo lead manual." icon="📥" />
    <UiEmptyState v-else-if="pageMode === 'prelaunch' && preLaunchQueue.length === 0" title="Nenhum interessado na fila" description="Quando o pré-lançamento captar novos interessados, a gestão por empreendimento e lote aparecerá aqui." icon="⏳" />

    <!-- Leads content -->
    <div v-else-if="pageMode === 'leads'" class="mt-4">
      <LeadsLeadKanban v-if="viewMode === 'kanban'" :leads="leads" @select="viewLead" />

      <div v-else>
        <UiTable>
          <template #head>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Nome</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Contato</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Projeto</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Corretor</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
          </template>
          <tr v-for="lead in leads" :key="lead.id" class="cursor-pointer transition-colors hover:bg-p-overlay/50" @click="viewLead(lead)">
            <td class="px-4 py-3">
              <div class="flex flex-col">
                <strong class="text-sm text-p-text">{{ lead.name }}</strong>
                <span v-if="lead.isRecurrent" class="mt-0.5 w-fit rounded bg-p-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-p-warning">Recorrente</span>
                <span v-if="lead.aiChatTranscript" class="mt-0.5 w-fit rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400">IA</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-col gap-0.5 text-sm text-p-text-secondary">
                <span>{{ lead.email || '—' }}</span>
                <span>{{ lead.phone || '—' }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ lead.project?.name || '—' }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ lead.realtorLink?.name || 'Direto' }}</td>
            <td class="px-4 py-3"><LeadsLeadStatusBadge :status="lead.status" /></td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDateToBrasilia(lead.createdAt) }}</td>
            <td class="px-4 py-3" @click.stop>
              <div class="flex gap-1">
                <button class="rounded-md p-1.5 text-p-text-muted transition-colors hover:bg-p-overlay hover:text-p-text" :disabled="!canWriteLeads" :title="!canWriteLeads ? writePermissionHint : 'Editar'" @click="editLead(lead)"><i class="bi bi-pencil-fill" aria-hidden="true"></i></button>
                <button class="rounded-md p-1.5 text-p-text-muted transition-colors hover:bg-p-overlay hover:text-p-danger" :disabled="!canWriteLeads" :title="!canWriteLeads ? writePermissionHint : 'Excluir'" @click="onDeleteLead(lead)"><i class="bi bi-trash3-fill" aria-hidden="true"></i></button>
              </div>
            </td>
          </tr>
        </UiTable>
        <div class="mt-4">
          <CommonPagination :meta="meta" @change="loadLeads(filters, $event)" />
        </div>
      </div>
    </div>

    <!-- Pre-launch queue table -->
    <div v-else class="mt-4">
      <UiTable>
        <template #head>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Posição</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Lead</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Empreendimento</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Lote</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Corretor</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Entrada</th>
          <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Ações</th>
        </template>
        <tr v-for="entry in preLaunchQueue" :key="entry.id" class="cursor-pointer transition-colors hover:bg-p-overlay/50" @click="viewQueueLead(entry)">
          <td class="px-4 py-3">
            <span class="inline-flex items-center justify-center rounded-full bg-amber-400/14 px-2.5 py-1 text-sm font-bold text-amber-300">#{{ entry.position }}</span>
          </td>
          <td class="px-4 py-3">
            <div class="flex flex-col">
              <strong class="text-sm text-p-text">{{ entry.lead?.name || 'Lead sem nome' }}</strong>
              <span class="text-sm text-p-text-muted">{{ entry.lead?.email || entry.lead?.phone || 'Sem contato' }}</span>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ entry.project?.name || '—' }}</td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ entry.mapElement?.code || entry.mapElement?.name || '—' }}</td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ entry.realtorLink?.name || 'Direto' }}</td>
          <td class="px-4 py-3">
            <UiBadge :variant="{ active: 'info', contacted: 'warning', converted: 'success', removed: 'danger' }[String(entry.status || '').toLowerCase()] || 'neutral'">
              {{ queueStatusLabel(entry.status) }}
            </UiBadge>
          </td>
          <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDateToBrasilia(entry.createdAt) }}</td>
          <td class="px-4 py-3" @click.stop>
            <div class="flex flex-wrap gap-1.5">
              <UiButton variant="secondary" size="xs" :disabled="!canWriteLeads || entry.status === 'CONTACTED'" @click="changeQueueStatus(entry, 'CONTACTED')">Contatado</UiButton>
              <UiButton variant="primary" size="xs" :disabled="!canWriteLeads || entry.status === 'CONVERTED'" @click="changeQueueStatus(entry, 'CONVERTED')">Converter</UiButton>
              <UiButton variant="danger" size="xs" :disabled="!canWriteLeads || entry.status === 'REMOVED'" @click="changeQueueStatus(entry, 'REMOVED')">Remover</UiButton>
            </div>
          </td>
        </tr>
      </UiTable>
      <div class="mt-4">
        <CommonPagination :meta="preLaunchQueueMeta" @change="loadPreLaunchQueue(queueFilters, $event)" />
      </div>
    </div>

    <!-- Modals -->
    <LeadsLeadFormModal
      v-if="showCreateModal"
      :projects="projects"
      @close="showCreateModal = false"
      @saved="loadLeads(filters)"
    />

    <LeadsLeadFormModal
      v-if="showEditModal"
      :lead="editingLead"
      :projects="projects"
      @close="showEditModal = false"
      @saved="loadLeads(filters)"
    />

    <LeadsLeadDetailsModal
      v-if="selectedLead"
      :lead="selectedLead"
      @close="selectedLead = undefined"
      @refresh="onDetailsRefresh"
      @edit="onDetailsEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

definePageMeta({ layout: 'painel' })

type LeadRecord = Record<string, any> & {
  id?: string
  name?: string
}

type PreLaunchQueueRecord = Record<string, any> & {
  id?: string
}

const {
  leads,
  loading,
  queueLoading,
  meta,
  projects,
  preLaunchQueue,
  preLaunchQueueMeta,
  preLaunchQueueSummary,
  preLaunchProjectBuckets,
  preLaunchLotBuckets,
  loadLeads,
  loadProjects,
  loadPreLaunchQueue,
  getLead,
  updatePreLaunchQueueEntry,
} = useLeads()
const authStore = useAuthStore()
const { fromError, success: toastSuccess } = useToast()
const route = useRoute()
const router = useRouter()
const canWriteLeads = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canWriteFeature('leads')
  }
  return true
})
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'

const pageMode = ref(route.query.view === 'prelaunch' ? 'prelaunch' : 'leads')
const viewMode = ref('kanban')

onMounted(() => {
  const savedView = localStorage.getItem('lotio_leads_view_mode')
  if (savedView) {
    viewMode.value = savedView
  }
})

watch(viewMode, (newVal) => {
  localStorage.setItem('lotio_leads_view_mode', newVal)
})

const filters = ref({ projectId: '', status: '', search: '', realtorLinkId: '' })
const queueFilters = ref({ projectId: '', mapElementId: '', status: 'ACTIVE', search: '' })
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingLead = ref<LeadRecord | undefined>(undefined)
const selectedLead = ref<LeadRecord | undefined>(undefined)
const filteredLotBuckets = computed(() => {
  if (!queueFilters.value.projectId) return preLaunchLotBuckets.value
  return preLaunchLotBuckets.value.filter(bucket => bucket.projectId === queueFilters.value.projectId)
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => filters.value.search, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadLeads(filters.value), 400)
})

let queueSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => queueFilters.value.search, () => {
  if (queueSearchTimer) clearTimeout(queueSearchTimer)
  queueSearchTimer = setTimeout(() => {
    if (pageMode.value === 'prelaunch') loadPreLaunchQueue(queueFilters.value)
  }, 400)
})

watch(pageMode, async (newVal) => {
  await router.replace({
    query: {
      ...route.query,
      view: newVal === 'prelaunch' ? 'prelaunch' : undefined,
    },
  })

  if (newVal === 'prelaunch') {
    await loadPreLaunchQueue(queueFilters.value)
    return
  }

  await loadLeads(filters.value)
})

watch(() => route.query.view, (view) => {
  const nextMode = view === 'prelaunch' ? 'prelaunch' : 'leads'
  if (pageMode.value !== nextMode) {
    pageMode.value = nextMode
  }
})

const resetFilters = () => {
  filters.value = { projectId: '', status: '', search: '', realtorLinkId: '' }
  loadLeads()
}

const resetQueueFilters = () => {
  queueFilters.value = { projectId: '', mapElementId: '', status: 'ACTIVE', search: '' }
  loadPreLaunchQueue(queueFilters.value)
}

const onQueueProjectChange = () => {
  queueFilters.value.mapElementId = ''
  loadPreLaunchQueue(queueFilters.value)
}

const applyProjectBucket = (projectId: string) => {
  queueFilters.value.projectId = queueFilters.value.projectId === projectId ? '' : projectId
  queueFilters.value.mapElementId = ''
  loadPreLaunchQueue(queueFilters.value)
}

const applyLotBucket = (mapElementId: string, projectId?: string) => {
  queueFilters.value.projectId = projectId || queueFilters.value.projectId
  queueFilters.value.mapElementId = queueFilters.value.mapElementId === mapElementId ? '' : mapElementId
  loadPreLaunchQueue(queueFilters.value)
}

const viewLead = async (lead: LeadRecord) => {
  if (!lead.id) return
  const fullLead = await getLead(lead.id)
  selectedLead.value = fullLead
}

const viewQueueLead = async (entry: PreLaunchQueueRecord) => {
  if (!entry.lead?.id) return
  const fullLead = await getLead(entry.lead.id)
  selectedLead.value = fullLead
}

const editLead = (lead: LeadRecord) => {
  if (!canWriteLeads.value) return
  editingLead.value = lead
  showEditModal.value = true
}

const onDetailsEdit = (lead: LeadRecord) => {
  selectedLead.value = undefined
  editLead(lead)
}

const onDetailsRefresh = async () => {
  if (selectedLead.value?.id) {
    selectedLead.value = await getLead(selectedLead.value.id)
  }
  await loadLeads(filters.value)
}

const onDeleteLead = async (lead: LeadRecord) => {
  if (!canWriteLeads.value) return
  if (!lead.id) return
  if (!confirm(`Deseja realmente excluir o lead ${lead.name}?`)) return
  try {
    const { fetchApi } = useApi()
    await fetchApi(`/leads/${lead.id}`, { method: 'DELETE' })
    toastSuccess('Lead excluído')
    await loadLeads(filters.value)
  } catch (e) {
    fromError(e, 'Erro ao excluir lead')
  }
}

const queueStatusLabel = (status?: string) => ({
  ACTIVE: 'Na fila',
  CONTACTED: 'Contatado',
  CONVERTED: 'Convertido',
  REMOVED: 'Removido',
}[status || ''] || status || '—')

const changeQueueStatus = async (entry: PreLaunchQueueRecord, status: 'CONTACTED' | 'CONVERTED' | 'REMOVED') => {
  if (!canWriteLeads.value || !entry.id) return

  const notes = window.prompt(`Observação opcional para ${queueStatusLabel(status).toLowerCase()}:`, entry.notes || '')
  if (notes === null) return

  await updatePreLaunchQueueEntry(entry.id, {
    status,
    notes: notes.trim() || undefined,
  })
  await loadPreLaunchQueue(queueFilters.value, preLaunchQueueMeta.value.currentPage)
}

onMounted(async () => {
  if (route.query.realtorLinkId) {
    filters.value.realtorLinkId = route.query.realtorLinkId as string
  }
  await loadProjects()
  if (pageMode.value === 'prelaunch') {
    await loadPreLaunchQueue(queueFilters.value)
    return
  }
  await loadLeads(filters.value)
})
</script>
