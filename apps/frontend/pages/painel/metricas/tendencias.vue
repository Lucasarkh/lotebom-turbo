<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/trends?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar tendências')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchData()
})

onMounted(async () => {
  await fetchProjects()
  fetchData()
})

definePageMeta({
  layout: 'painel'
})

const sortedLotTrends = computed(() => {
  if (!data.value?.lotTrends?.length) return []
  return [...data.value.lotTrends].sort((a: any, b: any) => (b.growth || 0) - (a.growth || 0))
})

const maxPeakCount = computed(() => {
  if (!data.value?.peakHours?.length) return 1
  const max = Math.max(...data.value.peakHours.map((h: any) => h.count || 0))
  return max > 0 ? max : 1
})

const maxDeviceCount = computed(() => {
  if (!data.value?.deviceBreakdown?.length) return 1
  const max = Math.max(...data.value.deviceBreakdown.map((d: any) => d.count || 0))
  return max > 0 ? max : 1
})

const formatGrowth = (value: number | null) => {
  if (value === null || value === undefined) return '---'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

const deviceLabel = (type: string) => {
  const map: Record<string, string> = {
    desktop: 'Desktop',
    mobile: 'Mobile',
    tablet: 'Tablet'
  }
  return map[type.toLowerCase()] || type
}

const formatHour = (hour: number) => {
  return `${String(hour).padStart(2, '0')}h`
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 1) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

const avgSessionDuration = computed(() => {
  return formatDuration(data.value?.engagement?.avgSessionDurationSec || 0)
})

const maxEngagementTime = computed(() => {
  if (!data.value?.engagement?.topEngagementPages?.length) return 1
  const max = Math.max(...data.value.engagement.topEngagementPages.map((p: any) => p.avgTime || 0))
  return max > 0 ? max : 1
})

const maxDurationBucket = computed(() => {
  if (!data.value?.engagement?.durationDistribution?.length) return 1
  const max = Math.max(...data.value.engagement.durationDistribution.map((b: any) => b.count || 0))
  return max > 0 ? max : 1
})
</script>

<template>
  <div class="space-y-6">
    <NuxtLink to="/painel/metricas" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-p-text-muted no-underline transition-colors hover:text-p-accent">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <UiPageHeader title="Tendência de Vendas" description="Crescimento de interesse, regiões quentes e comportamento dos clientes">
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
              <option value="all">Todos os Projetos</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading && !data" text="Carregando tendências..." />

    <div v-else-if="data" class="space-y-8" :class="{ 'opacity-70 transition-opacity': loading }">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <CommonAppTooltip text="Total de janelas reais de visita abertas no período. Sessões retomadas após longa ausência contam como uma nova visita." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Sessões no Período</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-blue-600">{{ data.summary.currentSessions }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl" :class="data.summary.sessionGrowth !== null && data.summary.sessionGrowth >= 0 ? 'bg-emerald-500/12 text-emerald-600' : 'bg-red-500/12 text-red-600'">
            <svg v-if="data.summary.sessionGrowth !== null && data.summary.sessionGrowth >= 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <svg v-else-if="data.summary.sessionGrowth !== null && data.summary.sessionGrowth < 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <CommonAppTooltip text="Variação percentual de sessões comparando o período atual com o anterior de mesma duração." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Crescimento Sessões</span></CommonAppTooltip>
          <span class="text-3xl font-bold" :class="data.summary.sessionGrowth !== null && data.summary.sessionGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ formatGrowth(data.summary.sessionGrowth) }}
          </span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <CommonAppTooltip text="Total de leads captados no período selecionado." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Leads no Período</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-emerald-600">{{ data.summary.currentLeads }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl" :class="data.summary.leadGrowth !== null && data.summary.leadGrowth >= 0 ? 'bg-emerald-500/12 text-emerald-600' : 'bg-red-500/12 text-red-600'">
            <svg v-if="data.summary.leadGrowth !== null && data.summary.leadGrowth >= 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <svg v-else-if="data.summary.leadGrowth !== null && data.summary.leadGrowth < 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <CommonAppTooltip text="Variação percentual de leads comparando o período atual com o anterior de mesma duração." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Crescimento Leads</span></CommonAppTooltip>
          <span class="text-3xl font-bold" :class="data.summary.leadGrowth !== null && data.summary.leadGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ formatGrowth(data.summary.leadGrowth) }}
          </span>
        </div>
      </div>

      <!-- Lotes em Alta -->
      <UiCard>
        <h3 class="mb-5 text-base font-semibold text-p-text"><CommonAppTooltip text="Lotes com maior crescimento de visualizações comparando o período atual com o anterior." position="right">Lotes em Alta</CommonAppTooltip></h3>
        <div v-if="sortedLotTrends.length" class="flex flex-col gap-3">
          <div v-for="lot in sortedLotTrends" :key="lot.label" class="flex items-center gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3.5 transition-colors hover:bg-white/[0.04]">
            <span class="min-w-[120px] text-sm font-bold text-p-text">{{ lot.label }}</span>
            <div class="flex flex-1 items-center gap-2 text-[13px] text-p-text-muted">
              <span class="font-semibold text-p-text-secondary">{{ lot.current }} views</span>
              <span class="text-[11px] text-p-text-muted">vs</span>
              <span class="text-p-text-muted">{{ lot.previous }} views</span>
            </div>
            <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" :class="lot.growth >= 0 ? 'bg-emerald-500/12 text-emerald-600' : 'bg-red-500/12 text-red-600'">
              <svg v-if="lot.growth >= 0" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              {{ lot.growth >= 0 ? '+' : '' }}{{ lot.growth.toFixed(1) }}%
            </span>
          </div>
        </div>
        <div v-else class="py-12 text-center font-semibold text-p-text-muted">Nenhum dado de tendência disponível</div>
      </UiCard>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Dispositivos -->
        <UiCard>
          <h3 class="mb-5 text-base font-semibold text-p-text"><CommonAppTooltip text="Distribuição dos acessos por tipo de dispositivo utilizado pelos visitantes." position="right">Dispositivos</CommonAppTooltip></h3>
          <div v-if="data.deviceBreakdown?.length" class="flex flex-col gap-5">
            <div v-for="device in data.deviceBreakdown" :key="device.type" class="flex flex-col gap-2">
              <div class="flex items-center gap-2.5">
                <div class="flex items-center text-p-text-muted">
                  <!-- Desktop -->
                  <svg v-if="device.type.toLowerCase() === 'desktop'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  <!-- Mobile -->
                  <svg v-else-if="device.type.toLowerCase() === 'mobile'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  <!-- Tablet -->
                  <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </div>
                <span class="flex-1 text-sm font-semibold text-p-text-secondary">{{ deviceLabel(device.type) }}</span>
                <span class="text-sm font-bold text-p-text">{{ device.percentage.toFixed(1) }}%</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-md bg-white/[0.06]">
                <div class="h-full min-w-[2px] rounded-md bg-p-accent transition-all duration-400" :style="{ width: `${(device.count / maxDeviceCount) * 100}%` }"></div>
              </div>
            </div>
          </div>
          <div v-else class="py-12 text-center font-semibold text-p-text-muted">Nenhum dado de dispositivo</div>
        </UiCard>

        <!-- Horarios de Pico -->
        <UiCard>
          <h3 class="mb-5 text-base font-semibold text-p-text"><CommonAppTooltip text="Horários do dia com maior volume de acessos. Útil para planejar ações de marketing." position="right">Horários de Pico</CommonAppTooltip></h3>
          <div v-if="data.peakHours?.length" class="flex h-[200px] items-end gap-1 pt-6">
            <div v-for="hour in data.peakHours" :key="hour.hour" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span class="mb-1 text-[9px] font-bold text-p-text-muted">{{ hour.count }}</span>
              <div class="flex w-full flex-1 items-end justify-center">
                <div class="w-4/5 max-w-6 min-h-[2px] rounded-t bg-blue-600 opacity-80 transition-all duration-400 hover:opacity-100" :style="{ height: `${(hour.count / maxPeakCount) * 100}%` }"></div>
              </div>
              <span class="mt-1.5 whitespace-nowrap text-[9px] font-semibold text-p-text-muted">{{ formatHour(hour.hour) }}</span>
            </div>
          </div>
          <div v-else class="py-12 text-center font-semibold text-p-text-muted">Nenhum dado de horários</div>
        </UiCard>
      </div>

      <!-- Engagement Section -->
      <div class="flex items-center justify-between border-b border-p-border pb-2">
        <h2 class="text-xl font-bold text-p-text">Engajamento</h2>
        <div class="flex items-center gap-2 text-p-text-muted">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <CommonAppTooltip text="Média de tempo com atividade observável por sessão. A métrica considera navegação e permanência com aba visível, sem reaproveitar períodos longos de inatividade." position="bottom"><span class="text-[13px]">Tempo médio por sessão:</span></CommonAppTooltip>
          <span class="text-sm font-bold text-cyan-500">{{ avgSessionDuration }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Duration Distribution -->
        <UiCard>
          <h3 class="mb-5 text-base font-semibold text-p-text"><CommonAppTooltip text="Como as sessões se distribuem por faixas de atividade observada. Serve para entender profundidade real de navegação, não apenas abas abertas esquecidas." position="right">Distribuição de Duração das Sessões</CommonAppTooltip></h3>
          <div v-if="data.engagement?.durationDistribution?.length" class="flex flex-col gap-3.5">
            <div v-for="bucket in data.engagement.durationDistribution" :key="bucket.label" class="flex items-center gap-3">
              <span class="min-w-[80px] text-[13px] font-medium text-p-text-secondary">{{ bucket.label }}</span>
              <div class="h-2.5 flex-1 overflow-hidden rounded-md bg-white/[0.06]">
                <div class="h-full min-w-[2px] rounded-md bg-gradient-to-r from-cyan-500 to-sky-500 transition-all duration-400" :style="{ width: `${(bucket.count / maxDurationBucket) * 100}%` }"></div>
              </div>
              <span class="min-w-[40px] text-right text-sm font-semibold text-p-text-secondary">{{ bucket.count }}</span>
              <span class="min-w-[50px] text-right text-xs text-p-text-muted">{{ bucket.percentage.toFixed(1) }}%</span>
            </div>
          </div>
          <div v-else class="py-12 text-center font-semibold text-p-text-muted">Nenhum dado de duração disponível</div>
        </UiCard>

        <!-- Top Engagement Pages -->
        <UiCard>
          <h3 class="mb-5 text-base font-semibold text-p-text"><CommonAppTooltip text="Páginas onde os visitantes passam mais tempo em média, indicando maior interesse no conteúdo." position="right">Páginas com Maior Engajamento</CommonAppTooltip></h3>
          <div v-if="data.engagement?.topEngagementPages?.length" class="flex flex-col gap-3.5">
            <div v-for="page in data.engagement.topEngagementPages" :key="page.path" class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="max-w-[70%] truncate text-[13px] font-semibold text-p-text-secondary">{{ page.path }}</span>
                <span class="text-xs text-p-text-muted">{{ page.views }} views</span>
              </div>
              <div class="h-2 overflow-hidden rounded bg-white/[0.06]">
                <div class="h-full min-w-[2px] rounded bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-400" :style="{ width: `${(page.avgTime / maxEngagementTime) * 100}%` }"></div>
              </div>
              <span class="self-end text-sm font-bold text-cyan-500">{{ formatDuration(page.avgTime) }}</span>
            </div>
          </div>
          <div v-else class="py-12 text-center font-semibold text-p-text-muted">Nenhum dado de engajamento disponível</div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
