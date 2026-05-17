<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchAgencyMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/agencies?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de imobiliárias')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchAgencyMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchAgencyMetrics()
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

    <UiPageHeader title="Performance por Imobiliárias" description="Acompanhe sessões, leads e conversão por imobiliária parceira">
      <template #actions>
        <div class="flex flex-wrap items-end gap-4 rounded-xl border border-p-border bg-p-elevated p-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Início:</label>
            <input v-model="startDate" type="date" :max="startDateMax" class="rounded-lg border border-p-border bg-p-base px-3.5 py-2.5 text-sm font-medium text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/20" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Fim:</label>
            <input v-model="endDate" type="date" :min="endDateMin" :max="endDateMax" class="rounded-lg border border-p-border bg-p-base px-3.5 py-2.5 text-sm font-medium text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/20" />
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

    <UiLoadingState v-if="loading && !data" text="Carregando métricas de imobiliárias..." />

    <div v-else-if="data" class="space-y-8" :class="{ 'opacity-70 transition-opacity': loading }">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Total de imobiliárias parceiras com participação no painel." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Imobiliárias</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-violet-500">{{ data.summary.totalAgencies }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Quantidade total de corretores ativos vinculados às imobiliárias." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Corretores Ativos</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-orange-600">{{ data.summary.totalRealtors }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Soma de todas as sessões atribuídas às imobiliárias no período." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Sessões</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-blue-600">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Total de leads captados por imobiliárias no período selecionado." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Leads</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-emerald-600">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Taxa média de conversão das imobiliárias (leads ÷ sessões)." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Conversão Média</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-indigo-600">{{ data.summary.avgConversionRate }}%</span>
        </div>
      </div>

      <UiCard>
        <h3 class="mb-5 text-base font-semibold text-p-text">Ranking de Imobiliárias</h3>

        <UiEmptyState v-if="!data.agencies?.length" title="Nenhuma imobiliária com dados no período" />

        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="border-b border-p-border px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted">Imobiliária</th>
                <th class="border-b border-p-border px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Número de corretores ativos com link habilitado na imobiliária." position="bottom">Corretores</CommonAppTooltip></th>
                <th class="border-b border-p-border px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Sessões atribuídas a corretores desta imobiliária." position="bottom">Sessões</CommonAppTooltip></th>
                <th class="border-b border-p-border px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Leads convertidos por sessões atribuídas à imobiliária." position="bottom">Leads</CommonAppTooltip></th>
                <th class="border-b border-p-border px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Percentual de sessões que viraram lead (leads ÷ sessões)." position="bottom">Conversão</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="agency in data.agencies" :key="agency.id" class="border-b border-p-border">
                <td class="px-3 py-3.5">
                  <div class="flex items-center gap-3">
                    <span class="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-blue-500/20 font-extrabold text-blue-300">{{ agency.name?.charAt(0)?.toUpperCase() }}</span>
                    <div class="flex flex-col gap-0.5">
                      <span class="text-sm font-bold text-p-text">{{ agency.name }}</span>
                      <span v-if="agency.email" class="text-xs font-medium text-p-text-muted">{{ agency.email }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3.5 text-sm font-semibold text-orange-600">{{ agency.activeRealtors }}</td>
                <td class="px-3 py-3.5 text-sm font-semibold text-blue-600">{{ agency.sessions }}</td>
                <td class="px-3 py-3.5 text-sm font-semibold text-emerald-600">{{ agency.leads }}</td>
                <td class="px-3 py-3.5 text-sm font-semibold text-indigo-600">{{ agency.conversionRate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </div>
  </div>
</template>
