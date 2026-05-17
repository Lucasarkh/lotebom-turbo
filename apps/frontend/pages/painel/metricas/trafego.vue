<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchTraffic() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/traffic?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar origens de tráfego')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchTraffic()
})

onMounted(async () => {
  await fetchProjects()
  fetchTraffic()
})

definePageMeta({
  layout: 'painel'
})

const maxSourceSessions = computed(() => {
  if (!data.value?.sources?.length) return 1
  const max = Math.max(...data.value.sources.map((s: any) => s.sessions || 0))
  return max > 0 ? max : 1
})

const maxMediumCount = computed(() => {
  if (!data.value?.mediums?.length) return 1
  const max = Math.max(...data.value.mediums.map((m: any) => m.count || 0))
  return max > 0 ? max : 1
})

function formatCurrency(value: number): string {
  if (!value) return '---'
  return `R$ ${value.toFixed(2)}`
}
</script>

<template>
  <div class="space-y-6">
    <NuxtLink to="/painel/metricas" class="inline-flex items-center gap-2 text-sm font-medium text-p-text-muted hover:text-p-accent transition-colors">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-p-text">Origens de Tráfego</h1>
        <p class="mt-1 text-sm text-p-text-muted">Campanhas, fontes UTM e conversão por origem</p>
      </div>

      <div class="flex flex-wrap items-end gap-4 rounded-xl border border-p-border bg-p-elevated p-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Início:</label>
          <input type="date" v-model="startDate" :max="startDateMax" class="rounded-lg border border-p-border bg-p-raised px-3 py-2.5 text-sm text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Data Fim:</label>
          <input type="date" v-model="endDate" :min="endDateMin" :max="endDateMax" class="rounded-lg border border-p-border bg-p-raised px-3 py-2.5 text-sm text-p-text [color-scheme:dark] focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Empreendimento:</label>
          <select v-model="selectedProjectId" class="rounded-lg border border-p-border bg-p-raised px-3 py-2.5 text-sm text-p-text appearance-none focus:border-p-accent focus:outline-none focus:ring-2 focus:ring-p-accent/30">
            <option value="all">Todos os Projetos</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <UiLoadingState v-if="loading && !data" text="Carregando origens de tráfego..." />

    <div v-else-if="data" class="space-y-6" :class="{ 'opacity-60': loading }">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard padding="md">
          <div class="flex flex-col items-center text-center gap-2">
            <CommonAppTooltip text="Total de visitas recebidas de todas as fontes de tráfego no período." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Sessões Totais</span></CommonAppTooltip>
            <span class="text-3xl font-bold text-blue-500">{{ data.summary.totalSessions }}</span>
          </div>
        </UiCard>
        <UiCard padding="md">
          <div class="flex flex-col items-center text-center gap-2">
            <CommonAppTooltip text="Total de leads captados, independente da fonte de origem." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Leads Gerados</span></CommonAppTooltip>
            <span class="text-3xl font-bold text-emerald-500">{{ data.summary.totalLeads }}</span>
          </div>
        </UiCard>
        <UiCard padding="md">
          <div class="flex flex-col items-center text-center gap-2">
            <CommonAppTooltip text="Quantidade de fontes de tráfego distintas identificadas (ex: Google, Facebook, direto)." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Fontes Únicas</span></CommonAppTooltip>
            <span class="text-3xl font-bold text-indigo-500">{{ data.summary.uniqueSources }}</span>
          </div>
        </UiCard>
        <UiCard padding="md">
          <div class="flex flex-col items-center text-center gap-2">
            <CommonAppTooltip text="Número de campanhas de marketing atualmente ativas e gerando tráfego." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Campanhas Ativas</span></CommonAppTooltip>
            <span class="text-3xl font-bold text-purple-500">{{ data.summary.activeCampaigns }}</span>
          </div>
        </UiCard>
      </div>

      <!-- Fontes de Trafego -->
      <UiCard padding="md">
        <h3 class="mb-5 text-base font-semibold text-p-text">Fontes de Tráfego</h3>
        <div v-if="data.sources?.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-p-border">
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Origem do tráfego identificada pelo parâmetro UTM source ou referrer." position="bottom">Fonte</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Número de visitas vindas desta fonte." position="bottom">Sessões</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Leads gerados por visitantes vindos desta fonte." position="bottom">Leads</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Percentual de sessões desta fonte que resultaram em leads." position="bottom">Conversão %</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-p-border">
              <tr v-for="item in data.sources" :key="item.source" class="hover:bg-p-overlay/50">
                <td class="px-4 py-3.5 text-p-text-secondary">{{ item.source || '(direto)' }}</td>
                <td class="px-4 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <span class="min-w-[36px] font-semibold text-p-text-secondary">{{ item.sessions }}</span>
                    <div class="flex-1 min-w-[60px] h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-blue-500 transition-all duration-500"
                        :style="{ width: maxSourceSessions > 0 ? (item.sessions / maxSourceSessions * 100) + '%' : '0%' }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ item.leads }}</td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ item.conversionRate.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <UiEmptyState v-else title="Nenhuma fonte de tráfego no período" />
      </UiCard>

      <!-- Campanhas -->
      <UiCard padding="md">
        <h3 class="mb-5 text-base font-semibold text-p-text">Campanhas</h3>
        <div v-if="data.campaigns?.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-p-border">
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Nome da campanha de marketing configurada." position="bottom">Campanha</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Empreendimento vinculado à campanha." position="bottom">Projeto</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Sessões</th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Leads</th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Valor total investido nesta campanha de marketing." position="bottom">Investido (R$)</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Custo por Lead: valor investido dividido pelo número de leads gerados. Quanto menor, mais eficiente." position="bottom">CPL (R$)</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Taxa de conversão da campanha: percentual de sessões que geraram leads." position="bottom">Conversão %</CommonAppTooltip></th>
                <th class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-p-border">
              <tr v-for="campaign in data.campaigns" :key="campaign.utmCampaign" class="hover:bg-p-overlay/50">
                <td class="px-4 py-3.5 text-p-text-secondary">{{ campaign.name || campaign.utmCampaign }}</td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ campaign.projectName || '---' }}</td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ campaign.sessions }}</td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ campaign.leads }}</td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ formatCurrency(campaign.totalSpent) }}</td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ formatCurrency(campaign.costPerLead) }}</td>
                <td class="px-4 py-3.5 text-p-text-secondary">{{ campaign.conversionRate.toFixed(1) }}%</td>
                <td class="px-4 py-3.5">
                  <UiBadge v-if="campaign.active === true" variant="success">Ativa</UiBadge>
                  <UiBadge v-else-if="campaign.active === false" variant="neutral">Inativa</UiBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <UiEmptyState v-else title="Nenhuma campanha encontrada no período" />
      </UiCard>

      <!-- Canais (Medium) -->
      <UiCard padding="md">
        <h3 class="mb-5 text-base font-semibold text-p-text">Canais (Medium)</h3>
        <div v-if="data.mediums?.length" class="flex flex-col gap-4">
          <div v-for="medium in data.mediums" :key="medium.medium" class="flex items-center gap-3">
            <span class="w-[140px] truncate text-[13px] text-p-text-secondary">{{ medium.medium || '(nenhum)' }}</span>
            <div class="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                class="h-full rounded-full bg-indigo-500 transition-all duration-500"
                :style="{ width: maxMediumCount > 0 ? (medium.count / maxMediumCount * 100) + '%' : '0%' }"
              ></div>
            </div>
            <span class="min-w-[40px] text-right text-sm font-semibold text-p-text">{{ medium.count }}</span>
          </div>
        </div>
        <UiEmptyState v-else title="Nenhum canal encontrado no período" />
      </UiCard>
    </div>
  </div>
</template>
