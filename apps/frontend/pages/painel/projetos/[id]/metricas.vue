<template>
  <div class="flex flex-col gap-6">
    <UiLoadingState v-if="loading && !overview" text="Carregando relatório de mapa de calor..." />

    <div v-else-if="error && !overview" class="flex min-h-[55vh] flex-col items-center justify-center gap-3.5">
      <p class="text-p-text-secondary">{{ error }}</p>
      <UiButton variant="primary" @click="loadData">Tentar novamente</UiButton>
    </div>

    <template v-else>
      <NuxtLink :to="`/painel/projetos/${projectId}`" class="inline-flex items-center gap-2 text-sm font-medium text-p-text-muted transition-colors hover:text-p-accent">
        <i class="bi bi-arrow-left-short text-lg" aria-hidden="true"></i>
        <span>Voltar ao projeto</span>
      </NuxtLink>

      <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-[720px]">
          <p class="mb-2 text-xs font-bold uppercase tracking-widest text-p-accent">Métricas do projeto</p>
          <h1 class="text-2xl font-bold text-p-text">Relatório de mapa de calor</h1>
          <p class="mt-2 text-p-text-muted">Leitura espacial da planta com foco em interesse por lote, geração de leads e impacto no acesso do projeto.</p>
        </div>

        <div class="flex min-w-[min(100%,460px)] flex-wrap items-end gap-4 rounded-xl border border-p-border bg-p-elevated p-4">
          <div class="flex flex-col gap-1.5">
            <label for="startDate" class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Data inicial</label>
            <input id="startDate" v-model="startDate" type="date" :max="startDateMax" class="min-h-[42px] rounded-lg border border-p-border bg-p-base px-3.5 py-2.5 text-sm font-medium text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/15" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="endDate" class="text-xs font-bold uppercase tracking-wider text-p-text-muted">Data final</label>
            <input id="endDate" v-model="endDate" type="date" :min="endDateMin" :max="endDateMax" class="min-h-[42px] rounded-lg border border-p-border bg-p-base px-3.5 py-2.5 text-sm font-medium text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/15" />
          </div>
          <div class="flex min-h-[42px] flex-col justify-center gap-0.5 rounded-lg border border-p-accent/20 bg-p-accent-subtle px-3.5 py-2">
            <span class="text-xs text-p-text-muted">Período ativo</span>
            <strong class="text-sm text-p-text">{{ formattedPeriod }}</strong>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-6 transition-opacity" :class="{ 'opacity-70': loading }">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article v-for="card in summaryCards" :key="card.label" class="relative flex min-h-[154px] flex-col gap-3 overflow-hidden rounded-2xl border border-p-border bg-p-elevated p-5">
            <div class="absolute inset-x-0 top-0 h-[3px]" :class="card.tone === 'warning' ? 'bg-p-danger' : 'bg-p-accent'"></div>
            <span class="text-xs font-bold uppercase tracking-wider text-p-text-secondary">{{ card.label }}</span>
            <strong class="text-3xl font-bold leading-tight text-p-text">{{ card.value }}</strong>
            <p class="text-sm leading-relaxed text-p-text-muted">{{ card.hint }}</p>
          </article>
        </div>

        <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          <UiCard padding="lg" class="flex flex-col gap-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="mb-1 text-xs font-bold uppercase tracking-widest text-p-accent">Visualização principal</p>
                <h2 class="text-lg font-semibold text-p-text">Mapa do projeto</h2>
              </div>
              <span class="rounded-full border border-p-accent/20 bg-p-accent-subtle px-3.5 py-2 text-xs font-bold text-p-success">{{ formattedPeriod }}</span>
            </div>

            <ProjectHeatmapReport :report="heatmap" />
          </UiCard>

          <div class="flex flex-col gap-4">
            <UiCard padding="lg">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="mb-1 text-xs font-bold uppercase tracking-widest text-p-accent">Leitura do período</p>
                  <h2 class="text-lg font-semibold text-p-text">Destaques executivos</h2>
                </div>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-3.5">
                <div>
                  <span class="text-sm text-p-text-muted">Lote líder</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ topLotHeadline }}</strong>
                </div>
                <div>
                  <span class="text-sm text-p-text-muted">Participação do líder</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ topLotShare }}</strong>
                </div>
                <div>
                  <span class="text-sm text-p-text-muted">Conversão lote → lead</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ heatmap?.summary ? `${formatPercent(heatmap.summary.lotLeadConversionRate)}%` : '0,0%' }}</strong>
                </div>
                <div>
                  <span class="text-sm text-p-text-muted">Engajamento médio</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ averageSessionDuration }}</strong>
                </div>
              </div>
            </UiCard>

            <UiCard padding="lg">
              <p class="mb-1 text-xs font-bold uppercase tracking-widest text-p-accent">Navegação</p>
              <h2 class="text-lg font-semibold text-p-text">Páginas que puxaram tráfego</h2>
              <div v-if="topPaths.length" class="mt-4 flex flex-col gap-3">
                <div v-for="item in topPaths" :key="item.path || item.label" class="flex items-start justify-between gap-3.5 rounded-2xl bg-p-overlay/50 p-3">
                  <div>
                    <strong class="block text-sm text-p-text">{{ item.label || item.path }}</strong>
                    <span class="text-xs text-p-text-muted">{{ item.path }}</span>
                  </div>
                  <span class="text-sm text-p-text-muted">{{ formatNumber(item.count || 0) }}</span>
                </div>
              </div>
              <p v-else class="mt-4 text-sm text-p-text-muted">Sem páginas relevantes registradas no período.</p>
            </UiCard>

            <UiCard padding="lg">
              <p class="mb-1 text-xs font-bold uppercase tracking-widest text-p-accent">Origem da audiência</p>
              <h2 class="text-lg font-semibold text-p-text">Canais com mais volume</h2>
              <div v-if="topSources.length" class="mt-4 flex flex-col gap-3">
                <div v-for="item in topSources" :key="item.label" class="flex items-center justify-between gap-3.5 rounded-2xl bg-p-overlay/50 p-3">
                  <strong class="text-sm text-p-text">{{ item.label }}</strong>
                  <span class="text-sm text-p-text-muted">{{ formatNumber(item.count || 0) }}</span>
                </div>
              </div>
              <p v-else class="mt-4 text-sm text-p-text-muted">Nenhuma origem consolidada para o período.</p>
            </UiCard>

            <UiCard padding="lg">
              <p class="mb-1 text-xs font-bold uppercase tracking-widest text-p-accent">Busca guiada</p>
              <h2 class="text-lg font-semibold text-p-text">Intenção e origem das buscas</h2>
              <div class="mt-4 grid grid-cols-2 gap-3.5">
                <div>
                  <span class="text-sm text-p-text-muted">Total de buscas</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ formatNumber(searchSummary.totalSearches || 0) }}</strong>
                </div>
                <div>
                  <span class="text-sm text-p-text-muted">Modal após 7s</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ formatNumber(searchSummary.timedOnboardingSearches || 0) }}</strong>
                </div>
                <div>
                  <span class="text-sm text-p-text-muted">Busca por preferência</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ formatNumber(searchSummary.preferencePageSearches || 0) }}</strong>
                </div>
                <div>
                  <span class="text-sm text-p-text-muted">Média de resultados</span>
                  <strong class="mt-1 block text-sm text-p-text">{{ formatNumberDecimal(searchMetrics.avgResultsPerSearch || 0) }}</strong>
                </div>
              </div>

              <div v-if="searchIntents.length" class="mt-4 flex flex-col gap-3">
                <div v-for="item in searchIntents" :key="item.value" class="flex items-center justify-between gap-3.5 rounded-2xl bg-p-overlay/50 p-3">
                  <strong class="text-sm text-p-text">{{ item.label }}</strong>
                  <span class="text-sm text-p-text-muted">{{ formatNumber(item.count || 0) }}</span>
                </div>
              </div>
              <p v-else class="mt-4 text-sm text-p-text-muted">Nenhuma intenção de busca registrada no período.</p>

              <div v-if="searchSources.length" class="mt-4 flex flex-col gap-3">
                <div v-for="item in searchSources" :key="item.value" class="flex items-center justify-between gap-3.5 rounded-2xl bg-p-overlay/50 p-3">
                  <strong class="text-sm text-p-text">{{ item.label }}</strong>
                  <span class="text-sm text-p-text-muted">{{ formatNumber(item.count || 0) }}</span>
                </div>
              </div>
            </UiCard>

            <UiCard v-if="heatmap?.summary?.lotsWithoutHotspot" padding="lg" class="!border-p-danger/25">
              <p class="mb-1 text-xs font-bold uppercase tracking-widest text-p-danger">Cobertura incompleta</p>
              <h2 class="text-lg font-semibold text-p-text">Há atividade fora da planta</h2>
              <p class="mt-4 leading-relaxed text-p-text-muted">
                {{ heatmap.summary.lotsWithoutHotspot }} lote(s) tiveram atividade no período, mas ainda não estão refletidos como hotspot na planta. Isso reduz a leitura espacial do heatmap.
              </p>
            </UiCard>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import ProjectHeatmapReport from '~/components/painel/metrics/ProjectHeatmapReport.vue'

