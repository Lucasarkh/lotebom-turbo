<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const audience = ref<any>(null)
const loading = ref(false)
const page = ref(Number(route.query.page || 1))
const limit = 25

const visibleResultsLabel = computed(() => {
  if (!data.value?.pagination?.total || !data.value?.items?.length) return null
  const start = (data.value.pagination.page - 1) * data.value.pagination.limit + 1
  const end = start + data.value.items.length - 1
  return `Mostrando ${start}-${end} de ${data.value.pagination.total} visitantes`
})

async function fetchVisitors() {
  loading.value = true
  try {
    const [visitorsRes, audienceRes] = await Promise.all([
      fetchApi(`/tracking/report/visitors?${buildQueryString()}&page=${page.value}&limit=${limit}`),
      fetchApi(`/tracking/metrics/audience?${buildQueryString()}`)
    ])
    data.value = visitorsRes
    audience.value = audienceRes
  } catch {
    toast.error('Erro ao carregar visitantes')
  } finally {
    loading.value = false
  }
}

function syncPageQuery() {
  router.replace({
    query: {
      ...route.query,
      page: String(page.value)
    }
  })
}

function previousPage() {
  if (page.value <= 1) return
  page.value -= 1
}

function nextPage() {
  if (!data.value?.pagination?.totalPages || page.value >= data.value.pagination.totalPages) return
  page.value += 1
}

function openVisitor(visitorId: string) {
  router.push({
    path: `/painel/metricas/visitantes/${visitorId}`,
    query: {
      ...route.query
    }
  })
}

function formatDateTime(value?: string) {
  if (!value) return '---'
  return new Date(value).toLocaleString('pt-BR')
}

watch([selectedProjectId, startDate, endDate], () => {
  page.value = 1
  fetchVisitors()
})

watch(page, () => {
  syncPageQuery()
  fetchVisitors()
})

