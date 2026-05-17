<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchEnterpriseMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/enterprise?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de empreendimentos')
  } finally {
    loading.value = false
  }
}

function getMaxLotCount(topLots: { label: string; count: number }[]): number {
  if (!topLots?.length) return 1
  const max = Math.max(...topLots.map(l => l.count))
  return max > 0 ? max : 1
}

watch([startDate, endDate], () => {
  fetchEnterpriseMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchEnterpriseMetrics()
})

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div class="space-y-6">
    <NuxtLink to="/painel/metricas" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-p-text-muted no-underline transition-colors hover:text-p-accent">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <UiPageHeader title="Métricas de Empreendimentos" description="Acessos, leads e ranking de lotes por projeto">
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
        </div>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading && !data" text="Carregando métricas de empreendimentos..." />

    <div v-else-if="data" class="space-y-8" :class="{ 'opacity-70 transition-opacity': loading }">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Total de empreendimentos (projetos) cadastrados na plataforma." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Empreendimentos</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-violet-500">{{ data.summary.totalProjects }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Soma de todas as visitas recebidas em todos os empreendimentos no período." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Total de Sessões</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-blue-600">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Total de leads captados em todos os empreendimentos no período selecionado." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Total de Leads</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-emerald-600">{{ data.summary.totalLeads }}</span>
        </div>
      </div>

      <!-- Project Cards Grid -->
      <UiEmptyState v-if="!data.projects?.length" title="Nenhum empreendimento encontrado no período" />

      <div v-else class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="project in data.projects"
          :key="project.projectId"
          :to="`/painel/projetos/${project.projectId}/metricas`"
          class="flex flex-col gap-4 rounded-xl border border-p-border bg-p-elevated p-6 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-lg"
        >
          <h3 class="text-base font-bold text-p-text">{{ project.name }}</h3>

          <div class="flex items-center gap-4">
            <div class="flex flex-1 flex-col items-center gap-1">
              <span class="text-xl font-bold text-blue-600">{{ project.sessions }}</span>
              <CommonAppTooltip text="Visitas únicas recebidas neste empreendimento." position="top"><span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Sessões</span></CommonAppTooltip>
            </div>
            <div class="h-8 w-px bg-p-border"></div>
            <div class="flex flex-1 flex-col items-center gap-1">
              <span class="text-xl font-bold text-emerald-600">{{ project.leads }}</span>
              <CommonAppTooltip text="Contatos gerados a partir deste empreendimento." position="top"><span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Leads</span></CommonAppTooltip>
            </div>
            <div class="h-8 w-px bg-p-border"></div>
            <div class="flex flex-1 flex-col items-center gap-1">
              <span class="text-xl font-bold text-violet-500">{{ project.conversionRate }}%</span>
              <CommonAppTooltip text="Taxa de conversão: percentual de sessões que resultaram em leads." position="top"><span class="text-[11px] font-semibold uppercase tracking-wider text-p-text-muted">Conversão</span></CommonAppTooltip>
            </div>
          </div>

          <div v-if="project.topLots?.length" class="border-t border-p-border pt-3.5">
            <span class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Top Lotes</span>
            <div class="flex flex-col gap-2">
              <div v-for="lot in project.topLots" :key="lot.label" class="flex items-center gap-2.5">
                <span class="min-w-[70px] shrink-0 text-[13px] font-medium text-p-text-secondary">{{ lot.label }}</span>
                <div class="h-2 flex-1 overflow-hidden rounded bg-white/5">
                  <div
                    class="h-full min-w-[2px] rounded bg-violet-500 transition-all duration-300"
                    :style="{ width: `${(lot.count / getMaxLotCount(project.topLots)) * 100}%` }"
                  ></div>
                </div>
                <span class="min-w-[28px] text-right text-xs font-bold text-p-text-secondary">{{ lot.count }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
