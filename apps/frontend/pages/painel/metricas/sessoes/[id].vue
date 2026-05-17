<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

const pageJourney = computed(() => {
  if (!data.value?.events?.length) return []

  const pageViewEvents = data.value.events.filter((event: any) => event.type === 'PAGE_VIEW')

  return pageViewEvents.map((event: any, index: number) => ({
    id: event.id,
    step: index + 1,
    title: event.label || event.path || 'Página sem identificação',
    path: event.path || null,
    timestamp: event.timestamp
  }))
})

const activitySummary = computed(() => {
  if (!data.value?.events?.length) return []

  const counts = new Map<string, number>()

  for (const event of data.value.events) {
    const key =
      event.type === 'PAGE_VIEW'
        ? 'Visualizações de página'
        : event.category === 'LOT'
          ? 'Interações com lotes'
          : event.category === 'WHATSAPP'
            ? 'Cliques em WhatsApp'
            : event.type === 'LEAD_SUBMIT'
              ? 'Conversões em lead'
              : event.category === 'REALTOR_LINK'
                ? 'Cliques em corretor'
                : event.category === 'MAP_TOOL'
                  ? 'Uso de ferramentas'
                  : 'Outras ações'

    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
})

async function fetchSession() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/report/sessions/${route.params.id}?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar detalhe da sessão')
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

function formatEventType(event: any) {
  if (event.type === 'PAGE_VIEW') return 'Página vista'
  if (event.type === 'LEAD_SUBMIT') return 'Lead enviado'
  if (event.category === 'LOT') return 'Interação com lote'
  if (event.category === 'WHATSAPP') return 'Clique em WhatsApp'
  if (event.category === 'REALTOR_LINK') return 'Clique em corretor'
  if (event.category === 'MAP_TOOL') return 'Uso de ferramenta'
  return event.type || 'Evento'
}

watch([selectedProjectId, startDate, endDate], fetchSession)

onMounted(async () => {
  await fetchProjects()
  fetchSession()
})

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div class="space-y-6">
    <NuxtLink :to="{ path: '/painel/metricas/sessoes', query: { ...route.query } }" class="inline-flex items-center gap-2 text-sm font-medium text-p-text-muted hover:text-p-accent transition-colors">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Sessões
    </NuxtLink>

    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-p-text">Detalhe da Sessão</h1>
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

    <UiLoadingState v-if="loading && !data" text="Carregando sessão..." />

    <div v-else-if="data" class="space-y-6" :class="{ 'opacity-60': loading }">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCard padding="md">
          <CommonAppTooltip text="Tempo total observado entre o primeiro e o último sinal real de atividade desta sessão. Retornos após inatividade longa abrem uma nova sessão, em vez de esticar esta." position="bottom"><span class="text-xs text-p-text-muted">Duração</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-blue-400">{{ formatDuration(data.summary.durationSec) }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Quantidade de visualizações de páginas dentro desta sessão." position="bottom"><span class="text-xs text-p-text-muted">Páginas</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-cyan-400">{{ data.summary.pageViews }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Leads gerados durante esta sessão específica." position="bottom"><span class="text-xs text-p-text-muted">Leads</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-emerald-400">{{ data.summary.totalLeads }}</span>
        </UiCard>
        <UiCard padding="md">
          <CommonAppTooltip text="Quantidade de sessões associadas ao mesmo visitante persistente desta sessão." position="bottom"><span class="text-xs text-p-text-muted">Visitante</span></CommonAppTooltip>
          <span class="mt-2 block text-2xl font-extrabold text-indigo-400">{{ data.summary.visitorSessions || 1 }} sessões</span>
          <NuxtLink v-if="data.summary.visitorId" :to="{ path: `/painel/metricas/visitantes/${data.summary.visitorId}`, query: { ...route.query } }" class="mt-2 inline-flex text-[13px] font-semibold text-blue-300 hover:text-blue-200 transition-colors">
            Ver visitante consolidado
          </NuxtLink>
        </UiCard>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <UiCard padding="md">
          <CommonAppTooltip text="Resumo contextual da sessão: atribuição, origem, landing e janela temporal." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Resumo</h3></CommonAppTooltip>
          <dl class="grid gap-3">
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Projeto</dt><dd class="text-right text-sm text-p-text">{{ data.summary.projectName || '---' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Corretor</dt><dd class="text-right text-sm text-p-text">{{ data.summary.realtorName || '---' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Origem</dt><dd class="text-right text-sm text-p-text">{{ data.summary.utmSource || '(Direto)' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Campanha</dt><dd class="text-right text-sm text-p-text">{{ data.summary.utmCampaign || '(Nenhuma)' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Landing</dt><dd class="text-right text-sm text-p-text">{{ data.summary.landingPage || '---' }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Entrada</dt><dd class="text-right text-sm text-p-text">{{ formatDateTime(data.summary.firstSeenAt) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-xs text-p-text-muted">Última atividade</dt><dd class="text-right text-sm text-p-text">{{ formatDateTime(data.summary.lastSeenAt) }}</dd></div>
          </dl>
        </UiCard>

        <UiCard padding="md">
          <CommonAppTooltip text="Ranking dos lotes com os quais o visitante interagiu durante esta sessão." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Lotes Interagidos</h3></CommonAppTooltip>
          <div v-if="data.lots?.length" class="grid gap-2.5">
            <div v-for="lot in data.lots" :key="lot.label" class="flex items-center justify-between gap-4 rounded-xl bg-p-base/50 px-3.5 py-3">
              <span class="text-sm text-p-text-secondary">{{ lot.label }}</span>
              <strong class="text-sm text-p-text">{{ lot.count }}</strong>
            </div>
          </div>
          <UiEmptyState v-else title="Nenhum lote interagido nesta sessão." />
        </UiCard>

        <UiCard padding="md">
          <CommonAppTooltip text="Resumo do comportamento desta visita, agrupando os principais tipos de interação observados." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Atividade Geral</h3></CommonAppTooltip>
          <div v-if="activitySummary.length" class="grid gap-2.5">
            <div v-for="activity in activitySummary" :key="activity.label" class="flex items-center justify-between gap-4 rounded-xl bg-p-base/50 px-3.5 py-3">
              <span class="text-sm text-p-text-secondary">{{ activity.label }}</span>
              <strong class="text-sm text-p-text">{{ activity.count }}</strong>
            </div>
          </div>
          <UiEmptyState v-else title="Nenhuma atividade resumida disponível." />
        </UiCard>
      </div>

      <UiCard padding="md">
        <CommonAppTooltip text="Ordem exata das páginas vistas nesta sessão, facilitando a leitura do percurso do visitante." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Páginas Percorridas</h3></CommonAppTooltip>
        <div v-if="pageJourney.length" class="grid gap-2.5">
          <div v-for="pg in pageJourney" :key="pg.id" class="grid grid-cols-[40px_1fr_180px] items-center gap-3.5 rounded-xl bg-p-base/50 px-3.5 py-3 max-md:grid-cols-1">
            <div class="grid h-10 w-10 place-items-center rounded-full bg-cyan-500/15 font-extrabold text-cyan-300">{{ pg.step }}</div>
            <div class="min-w-0">
              <strong class="text-sm text-p-text">{{ pg.title }}</strong>
              <div class="text-xs text-p-text-muted">{{ pg.path || 'Sem rota registrada' }}</div>
            </div>
            <div class="text-xs text-p-text-muted max-md:text-left md:text-right">{{ formatDateTime(pg.timestamp) }}</div>
          </div>
        </div>
        <UiEmptyState v-else title="Nenhuma página percorrida registrada nesta sessão." />
      </UiCard>

      <UiCard padding="md">
        <CommonAppTooltip text="Leads efetivamente gerados nesta sessão, com status e momento de criação." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Leads da Sessão</h3></CommonAppTooltip>
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
        <UiEmptyState v-else title="Nenhum lead associado a esta sessão." />
      </UiCard>

      <UiCard padding="md">
        <CommonAppTooltip text="Sequência cronológica dos eventos registrados ao longo da sessão." position="bottom"><h3 class="text-base font-semibold text-p-text mb-4">Linha do Tempo</h3></CommonAppTooltip>
        <div v-if="data.events?.length" class="grid gap-3">
          <div v-for="event in data.events" :key="event.id" class="grid grid-cols-[180px_1fr] gap-4 border-b border-p-border py-3 last:border-b-0 max-md:grid-cols-1">
            <div class="text-xs text-p-text-muted">{{ formatDateTime(event.timestamp) }}</div>
            <div>
              <strong class="text-sm text-p-text">{{ formatEventType(event) }}</strong>
              <div class="text-sm text-p-text-secondary">{{ event.action || event.label || event.path || 'Sem descrição' }}</div>
              <div class="text-xs text-p-text-muted">{{ event.path || event.category || 'geral' }}</div>
            </div>
          </div>
        </div>
        <UiEmptyState v-else title="Nenhum evento registrado nesta sessão." />
      </UiCard>
    </div>
  </div>
</template>