onMounted(async () => {
  await fetchProjects()
  syncPageQuery()
  fetchVisitors()
})

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div class="space-y-6">
    <NuxtLink to="/painel/metricas" class="inline-flex items-center gap-2 text-sm font-medium text-p-text-muted hover:text-p-accent transition-colors">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-p-text">Explorador de Visitantes</h1>
        <p class="mt-1 text-sm text-p-text-muted">Recorrência, origem, engajamento e histórico consolidado por visitante</p>
      </div>

      <div class="flex flex-wrap items-end gap-4 rounded-xl border border-p-border bg-p-elevated p-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Início:</label>
          <input v-model="startDate" type="date" :max="startDateMax" class="rounded-lg border border-p-border bg-p-raised px-3 py-2.5 text-sm text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Fim:</label>
          <input v-model="endDate" type="date" :min="endDateMin" :max="endDateMax" class="rounded-lg border border-p-border bg-p-raised px-3 py-2.5 text-sm text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Empreendimento:</label>
          <select v-model="selectedProjectId" class="rounded-lg border border-p-border bg-p-raised px-3 py-2.5 text-sm text-p-text appearance-none focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30">
            <option value="all">Todos os Projetos</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <UiLoadingState v-if="loading && !data" text="Carregando visitantes..." />

    <div v-else-if="data && audience" class="space-y-6" :class="{ 'opacity-60': loading }">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard padding="md">
          <CommonAppTooltip text="Total de visitantes únicos identificados no período filtrado." position="bottom"><span class="text-xs text-p-text-muted">Visitantes</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-blue-400">{{ audience.summary.totalVisitors }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Visitantes que tiveram mais de uma sessão no período e portanto retornaram ao site." position="bottom"><span class="text-xs text-p-text-muted">Retornantes</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-cyan-400">{{ audience.summary.returningVisitors }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Média de sessões por visitante dentro do período filtrado." position="bottom"><span class="text-xs text-p-text-muted">Visitas por visitante</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-indigo-400">{{ audience.summary.avgVisitsPerVisitor }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Percentual de visitantes que geraram pelo menos um lead no período." position="bottom"><span class="text-xs text-p-text-muted">Taxa visitante -> lead</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-emerald-400">{{ audience.summary.leadRate }}%</span>
        </UiCard>
      </div>

      <UiCard padding="md">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 class="text-base font-semibold text-p-text">Visitantes Recentes</h3>
            <p v-if="visibleResultsLabel" class="mt-1 text-[13px] text-p-text-muted">{{ visibleResultsLabel }}</p>
            <p v-else class="mt-1 text-[13px] text-p-text-muted">Período sem visitantes encontrados.</p>
          </div>
          <div v-if="data.pagination.totalPages > 1" class="flex gap-2">
            <UiButton variant="secondary" size="sm" :disabled="page <= 1" @click="previousPage">Anterior</UiButton>
            <UiButton variant="secondary" size="sm" :disabled="page >= data.pagination.totalPages" @click="nextPage">Próxima</UiButton>
          </div>
        </div>

        <UiEmptyState v-if="!data.items?.length" title="Nenhum visitante encontrado no período." />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-p-border">
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Identificador do visitante persistente e o dispositivo predominante registrado." position="bottom">Visitante</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Projeto e corretor mais recentes associados a esse visitante." position="bottom">Projeto</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Origem e campanha atribuídas ao visitante." position="bottom">Origem</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Número de sessões atribuídas ao visitante no período." position="bottom">Sessões</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Soma das visualizações de páginas de todas as sessões do visitante." position="bottom">Páginas</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Soma das interações com lotes em todas as sessões do visitante." position="bottom">Lotes</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Total de leads atribuídos ao visitante." position="bottom">Leads</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Atalho para a sessão mais recente do visitante." position="bottom">Última sessão</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Primeiro e último momento em que o visitante foi visto no período." position="bottom">Última atividade</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-p-border">
              <tr
                v-for="visitor in data.items"
                :key="visitor.id"
                class="cursor-pointer hover:bg-p-overlay/50 focus-visible:bg-p-overlay/50 focus-visible:outline-none"
                tabindex="0"
                @click="openVisitor(visitor.id)"
                @keydown.enter.prevent="openVisitor(visitor.id)"
                @keydown.space.prevent="openVisitor(visitor.id)"
              >
                <td class="px-3 py-3.5 align-top">
                  <span class="font-bold text-p-accent">{{ visitor.id.slice(-8) }}</span>
                  <span class="block text-xs text-p-text-muted">{{ visitor.deviceType || '---' }}</span>
                </td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ visitor.projectName || '---' }}</div>
                  <span class="text-xs text-p-text-muted">{{ visitor.realtorName || 'Sem corretor' }}</span>
                </td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ visitor.utmSource || '(Direto)' }}</div>
                  <span class="text-xs text-p-text-muted">{{ visitor.utmCampaign || '(Nenhuma)' }}</span>
                </td>
                <td class="px-3 py-3.5 align-top text-p-text-secondary">{{ visitor.sessions }}</td>
                <td class="px-3 py-3.5 align-top text-p-text-secondary">{{ visitor.pageViews }}</td>
                <td class="px-3 py-3.5 align-top text-p-text-secondary">{{ visitor.lotInteractions }}</td>
                <td class="px-3 py-3.5 align-top text-p-text-secondary">{{ visitor.leads }}</td>
                <td class="px-3 py-3.5 align-top">
                  <NuxtLink v-if="visitor.lastSessionId" :to="{ path: `/painel/metricas/sessoes/${visitor.lastSessionId}`, query: { ...route.query } }" class="font-bold text-p-accent" @click.stop>
                    {{ visitor.lastSessionId.slice(-8) }}
                  </NuxtLink>
                  <span v-else>---</span>
                </td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ formatDateTime(visitor.lastSeenAt) }}</div>
                  <span class="text-xs text-p-text-muted">Entrada: {{ formatDateTime(visitor.firstSeenAt) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </div>
  </div>
</template>
