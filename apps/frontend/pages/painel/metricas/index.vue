<script setup lang="ts">
import ProjectHeatmapReport from '~/components/painel/metrics/ProjectHeatmapReport.vue'

const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const metrics = ref<any>(null)
const brokerMetrics = ref<any>(null)
const audienceMetrics = ref<any>(null)
const projectHeatmap = ref<any>(null)
const loadingMetrics = ref(false)

const hasSpecificProjectSelected = computed(() => selectedProjectId.value && selectedProjectId.value !== 'all')
const selectedProject = computed(() => projects.value.find((project: any) => project.id === selectedProjectId.value) || null)
const canAggregateAllProjects = computed(() => projects.value.length !== 1)

async function fetchMetrics() {
  loadingMetrics.value = true
  try {
    const [metricsRes, brokersRes, audienceRes, heatmapRes] = await Promise.all([
      fetchApi(`/tracking/metrics?${buildQueryString()}`),
      fetchApi(`/tracking/metrics/brokers?${buildQueryString()}`),
      fetchApi(`/tracking/metrics/audience?${buildQueryString()}`),
      hasSpecificProjectSelected.value
        ? fetchApi(`/tracking/metrics/project-heatmap?${buildQueryString()}`)
        : Promise.resolve(null)
    ])
    metrics.value = metricsRes
    brokerMetrics.value = brokersRes
    audienceMetrics.value = audienceRes
    projectHeatmap.value = heatmapRes
  } catch {
    toast.error('Erro ao carregar métricas')
  } finally {
    loadingMetrics.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchMetrics()
})

definePageMeta({
  layout: 'painel'
})

const maxHistoryValue = computed(() => {
  if (!metrics.value?.history?.length) return 1
  const max = Math.max(...metrics.value.history.map((h: any) => Math.max(h.sessions || 0, h.views || 0)))
  return max > 0 ? max : 1
})

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

const pagesPerSession = computed(() => {
  if (!metrics.value?.summary?.totalSessions) return '0'
  return (metrics.value.summary.totalPageViews / metrics.value.summary.totalSessions).toFixed(1)
})

const conversionRate = computed(() => {
  if (!metrics.value?.summary?.totalSessions) return '0'
  return ((metrics.value.summary.totalLeads / metrics.value.summary.totalSessions) * 100).toFixed(1)
})

