<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)
const page = ref(Number(route.query.page || 1))
const limit = 25

const visibleResultsLabel = computed(() => {
  if (!data.value?.pagination?.total || !data.value?.items?.length) return null
  const start = (data.value.pagination.page - 1) * data.value.pagination.limit + 1
  const end = start + data.value.items.length - 1
  return `Mostrando ${start}-${end} de ${data.value.pagination.total} sessões`
})

async function fetchSessions() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/report/sessions?${buildQueryString()}&page=${page.value}&limit=${limit}`)
  } catch {
    toast.error('Erro ao carregar sessões')
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

function openSession(sessionId: string) {
  router.push({
    path: `/painel/metricas/sessoes/${sessionId}`,
    query: {
      ...route.query
    }
  })
}

function formatDateTime(value?: string) {
  if (!value) return '---'
  return new Date(value).toLocaleString('pt-BR')
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (!remainingSeconds) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

watch([selectedProjectId, startDate, endDate], () => {
  page.value = 1
  fetchSessions()
})

watch(page, () => {
  syncPageQuery()
  fetchSessions()
})

onMounted(async () => {
  await fetchProjects()
  syncPageQuery()
  fetchSessions()
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
        <h1 class="text-2xl font-extrabold text-p-text">Explorador de Sessões</h1>
        <p class="mt-1 text-sm text-p-text-muted">Entenda cada visita: origem, engajamento, lotes acessados e leads gerados</p>
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

    <UiLoadingState v-if="loading && !data" text="Carregando sessões..." />

    <div v-else-if="data" class="space-y-6" :class="{ 'opacity-60': loading }">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard padding="md">
          <CommonAppTooltip text="Quantidade total de sessões reais registradas no período filtrado." position="bottom"><span class="text-xs text-p-text-muted">Sessões no período</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-blue-400">{{ data.summary.totalSessions }}</span>
        </UiCard>
      </div>

      <UiCard padding="md">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 class="text-base font-semibold text-p-text">Sessões Recentes</h3>
            <p v-if="visibleResultsLabel" class="mt-1 text-[13px] text-p-text-muted">{{ visibleResultsLabel }}</p>
            <p v-else class="mt-1 text-[13px] text-p-text-muted">Período sem sessões encontradas.</p>
          </div>
          <div v-if="data.pagination.totalPages > 1" class="flex gap-2">
            <UiButton variant="secondary" size="sm" :disabled="page <= 1" @click="previousPage">Anterior</UiButton>
            <UiButton variant="secondary" size="sm" :disabled="page >= data.pagination.totalPages" @click="nextPage">Próxima</UiButton>
          </div>
        </div>

        <UiEmptyState v-if="!data.items?.length" title="Nenhuma sessão encontrada no período." />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-p-border">
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Identificador da sessão individual. Cada linha representa uma visita distinta." position="bottom">Sessão</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Visitante persistente associado à sessão, permitindo ver recorrência entre visitas." position="bottom">Visitante</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Projeto e corretor atribuídos à sessão filtrada." position="bottom">Projeto</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Origem e campanha atribuídas à visita no momento da sessão." position="bottom">Origem</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Total de page views registrados dentro da sessão." position="bottom">Páginas</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Total de interações relacionadas a lotes durante a sessão." position="bottom">Lotes</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Quantidade de leads gerados dentro da sessão." position="bottom">Leads</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Tempo observado entre o primeiro e o último sinal real de atividade da sessão. A visita não continua contando indefinidamente quando o usuário some por muito tempo." position="bottom">Duração</CommonAppTooltip></th>
                <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Início da sessão e último momento em que houve atividade efetiva registrada com a sessão ainda válida." position="bottom">Última atividade</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-p-border">
              <tr
                v-for="session in data.items"
                :key="session.id"
                class="cursor-pointer hover:bg-p-overlay/50 focus-visible:bg-p-overlay/50 focus-visible:outline-none"
                tabindex="0"
                @click="openSession(session.id)"
                @keydown.enter.prevent="openSession(session.id)"
                @keydown.space.prevent="openSession(session.id)"
              >
                <td class="px-3 py-3.5 align-top">
                  <span class="font-bold text-p-accent">{{ session.id.slice(-8) }}</span>
                  <span class="block text-xs text-p-text-muted">{{ session.deviceType || '---' }}</span>
                </td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ session.visitorId ? session.visitorId.slice(-8) : '---' }}</div>
                  <span class="text-xs text-p-text-muted">{{ session.visitorSessions || 1 }} visita(s)</span>
                </td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ session.projectName || '---' }}</div>
                  <span class="text-xs text-p-text-muted">{{ session.realtorName || 'Sem corretor' }}</span>
                </td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ session.utmSource || '(Direto)' }}</div>
                  <span class="text-xs text-p-text-muted">{{ session.utmCampaign || '(Nenhuma)' }}</span>
                </td>
                <td class="px-3 py-3.5 align-top text-p-text-secondary">{{ session.pageViews }}</td>
                <td class="px-3 py-3.5 align-top text-p-text-secondary">{{ session.lotInteractions }}</td>
                <td class="px-3 py-3.5 align-top text-p-text-secondary">{{ session.totalLeads }}</td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ formatDuration(session.durationSec) }}</div>
                  <span class="text-xs text-p-text-muted">{{ session.isBounce ? 'Bounce' : 'Engajada' }}</span>
                </td>
                <td class="px-3 py-3.5 align-top">
                  <div>{{ formatDateTime(session.lastSeenAt) }}</div>
                  <span class="text-xs text-p-text-muted">Entrada: {{ formatDateTime(session.firstSeenAt) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </div>
  </div>
</template>
