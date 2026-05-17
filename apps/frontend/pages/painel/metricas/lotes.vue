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
    data.value = await fetchApi(`/tracking/metrics/lots?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de lotes')
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

const maxViews = computed(() => {
  if (!data.value?.lots?.length) return 1
  const max = Math.max(...data.value.lots.map((l: any) => l.views || 0))
  return max > 0 ? max : 1
})

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    AVAILABLE: 'Disponível',
    RESERVED: 'Reservado',
    SOLD: 'Vendido'
  }
  return map[status] || status
}

const statusClass = (status: string) => {
  const map: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500/12 text-emerald-600',
    RESERVED: 'bg-amber-500/12 text-amber-600',
    SOLD: 'bg-red-500/12 text-red-600'
  }
  return map[status] || ''
}
</script>

<template>
  <div class="space-y-6">
    <NuxtLink to="/painel/metricas" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-p-text-muted no-underline transition-colors hover:text-p-accent">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <UiPageHeader title="Métricas de Lotes" description="Visualizações, reservas e leads detalhados por lote">
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

    <UiLoadingState v-if="loading && !data" text="Carregando métricas de lotes..." />

    <div v-else-if="data" class="space-y-8" :class="{ 'opacity-70 transition-opacity': loading }">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <CommonAppTooltip text="Total de vezes que as páginas de lotes individuais foram visualizadas pelos visitantes." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Visualizações de Lotes</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-blue-600">{{ data.summary.totalViews }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <CommonAppTooltip text="Quantidade de leads (contatos) gerados a partir de páginas de lotes específicos." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Leads em Lotes</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-emerald-600">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="flex flex-col items-center gap-2 rounded-xl border border-p-border bg-p-elevated p-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-500">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          </div>
          <CommonAppTooltip text="Total de lotes que foram reservados por interessados no período selecionado." position="bottom"><span class="text-sm font-medium text-p-text-secondary">Reservas</span></CommonAppTooltip>
          <span class="text-3xl font-bold text-violet-500">{{ data.summary.totalReservations }}</span>
        </div>
      </div>

      <!-- Ranking Table -->
      <UiCard>
        <h3 class="mb-5 text-base font-semibold text-p-text">Ranking de Lotes</h3>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th class="whitespace-nowrap border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted">#</th>
                <th class="min-w-[140px] border-b border-p-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Lote</th>
                <th class="min-w-[140px] border-b border-p-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted">Empreendimento</th>
                <th class="min-w-[200px] border-b border-p-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Quantidade de vezes que este lote foi visualizado." position="bottom">Visualizações</CommonAppTooltip></th>
                <th class="whitespace-nowrap border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Leads gerados a partir da página deste lote." position="bottom">Leads</CommonAppTooltip></th>
                <th class="whitespace-nowrap border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Número de reservas feitas para este lote." position="bottom">Reservas</CommonAppTooltip></th>
                <th class="whitespace-nowrap border-b border-p-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-p-text-muted"><CommonAppTooltip text="Status atual do lote: Disponível, Reservado ou Vendido." position="bottom">Status</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(lot, idx) in data.lots" :key="lot.code" class="transition-colors hover:bg-white/[0.02]">
                <td class="border-b border-white/[0.04] px-4 py-3.5 text-center font-bold text-p-text-muted">{{ Number(idx) + 1 }}</td>
                <td class="border-b border-white/[0.04] px-4 py-3.5">
                  <span class="block text-sm font-bold text-p-text">{{ lot.code }}</span>
                  <span class="mt-0.5 block text-xs text-p-text-muted">{{ lot.name }}</span>
                </td>
                <td class="border-b border-white/[0.04] px-4 py-3.5 text-p-text-secondary">{{ lot.project }}</td>
                <td class="border-b border-white/[0.04] px-4 py-3.5">
                  <div class="flex items-center gap-3">
                    <span class="min-w-[36px] text-right text-sm font-bold text-p-text">{{ lot.views }}</span>
                    <div class="h-2 flex-1 overflow-hidden rounded bg-white/[0.06]">
                      <div class="h-full min-w-[2px] rounded bg-blue-600 transition-all duration-400" :style="{ width: `${(lot.views / maxViews) * 100}%` }"></div>
                    </div>
                  </div>
                </td>
                <td class="border-b border-white/[0.04] px-4 py-3.5 text-center font-semibold text-p-text-secondary">{{ lot.leads }}</td>
                <td class="border-b border-white/[0.04] px-4 py-3.5 text-center font-semibold text-p-text-secondary">{{ lot.reservations }}</td>
                <td class="border-b border-white/[0.04] px-4 py-3.5 text-center">
                  <span class="inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold" :class="statusClass(lot.status)">{{ statusLabel(lot.status) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!data.lots?.length" class="py-12 text-center font-semibold text-p-text-muted">Nenhum lote encontrado no período</div>
        </div>
      </UiCard>
    </div>
  </div>
</template>