const formatDuration = (seconds: number) => {
  if (!seconds || seconds < 1) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

const avgSessionDuration = computed(() => {
  return formatDuration(metrics.value?.engagement?.avgSessionDurationSec || 0)
})

const searchMetrics = computed(() => metrics.value?.search || null)
const searchSummary = computed(() => metrics.value?.summary || {})
const searchIntentRows = computed(() => searchMetrics.value?.intents?.slice(0, 5) || [])
const searchSourceRows = computed(() => searchMetrics.value?.sources?.slice(0, 5) || [])
const averageSearchResults = computed(() => {
  const value = searchMetrics.value?.avgResultsPerSearch || 0
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
})

const bounceRate = computed(() => {
  return metrics.value?.engagement?.bounceRate?.toFixed(1) || '0'
})

const returningRate = computed(() => {
  if (!audienceMetrics.value?.summary?.totalVisitors) return '0'
  return ((audienceMetrics.value.summary.returningVisitors / audienceMetrics.value.summary.totalVisitors) * 100).toFixed(1)
})

const selectedProjectHeatmapTitle = computed(() => {
  if (!selectedProject.value) return 'Mapa de calor por projeto'
  return `Mapa de calor · ${selectedProject.value.name}`
})

const topicCards = computed(() => [
  {
    title: 'Explorador de Sessões',
    subtitle: 'Jornada por visita, páginas, lotes e leads da sessão',
    route: '/painel/metricas/sessoes',
    icon: 'pulse',
    color: 'cyan',
    highlight: audienceMetrics.value?.summary?.avgVisitsPerVisitor !== undefined
      ? `${audienceMetrics.value.summary.avgVisitsPerVisitor} visitas por visitante`
      : null
  },
  {
    title: 'Explorador de Visitantes',
    subtitle: 'Recorrência, origem e histórico consolidado por visitante',
    route: '/painel/metricas/visitantes',
    icon: 'personas',
    color: 'amber',
    highlight: audienceMetrics.value?.summary?.returningVisitors !== undefined
      ? `${audienceMetrics.value.summary.returningVisitors} recorrentes`
      : null
  },
  {
    title: 'Métricas de Lotes',
    subtitle: 'Visualizações, reservas e leads por lote',
    route: '/painel/metricas/lotes',
    icon: 'lot',
    color: 'blue',
    highlight: metrics.value?.topLots?.[0]?.label ? `Top: ${metrics.value.topLots[0].label}` : null
  },
  {
    title: 'Tendência de Vendas',
    subtitle: 'Crescimento de interesse, regiões quentes, comportamento',
    route: '/painel/metricas/tendencias',
    icon: 'trend',
    color: 'emerald',
    highlight: null
  },
  {
    title: 'Métricas de Corretores',
    subtitle: 'Leads, acessos e campanhas por corretor',
    route: '/painel/metricas/corretores',
    icon: 'users',
    color: 'orange',
    highlight: brokerMetrics.value?.summary?.totalBrokers !== undefined
      ? `${brokerMetrics.value.summary.totalBrokers} corretores ativos`
      : null
  },
  {
    title: 'Empreendimentos',
    subtitle: 'Acessos e leads por projeto, ranking de lotes',
    route: '/painel/metricas/empreendimentos',
    icon: 'building',
    color: 'purple',
    highlight: metrics.value?.topProjects?.length ? `${metrics.value.topProjects.length} projetos` : null
  },
  {
    title: 'Pré-lançamento',
    subtitle: 'Fila ativa, conversão, pressão por lote e ritmo de contato',
    route: '/painel/metricas/pre-lancamento',
    icon: 'queue',
    color: 'rose',
    highlight: null
  },
  {
    title: 'Performance por Imobiliárias',
    subtitle: 'Ranking de imobiliárias por sessões, leads e conversão',
    route: '/painel/metricas/imobiliarias',
    icon: 'office',
    color: 'slate',
    highlight: null
  },
  {
    title: 'Origens de Tráfego',
    subtitle: 'Campanhas, fontes UTM, conversão por origem',
    route: '/painel/metricas/trafego',
    icon: 'globe',
    color: 'indigo',
    highlight: metrics.value?.topUtmSources?.length ? `${metrics.value.topUtmSources.length} fontes` : null
  }
])
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader title="Métricas de Acesso" description="Acompanhe detalhadamente o desempenho dos seus empreendimentos">
      <template #actions>
        <div class="flex flex-wrap items-end gap-4 rounded-xl border border-p-border bg-p-elevated p-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Início:</label>
            <input type="date" v-model="startDate" :max="startDateMax" class="rounded-lg border border-p-border bg-p-base px-3.5 py-2.5 text-sm font-medium text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/20" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Fim:</label>
            <input type="date" v-model="endDate" :min="endDateMin" :max="endDateMax" class="rounded-lg border border-p-border bg-p-base px-3.5 py-2.5 text-sm font-medium text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/20" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Empreendimento:</label>
            <select v-model="selectedProjectId" class="rounded-lg border border-p-border bg-p-base px-3.5 py-2.5 pr-9 text-sm font-medium text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/20">
              <option v-if="canAggregateAllProjects" value="all">Todos os Projetos</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loadingMetrics && !metrics" text="Carregando métricas..." />

    <div v-else-if="metrics" class="space-y-8" :class="{ 'opacity-70 transition-opacity': loadingMetrics }">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Número de sessões reais iniciadas no período. Uma nova sessão surge após 30 minutos de inatividade ou quando a visita é retomada em uma nova janela de navegação." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Total de Sessões</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ metrics.summary.totalSessions }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Visitantes únicos identificados no período, mesmo quando retornam em várias sessões." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Total de Visitantes</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ metrics.summary.totalVisitors }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7a4 4 0 1 1 8 0c0 1.4-.67 2.64-1.71 3.37A5 5 0 0 1 18 15v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1a5 5 0 0 1 3.71-4.83A3.98 3.98 0 0 1 8 7Z"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Quantidade e taxa de visitantes que voltaram em mais de uma sessão dentro do período." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Visitantes Retornantes</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ metrics.summary.returningVisitors }} ({{ returningRate }}%)</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Média de páginas vistas por sessão ativa. Leituras longas sem nova navegação não inflacionam esse número com page views artificiais." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Páginas por Sessão</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ pagesPerSession }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Total de vezes que qualquer página do site foi carregada ou visualizada, incluindo recarregamentos." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Visualizações de Página</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ metrics.summary.totalPageViews }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Tempo médio observado entre o primeiro e o último sinal real de atividade da sessão. A aba visível mantém a sessão viva; períodos longos de ausência não são reaproveitados como se fossem navegação contínua." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Tempo Médio/Sessão</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ avgSessionDuration }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Percentual de sessões sem engajamento relevante: uma página apenas, sem interações adicionais com lotes, ferramentas ou envio de lead. Valores menores são melhores." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Taxa de Rejeição</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-warning">{{ bounceRate }}%</span>
          </div>
        </div>
        <div class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10 text-green-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Total de leads gerados e a taxa de conversão (leads / sessões). Indica a eficiência do site em captar contatos." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Leads: Taxa de Conv.</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-success">{{ metrics.summary.totalLeads }} ({{ conversionRate }}%)</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Total de acessos que vieram através de links de corretores. Mostra quantos visitantes os corretores estão trazendo." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Acessos via Corretor</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text-muted">{{ metrics.summary.totalRealtorClicks }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Total de buscas registradas no modal após 7 segundos, no modal inteligente e na página de busca por preferência, respeitando o filtro de empreendimento atual." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Buscas Guiadas</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ searchSummary.totalSearches || 0 }}</span>
          </div>
        </div>
        <div v-if="hasSpecificProjectSelected" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/><path d="M12 3v18"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Quantidade de buscas originadas pelo modal guiado que aparece após alguns segundos de permanência na landing do projeto." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Modal após 7s</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ searchSummary.timedOnboardingSearches || 0 }}</span>
          </div>
        </div>
        <div v-if="hasSpecificProjectSelected" class="flex items-center gap-3.5 rounded-xl border border-p-border bg-p-elevated p-5 transition-colors hover:border-emerald-500/20 hover:bg-p-overlay">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <CommonAppTooltip text="Buscas disparadas na página de unidades usando o fluxo de busca por preferência, dentro do projeto filtrado." position="bottom"><span class="text-xs font-semibold text-p-text-secondary">Busca por Preferência</span></CommonAppTooltip>
            <span class="text-2xl font-bold text-p-text">{{ searchSummary.preferencePageSearches || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Search Intelligence -->
      <section class="flex flex-col gap-4 rounded-xl border border-p-border bg-p-elevated p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-p-text">Busca Inteligente</h3>
            <p class="mt-2 text-sm text-p-text-muted">
              Leituras da intenção declarada do usuário nas buscas do projeto{{ hasSpecificProjectSelected && selectedProject ? ` · ${selectedProject.name}` : '' }}.
            </p>
          </div>
          <div v-if="hasSpecificProjectSelected && selectedProject" class="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-bold text-emerald-400">
            {{ selectedProject.name }}
          </div>
        </div>

        <div v-if="hasSpecificProjectSelected" class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="flex flex-col gap-4 rounded-2xl border border-p-border bg-p-base/30 p-4">
            <span class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Resumo</span>
            <div class="grid grid-cols-2 gap-3.5">
              <div class="flex flex-col gap-1">
                <span class="text-sm text-p-text-muted">Total de buscas</span>
                <strong class="text-p-text">{{ searchSummary.totalSearches || 0 }}</strong>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-sm text-p-text-muted">Modal inteligente</span>
                <strong class="text-p-text">{{ searchSummary.smartModalSearches || 0 }}</strong>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-sm text-p-text-muted">Modal após 7s</span>
                <strong class="text-p-text">{{ searchSummary.timedOnboardingSearches || 0 }}</strong>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-sm text-p-text-muted">Média de resultados</span>
                <strong class="text-p-text">{{ averageSearchResults }}</strong>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4 rounded-2xl border border-p-border bg-p-base/30 p-4">
            <span class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Intenções mais frequentes</span>
            <div v-if="searchIntentRows.length" class="flex flex-col gap-3">
              <div v-for="item in searchIntentRows" :key="item.value" class="flex items-center justify-between gap-3">
                <strong class="text-sm text-p-text">{{ item.label }}</strong>
                <span class="text-sm text-p-text-muted">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-p-text-muted">Nenhuma intenção de busca registrada no período.</p>
          </div>

          <div class="flex flex-col gap-4 rounded-2xl border border-p-border bg-p-base/30 p-4">
            <span class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Origem das buscas</span>
            <div v-if="searchSourceRows.length" class="flex flex-col gap-3">
              <div v-for="item in searchSourceRows" :key="item.value" class="flex items-center justify-between gap-3">
                <strong class="text-sm text-p-text">{{ item.label }}</strong>
                <span class="text-sm text-p-text-muted">{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-p-text-muted">Nenhuma origem de busca registrada no período.</p>
          </div>
        </div>

        <div v-else class="flex items-center gap-4 rounded-2xl border border-dashed border-p-border bg-p-base/30 p-6">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-lg text-emerald-400">
            <i class="bi bi-search" aria-hidden="true"></i>
          </div>
          <div>
            <h4 class="font-semibold text-p-text">Selecione um empreendimento para abrir as métricas de busca</h4>
            <p class="mt-2 max-w-xl text-sm text-p-text-muted">
              As métricas de intenção e origem da busca são exibidas aqui usando o filtro de empreendimento no topo da página.
            </p>
          </div>
        </div>
      </section>

      <!-- Heatmap -->
      <section class="flex flex-col gap-4 rounded-xl border border-p-border bg-p-elevated p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-p-text">{{ selectedProjectHeatmapTitle }}</h3>
            <p class="mt-2 text-sm text-p-text-muted">
              Visualize a planta com concentração de acessos, leads e reservas do empreendimento filtrado.
            </p>
          </div>
          <div v-if="selectedProject" class="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-bold text-emerald-400">
            {{ selectedProject.name }}
          </div>
        </div>

        <ProjectHeatmapReport v-if="projectHeatmap" :report="projectHeatmap" />

        <div v-else class="flex items-center gap-4 rounded-2xl border border-dashed border-p-border bg-p-base/30 p-6">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-lg text-emerald-400">
            <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
          </div>
          <div>
            <h4 class="font-semibold text-p-text">Selecione um empreendimento para abrir o mapa de calor</h4>
            <p class="mt-2 max-w-xl text-sm text-p-text-muted">
              O relatório visual usa a planta do projeto. Quando um projeto estiver selecionado no filtro, a tela mostra automaticamente o heatmap dele.
            </p>
          </div>
        </div>
      </section>

      <!-- History Chart -->
      <div v-if="!auth.isCorretor" class="rounded-xl border border-p-border bg-p-elevated p-6">
        <h3 class="mb-5 text-base font-semibold text-p-text">Histórico de Acessos</h3>
        <div class="relative mt-8 flex h-[250px] items-end gap-6 overflow-x-auto border-b border-p-border px-4 pb-8">
          <div v-for="h in metrics.history" :key="h.date" class="flex h-full w-20 shrink-0 flex-col justify-end">
            <div class="mb-2 flex h-full items-end gap-2">
              <div class="flex h-full flex-1 flex-col items-center justify-end">
                <span class="mb-1 text-[10px] font-bold text-emerald-400">{{ h.views }}</span>
                <div class="w-full rounded-t bg-emerald-500/60 transition-all duration-300" :style="{ height: `${(h.views / maxHistoryValue) * 100}%`, minHeight: '2px' }"></div>
              </div>
              <div class="flex h-full flex-1 flex-col items-center justify-end">
                <span class="mb-1 text-[10px] font-bold text-slate-300">{{ h.sessions }}</span>
                <div class="w-full rounded-t bg-emerald-300/40 transition-all duration-300" :style="{ height: `${(h.sessions / maxHistoryValue) * 100}%`, minHeight: '2px' }"></div>
              </div>
            </div>
            <span class="text-center text-[10px] font-semibold text-p-text-muted">{{ formatDate(h.date) }}</span>
          </div>
          <div v-if="!metrics.history?.length" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-p-text-muted">Nenhum dado no período</div>
        </div>
        <div class="mt-6 flex gap-6 border-t border-dashed border-p-border pt-4">
          <div class="flex cursor-help items-center gap-2 text-[13px] text-p-text-secondary">
            <span class="h-3.5 w-3.5 rounded bg-emerald-500/80"></span>
            <CommonAppTooltip text="Número total de vezes que as páginas foram carregadas, incluindo recarregamentos e navegação interna." position="top" :no-icon="true"><strong>Visualizações</strong> (Cliques em links/páginas)</CommonAppTooltip>
          </div>
          <div class="flex cursor-help items-center gap-2 text-[13px] text-p-text-secondary">
            <span class="h-3.5 w-3.5 rounded bg-emerald-300/70"></span>
            <CommonAppTooltip text="Cada sessão representa uma janela real de visita. Um mesmo visitante pode gerar múltiplas sessões quando volta depois de um período relevante de inatividade." position="top" :no-icon="true"><strong>Sessões</strong> (Janelas de visita)</CommonAppTooltip>
          </div>
        </div>
      </div>

      <!-- Topic Cards -->
      <div v-if="!auth.isCorretor" class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink v-for="card in topicCards" :key="card.route" :to="card.route" class="group flex items-center gap-5 rounded-2xl border border-p-border bg-p-elevated p-6 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/20 hover:shadow-lg">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <!-- Lot -->
            <svg v-if="card.icon === 'lot'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <!-- Trend -->
            <svg v-if="card.icon === 'trend'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <!-- Users -->
            <svg v-if="card.icon === 'users'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <!-- Building -->
            <svg v-if="card.icon === 'building'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
            <!-- Queue -->
            <svg v-if="card.icon === 'queue'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h7"/><circle cx="19" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>
            <!-- Globe -->
            <svg v-if="card.icon === 'globe'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <!-- Office -->
            <svg v-if="card.icon === 'office'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 20v-8h10v8"/><path d="M7 8h.01"/><path d="M12 8h.01"/><path d="M17 8h.01"/></svg>
            <!-- Pulse -->
            <svg v-if="card.icon === 'pulse'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 7-4-14-3 7H2"/></svg>
            <!-- Personas -->
            <svg v-if="card.icon === 'personas'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="mb-1 text-base font-bold text-p-text">{{ card.title }}</h3>
            <p class="text-[13px] leading-relaxed text-p-text-muted">{{ card.subtitle }}</p>
            <span v-if="card.highlight" class="mt-2 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">{{ card.highlight }}</span>
          </div>
          <svg class="shrink-0 text-p-text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-p-text-secondary" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