const route = useRoute()
const projectId = computed(() => route.params.id as string)

const { fetchApi } = useApi()
const {
  selectedProjectId,
  startDate,
  startDateMax,
  endDate,
  endDateMin,
  endDateMax,
} = useMetricsFilters()

const loading = ref(true)
const error = ref('')
const overview = ref<any>(null)
const heatmap = ref<any>(null)

watch(
  projectId,
  id => {
    if (id && selectedProjectId.value !== id) {
      selectedProjectId.value = id
    }
  },
  { immediate: true },
)

function buildProjectQueryString() {
  const params = new URLSearchParams({
    projectId: projectId.value,
    startDate: startDate.value || '',
    endDate: endDate.value || '',
  })

  return params.toString()
}

async function loadData() {
  if (!projectId.value) return

  loading.value = true
  error.value = ''

  try {
    const query = buildProjectQueryString()

    const [metricsRes, heatmapRes] = await Promise.all([
      fetchApi(`/tracking/metrics?${query}`),
      fetchApi(`/tracking/metrics/project-heatmap?${query}`),
    ])

    overview.value = metricsRes
    heatmap.value = heatmapRes
  } catch (err: any) {
    error.value = `Falha ao carregar o relatório. ${err?.message || ''}`.trim()
  } finally {
    loading.value = false
  }
}

