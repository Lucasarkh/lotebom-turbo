<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchVisitor() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/report/visitors/${route.params.id}?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar detalhe do visitante')
  } finally {
    loading.value = false
  }
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
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

watch([selectedProjectId, startDate, endDate], fetchVisitor)

onMounted(async () => {
  await fetchProjects()
  fetchVisitor()
})

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div class="space-y-6">
    <NuxtLink :to="{ path: '/painel/metricas/visitantes', query: { ...route.query } }" class="inline-flex items-center gap-2 text-sm font-medium text-p-text-muted hover:text-p-accent transition-colors">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar aos Visitantes
    </NuxtLink>

    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-p-text">Detalhe do Visitante</h1>
        <p class="mt-1 text-sm text-p-text-muted">{{ data?.summary?.id || route.params.id }}</p>
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

    <UiLoadingState v-if="loading && !data" text="Carregando visitante..." />

    <div v-else-if="data" class="space-y-6" :class="{ 'opacity-60': loading }">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard padding="md">
          <CommonAppTooltip text="Quantidade total de sessões atribuídas a este visitante no período." position="bottom"><span class="text-xs text-p-text-muted">Sessões</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-blue-400">{{ data.summary.totalSessions }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Total de leads atribuídos a este visitante no período." position="bottom"><span class="text-xs text-p-text-muted">Leads</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-emerald-400">{{ data.summary.totalLeads }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Origem principal de atribuição do visitante." position="bottom"><span class="text-xs text-p-text-muted">Origem</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-cyan-400">{{ data.summary.utmSource || '(Direto)' }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Momento mais recente em que este visitante foi visto no site." position="bottom"><span class="text-xs text-p-text-muted">Última atividade</span></CommonAppTooltip>
          <span class="mt-2 block text-lg font-extrabold leading-relaxed text-indigo-400">{{ formatDateTime(data.summary.lastSeenAt) }}</span>
        </UiCard>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UiCard padding="md">
          <CommonAppTooltip text="Contexto geral do visitante: projeto, origem, campanha e janela de atividade." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Resumo</h3></CommonAppTooltip>
          <dl class="grid gap-3">
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Projeto</dt><dd class="text-right text-sm text-p-text">{{ data.summary.projectName || '---' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Corretor</dt><dd class="text-right text-sm text-p-text">{{ data.summary.realtorName || '---' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Campanha</dt><dd class="text-right text-sm text-p-text">{{ data.summary.utmCampaign || '(Nenhuma)' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Landing</dt><dd class="text-right text-sm text-p-text">{{ data.summary.landingPage || '---' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Referrer</dt><dd class="text-right text-sm text-p-text">{{ data.summary.referrer || '---' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Primeira visita</dt><dd class="text-right text-sm text-p-text">{{ formatDateTime(data.summary.firstSeenAt) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Última visita</dt><dd class="text-right text-sm text-p-text">{{ formatDateTime(data.summary.lastSeenAt) }}</dd></div>
          </dl>
        </UiCard>

        <UiCard padding="md">
          <CommonAppTooltip text="Lotes mais acessados ou interagidos por este visitante ao longo das sessões." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Lotes de Interesse</h3></CommonAppTooltip>
          <div v-if="data.lots?.length" class="grid gap-2.5">
            <div v-for="lot in data.lots" :key="lot.label" class="flex items-center justify-between gap-4 rounded-xl bg-p-base/50 px-3.5 py-3">
              <span class="text-sm text-p-text-secondary">{{ lot.label }}</span>
              <strong class="text-sm text-p-text">{{ lot.count }}</strong>
            </div>
          </div>
          <UiEmptyState v-else title="Nenhum lote interagido no período." />
        </UiCard>
      </div>

      <UiCard padding="md">
        <CommonAppTooltip text="Lista das sessões pertencentes a este visitante, com navegação e duração." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Sessões do Visitante</h3></CommonAppTooltip>
        <div v-if="data.sessions?.length" class="grid gap-2.5">
          <NuxtLink v-for="session in data.sessions" :key="session.id" :to="{ path: `/painel/metricas/sessoes/${session.id}`, query: { ...route.query } }" class="flex items-center justify-between gap-4 rounded-xl bg-p-base/50 px-3.5 py-3 text-inherit no-underline hover:border-blue-400/30 hover:bg-p-overlay/50 transition-colors">
            <div>
              <strong class="text-sm text-p-text">{{ session.id.slice(-8) }}</strong>
              <div class="text-xs text-p-text-muted">{{ session.projectName || '---' }} &middot; {{ session.realtorName || 'Sem corretor' }}</div>
            </div>
            <div class="grid gap-1 text-right">
              <span class="text-sm text-p-text-secondary">{{ session.pageViews }} páginas</span>
              <span class="text-xs text-p-text-muted">{{ formatDuration(session.durationSec) }}</span>
            </div>
          </NuxtLink>
        </div>
        <UiEmptyState v-else title="Nenhuma sessão disponível para este visitante." />
      </UiCard>

      <UiCard padding="md">
        <CommonAppTooltip text="Leads gerados por este visitante, independentemente da sessão em que surgiram." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Leads do Visitante</h3></CommonAppTooltip>
        <div v-if="data.leads?.length" class="grid gap-2.5">
          <div v-for="lead in data.leads" :key="lead.id" class="flex items-start justify-between gap-4 rounded-xl bg-p-base/50 px-3.5 py-3">
            <div>
              <strong class="text-sm text-p-text">{{ lead.name || 'Lead sem nome' }}</strong>
              <div class="text-xs text-p-text-muted">{{ lead.email || lead.phone || 'Sem contato' }}</div>
            </div>
            <div class="grid gap-1 text-right">
              <span class="text-sm text-p-text-secondary">{{ lead.status }}</span>
              <span class="text-xs text-p-text-muted">{{ formatDateTime(lead.createdAt) }}</span>
            </div>
          </div>
        </div>
        <UiEmptyState v-else title="Nenhum lead associado a este visitante." />
      </UiCard>

      <UiCard padding="md">
        <CommonAppTooltip text="Eventos mais recentes registrados para este visitante em todas as sessões listadas." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Eventos Recentes</h3></CommonAppTooltip>
        <div v-if="data.events?.length" class="grid gap-3">
          <div v-for="event in data.events" :key="event.id" class="grid grid-cols-[180px_1fr] gap-4 border-b border-p-border py-3 last:border-b-0 max-md:grid-cols-1">
            <div class="text-xs text-p-text-muted">{{ formatDateTime(event.timestamp) }}</div>
            <div>
              <strong class="text-sm text-p-text">{{ event.type }}</strong>
              <div class="text-sm text-p-text-secondary">{{ event.action || event.label || event.path || 'Sem descrição' }}</div>
              <div class="text-xs text-p-text-muted">Sessão {{ event.sessionId.slice(-8) }}</div>
            </div>
          </div>
        </div>
        <UiEmptyState v-else title="Nenhum evento recente encontrado." />
      </UiCard>
    </div>
  </div>
</template>
