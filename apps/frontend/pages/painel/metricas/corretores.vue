<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)
const expandedBrokers = ref<Set<string>>(new Set())

async function fetchBrokerMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/brokers?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de corretores')
  } finally {
    loading.value = false
  }
}

function toggleExpand(id: string) {
  const next = new Set(expandedBrokers.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedBrokers.value = next
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchBrokerMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchBrokerMetrics()
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

    <UiPageHeader title="Métricas de Corretores" description="Leads, acessos e campanhas por corretor">
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

    <UiLoadingState v-if="loading && !data" text="Carregando métricas de corretores..." />

    <div v-else-if="data" class="space-y-8" :class="{ 'opacity-70 transition-opacity': loading }">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Número de corretores que geraram pelo menos uma sessão ou lead no período selecionado." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Corretores Ativos</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-orange-600">{{ data.summary.totalBrokers }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Soma de todas as sessões (visitas) geradas pelos links dos corretores." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Total de Sessões</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-blue-600">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Total de leads captados através dos links de todos os corretores." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Total de Leads</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-emerald-600">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <CommonAppTooltip text="Taxa média de conversão de todos os corretores (leads ÷ sessões × 100)." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Conversão Média</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-violet-500">{{ data.summary.avgConversionRate }}%</span>
        </div>
      </div>

      <!-- Broker Table -->
      <UiCard>
        <h3 class="mb-5 text-base font-semibold text-p-text">Corretores</h3>

        <UiEmptyState v-if="!data.brokers?.length" title="Nenhum corretor encontrado no período" />

        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="w-[40%] border-b border-p-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Corretor</th>
                <th class="border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Total de contatos gerados pelo corretor." position="bottom">Leads</CommonAppTooltip></th>
                <th class="border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Número de visitas geradas através do link do corretor." position="bottom">Sessões</CommonAppTooltip></th>
                <th class="border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Percentual de sessões que resultaram em leads (leads ÷ sessões)." position="bottom">Conversão</CommonAppTooltip></th>
                <th class="border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Quantidade de campanhas vinculadas ao corretor. Clique na linha para expandir." position="bottom">Campanhas</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="broker in data.brokers" :key="broker.id">
                <tr class="cursor-pointer border-b border-p-border transition-colors hover:bg-white/[0.03]" :class="{ 'bg-white/[0.04]': expandedBrokers.has(broker.id) }" @click="toggleExpand(broker.id)">
                  <td class="px-4 py-3.5 text-sm text-p-text-secondary">
                    <div class="flex items-center gap-3">
                      <img v-if="broker.photoUrl" :src="broker.photoUrl" :alt="broker.name" class="h-10 w-10 shrink-0 rounded-full object-cover" />
                      <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-base font-bold text-orange-600">{{ broker.name?.charAt(0)?.toUpperCase() }}</span>
                      <div class="flex flex-col gap-0.5">
                        <span class="font-semibold text-p-text">{{ broker.name }}</span>
                        <span v-if="broker.code" class="text-xs text-p-text-muted">{{ broker.code }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3.5 text-center text-sm font-semibold text-emerald-600">{{ broker.leads }}</td>
                  <td class="px-4 py-3.5 text-center text-sm font-semibold text-blue-600">{{ broker.sessions }}</td>
                  <td class="px-4 py-3.5 text-center text-sm font-semibold text-violet-500">{{ broker.conversionRate }}%</td>
                  <td class="px-4 py-3.5 text-center text-sm">
                    <span class="mr-2 font-semibold text-p-text-secondary">{{ broker.campaigns?.length || 0 }}</span>
                    <svg class="inline-block text-p-text-muted transition-transform" :class="{ 'rotate-180': expandedBrokers.has(broker.id) }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </td>
                </tr>
                <tr v-if="expandedBrokers.has(broker.id)">
                  <td colspan="5" class="border-b border-p-border p-0">
                    <div class="bg-black/15 py-4 pl-[68px] pr-6">
                      <div v-if="!broker.campaigns?.length" class="py-3 text-[13px] text-p-text-muted">Nenhuma campanha vinculada</div>
                      <table v-else class="w-full border-collapse">
                        <thead>
                          <tr>
                            <th class="border-b border-white/5 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-p-text-muted">Campanha</th>
                            <th class="border-b border-white/5 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-p-text-muted">Sessões</th>
                            <th class="border-b border-white/5 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-p-text-muted">Leads</th>
                            <th class="border-b border-white/5 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-p-text-muted">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="campaign in broker.campaigns" :key="campaign.id">
                            <td class="border-b border-white/[0.03] px-3 py-2.5 text-[13px] font-medium text-p-text-secondary">{{ campaign.name }}</td>
                            <td class="border-b border-white/[0.03] px-3 py-2.5 text-[13px] text-blue-600">{{ campaign.sessions }}</td>
                            <td class="border-b border-white/[0.03] px-3 py-2.5 text-[13px] text-emerald-600">{{ campaign.leads }}</td>
                            <td class="border-b border-white/[0.03] px-3 py-2.5">
                              <span class="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold" :class="campaign.active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-gray-400/15 text-gray-400'">
                                {{ campaign.active ? 'Ativa' : 'Inativa' }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </UiCard>
    </div>
  </div>
</template>