watch([projectId, startDate, endDate], () => {
  loadData()
}, { immediate: true })

definePageMeta({
  layout: 'painel',
})

const summaryCards = computed(() => {
  const metricsSummary = overview.value?.summary || {}
  const heatmapSummary = heatmap.value?.summary || {}

  return [
    {
      label: 'Sessões do projeto',
      value: formatNumber(metricsSummary.totalSessions || 0),
      hint: 'Visitas reais abertas no período selecionado.',
      tone: 'accent'
    },
    {
      label: 'Visualizações gerais',
      value: formatNumber(metricsSummary.totalPageViews || 0),
      hint: 'Todas as páginas visitadas dentro do projeto.',
      tone: 'accent'
    },
    {
      label: 'Interações com lotes',
      value: formatNumber(heatmapSummary.totalLotViews || 0),
      hint: 'Eventos e acessos associados a lotes específicos.',
      tone: 'accent'
    },
    {
      label: 'Leads por lote',
      value: formatNumber(heatmapSummary.totalLotLeads || 0),
      hint: 'Leads originados em lotes mapeados.',
      tone: 'accent'
    },
    {
      label: 'Buscas guiadas',
      value: formatNumber(metricsSummary.totalSearches || 0),
      hint: 'Todas as buscas registradas no modal e na página de preferência.',
      tone: 'accent'
    },
    {
      label: 'Modal após 7s',
      value: formatNumber(metricsSummary.timedOnboardingSearches || 0),
      hint: 'Conversões do fluxo guiado que aparece no tempo de permanência.',
      tone: 'accent'
    },
    {
      label: 'Busca por preferência',
      value: formatNumber(metricsSummary.preferencePageSearches || 0),
      hint: 'Pesquisas disparadas na listagem de unidades com preferências.',
      tone: 'accent'
    },
    {
      label: 'Taxa de rejeição',
      value: `${formatPercent(overview.value?.engagement?.bounceRate || 0)}%`,
      hint: 'Sessões curtas sem aprofundamento relevante.',
      tone: 'warning'
    },
    {
      label: 'Páginas por sessão',
      value: (overview.value?.engagement?.avgPagesPerSession || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      hint: 'Profundidade média da navegação no projeto.',
      tone: 'accent'
    }
  ]
})

const topPaths = computed(() => overview.value?.topPaths?.slice(0, 5) || [])
const topSources = computed(() => overview.value?.topUtmSources?.slice(0, 5) || [])
const searchMetrics = computed(() => overview.value?.search || {})
const searchSummary = computed(() => overview.value?.summary || {})
const searchIntents = computed(() => searchMetrics.value?.intents?.slice(0, 5) || [])
const searchSources = computed(() => searchMetrics.value?.sources?.slice(0, 5) || [])
const topActiveLot = computed(() => heatmap.value?.lots?.find((lot: any) => lot.views || lot.leads || lot.reservations) || null)

const topLotHeadline = computed(() => {
  if (!topActiveLot.value) return 'Nenhum lote com atividade'
  return `${topActiveLot.value.code} · ${topActiveLot.value.name}`
})

const topLotShare = computed(() => {
  const lot = topActiveLot.value
  const totalViews = heatmap.value?.summary?.totalLotViews || 0

  if (!lot || totalViews <= 0) return '0,0% dos acessos de lote'

  return `${formatPercent((lot.views / totalViews) * 100)}% dos acessos de lote`
})

const averageSessionDuration = computed(() => {
  return formatDuration(overview.value?.engagement?.avgSessionDurationSec || 0)
})

const formattedPeriod = computed(() => {
  if (!startDate.value || !endDate.value) return 'Período aberto'
  return `${formatDate(startDate.value)} até ${formatDate(endDate.value)}`
})

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatNumberDecimal(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatPercent(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  if (!remainder) return `${minutes}m`
  return `${minutes}m ${remainder}s`
}
</script>
