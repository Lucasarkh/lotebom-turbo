<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const {
  projects,
  selectedProjectId,
  startDate,
  startDateMax,
  endDate,
  endDateMin,
  endDateMax,
  fetchProjects,
  buildQueryString
} = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

const canAggregateAllProjects = computed(() => projects.value.length !== 1)
const selectedProject = computed(() => projects.value.find((project: any) => project.id === selectedProjectId.value) || null)
const selectedProjectLabel = computed(() => selectedProject.value?.name || 'todos os empreendimentos')

async function fetchPreLaunchMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/prelaunch?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de pré-lançamento')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchPreLaunchMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchPreLaunchMetrics()
})

definePageMeta({
  layout: 'painel'
})

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('pt-BR')
}

function formatPercent(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function formatHours(value: number | null | undefined) {
  const hours = Number(value || 0)
  if (!hours) return '0h'
  if (hours < 24) return `${formatPercent(hours)}h`

  const days = hours / 24
  return `${formatPercent(days)}d`
}

const summaryCards = computed(() => {
  const summary = data.value?.summary || {}

  return [
    {
      label: 'Novas entradas',
      value: formatNumber(summary.totalEntries),
      hint: `Leads que entraram na fila de preferência em ${selectedProjectLabel.value}.`,
      tone: 'rose'
    },
    {
      label: 'Fila ativa agora',
      value: formatNumber(summary.activeEntries),
      hint: 'Backlog atual ainda aguardando contato ou conversão.',
      tone: 'amber'
    },
    {
      label: 'Reservas em pré-lançamento',
      value: formatNumber(summary.totalReservations),
      hint: 'Reservas confirmadas em projetos configurados com reserva direta no pré-lançamento.',
      tone: 'gold'
    },
    {
      label: 'Contatados',
      value: `${formatNumber(summary.contactedEntries)} (${formatPercent(summary.contactRate)}%)`,
      hint: 'Entradas que já receberam devolutiva dentro do período filtrado.',
      tone: 'cyan'
    },
    {
      label: 'Convertidos',
      value: `${formatNumber(summary.convertedEntries)} (${formatPercent(summary.conversionRate)}%)`,
      hint: 'Fila que virou avanço comercial dentro do recorte.',
      tone: 'emerald'
    },
    {
      label: 'Removidos',
      value: `${formatNumber(summary.removedEntries)} (${formatPercent(summary.removalRate)}%)`,
      hint: 'Registros descartados ou encerrados fora da conversão.',
      tone: 'slate'
    },
    {
      label: 'Tempo médio até contato',
      value: formatHours(summary.avgHoursToContact),
      hint: 'Velocidade média de primeira abordagem após a entrada na fila.',
      tone: 'purple'
    },
    {
      label: 'Tempo médio até conversão',
      value: formatHours(summary.avgHoursToConversion),
      hint: 'Tempo médio do ingresso na fila até a conversão.',
      tone: 'indigo'
    },
    {
      label: 'Pressão da fila',
      value: `Pos. média ${formatPercent(summary.avgQueuePosition)} · pico ${formatNumber(summary.maxQueuePosition)}`,
      hint: 'Profundidade média e maior posição aberta no período.',
      tone: 'orange'
    }
  ]
})

const queueHealth = computed(() => {
  const summary = data.value?.summary || {}
  const meta = data.value?.meta || {}

  return [
    {
      label: 'Empreendimentos com fila ativa',
      value: formatNumber(summary.activeProjects)
    },
    {
      label: 'Reservas ativas em pré-lançamento',
      value: formatNumber(summary.activeReservations)
    },
    {
      label: 'Lotes com fila ativa',
      value: formatNumber(summary.activeLots)
    },
    {
      label: 'Projetos com histórico pré-lançamento',
      value: formatNumber(meta.preLaunchProjects)
    },
    {
      label: 'Projetos ainda com modo ativo',
      value: formatNumber(meta.enabledProjects)
    },
    {
      label: 'Projetos com reserva direta',
      value: formatNumber(meta.reservationModeProjects)
    }
  ]
})

const visibleHistory = computed(() => {
  const history = data.value?.history || []
  const firstMovementIndex = history.findIndex((item: any) => item.entries || item.reservations || item.contacted || item.converted || item.removed)

  if (firstMovementIndex === -1) return []
  return history.slice(firstMovementIndex)
})

const historyMaxValue = computed(() => {
  const history = visibleHistory.value || []
  if (!history.length) return 1

  const max = Math.max(...history.map((item: any) => Math.max(item.entries || 0, item.reservations || 0, item.contacted || 0, item.converted || 0, item.removed || 0)))
  return max > 0 ? max : 1
})

const hasHistory = computed(() => visibleHistory.value.length > 0)
</script>

<template>
  <div class="space-y-6">
    <NuxtLink to="/painel/metricas" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-p-text-muted no-underline transition-colors hover:text-p-accent">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <div class="flex flex-col items-start justify-between gap-6 lg:flex-row">
      <div>
        <p class="mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-rose-400">Pré-lançamento</p>
        <h1 class="mb-2 text-[30px] font-extrabold text-p-text">Fila de preferência</h1>
        <p class="max-w-[780px] text-base text-p-text-muted">Métricas exclusivas do acesso antecipado: entrada na fila, ritmo de contato, conversão e pressão por lote.</p>
      </div>

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
            <option v-if="canAggregateAllProjects" value="all">Todos os Projetos</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <section class="flex items-center justify-between gap-5 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/15 via-amber-500/8 to-transparent p-5 shadow-lg">
      <div>
        <strong class="mb-2 block text-sm uppercase tracking-widest text-p-text">PRÉ-LANÇAMENTO, ACESSO ANTECIPADO EXCLUSIVO</strong>
        <p class="max-w-[780px] text-sm text-p-text-secondary">Esse painel não mistura sessões, pageviews ou reservas do fluxo padrão. Aqui entram os sinais da fila de preferência e, quando configurado, as reservas feitas diretamente no pré-lançamento.</p>
      </div>

      <NuxtLink to="/painel/leads?view=prelaunch" class="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-br from-rose-500 to-orange-500 px-4.5 font-bold text-orange-50 no-underline shadow-lg shadow-rose-500/25">
        Abrir gestão da fila
      </NuxtLink>
    </section>

    <UiLoadingState v-if="loading && !data" text="Carregando métricas de pré-lançamento..." />

    <div v-else-if="data" class="space-y-6" :class="{ 'opacity-70 transition-opacity': loading }">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="card in summaryCards" :key="card.label" class="flex flex-col gap-2.5 rounded-2xl border border-p-border bg-p-elevated p-5 shadow-sm"
          :class="{
            'border-rose-500/20 bg-gradient-to-b from-rose-500/12 to-transparent': card.tone === 'rose',
            'border-amber-500/20 bg-gradient-to-b from-amber-500/12 to-transparent': card.tone === 'amber' || card.tone === 'gold' || card.tone === 'orange',
            'border-cyan-500/20 bg-gradient-to-b from-cyan-500/12 to-transparent': card.tone === 'cyan',
            'border-emerald-500/20 bg-gradient-to-b from-emerald-500/12 to-transparent': card.tone === 'emerald',
            'border-slate-400/20 bg-gradient-to-b from-slate-400/12 to-transparent': card.tone === 'slate',
            'border-indigo-400/20 bg-gradient-to-b from-indigo-500/12 to-transparent': card.tone === 'purple' || card.tone === 'indigo',
          }"
        >
          <span class="text-xs font-bold uppercase tracking-widest text-p-text-muted">{{ card.label }}</span>
          <strong class="text-2xl leading-tight text-p-text">{{ card.value }}</strong>
          <p class="text-[13px] leading-relaxed text-p-text-muted">{{ card.hint }}</p>
        </article>
      </div>

      <section class="rounded-2xl border border-p-border bg-p-elevated p-5 shadow-sm">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-p-text">Ritmo diário da fila</h2>
            <p class="mt-2 text-sm text-p-text-muted">Entradas, reservas, contatos, conversões e saídas acompanhados dia a dia para {{ selectedProjectLabel }}.</p>
          </div>
        </div>

        <div v-if="hasHistory" class="grid min-h-[260px] auto-cols-[minmax(34px,1fr)] grid-flow-col items-end gap-3">
          <div v-for="item in visibleHistory" :key="item.date" class="flex min-w-[36px] flex-col items-center gap-2.5">
            <div class="flex min-h-[220px] items-end justify-center gap-1">
              <div class="flex min-h-[220px] w-[7px] flex-col items-center justify-end gap-1.5">
                <span v-if="item.entries" class="text-[11px] text-rose-400">{{ item.entries }}</span>
                <div v-if="item.entries" class="w-full rounded-t-full bg-gradient-to-t from-rose-600 to-rose-400" :style="{ height: `${(item.entries / historyMaxValue) * 100}%` }"></div>
              </div>
              <div class="flex min-h-[220px] w-[7px] flex-col items-center justify-end gap-1.5">
                <span v-if="item.reservations" class="text-[11px] text-amber-400">{{ item.reservations }}</span>
                <div v-if="item.reservations" class="w-full rounded-t-full bg-gradient-to-t from-amber-600 to-amber-400" :style="{ height: `${(item.reservations / historyMaxValue) * 100}%` }"></div>
              </div>
              <div class="flex min-h-[220px] w-[7px] flex-col items-center justify-end gap-1.5">
                <span v-if="item.contacted" class="text-[11px] text-cyan-400">{{ item.contacted }}</span>
                <div v-if="item.contacted" class="w-full rounded-t-full bg-gradient-to-t from-cyan-600 to-cyan-400" :style="{ height: `${(item.contacted / historyMaxValue) * 100}%` }"></div>
              </div>
              <div class="flex min-h-[220px] w-[7px] flex-col items-center justify-end gap-1.5">
                <span v-if="item.converted" class="text-[11px] text-emerald-400">{{ item.converted }}</span>
                <div v-if="item.converted" class="w-full rounded-t-full bg-gradient-to-t from-emerald-600 to-emerald-400" :style="{ height: `${(item.converted / historyMaxValue) * 100}%` }"></div>
              </div>
              <div class="flex min-h-[220px] w-[7px] flex-col items-center justify-end gap-1.5">
                <span v-if="item.removed" class="text-[11px] text-slate-400">{{ item.removed }}</span>
                <div v-if="item.removed" class="w-full rounded-t-full bg-gradient-to-t from-slate-600 to-slate-400" :style="{ height: `${(item.removed / historyMaxValue) * 100}%` }"></div>
              </div>
            </div>
            <span class="text-[11px] text-p-text-muted">{{ formatDate(item.date) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-p-text-muted">Nenhum movimento de fila registrado no período.</p>

        <div class="mt-4 flex flex-wrap gap-4">
          <div class="inline-flex items-center gap-2 text-[13px] text-p-text-secondary"><span class="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-rose-600 to-rose-400"></span><strong>Entradas</strong></div>
          <div class="inline-flex items-center gap-2 text-[13px] text-p-text-secondary"><span class="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-amber-600 to-amber-400"></span><strong>Reservas</strong></div>
          <div class="inline-flex items-center gap-2 text-[13px] text-p-text-secondary"><span class="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-400"></span><strong>Contatados</strong></div>
          <div class="inline-flex items-center gap-2 text-[13px] text-p-text-secondary"><span class="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400"></span><strong>Convertidos</strong></div>
          <div class="inline-flex items-center gap-2 text-[13px] text-p-text-secondary"><span class="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-slate-600 to-slate-400"></span><strong>Removidos</strong></div>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section class="rounded-2xl border border-p-border bg-p-elevated p-5 shadow-sm">
          <div class="mb-4">
            <h2 class="text-xl font-bold text-p-text">Status atual da fila</h2>
            <p class="mt-2 text-sm text-p-text-muted">Distribuição viva do estoque de pré-lançamento.</p>
          </div>

          <div v-if="data.statusDistribution?.length" class="flex flex-col gap-3">
            <div v-for="item in data.statusDistribution" :key="item.status" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-p-border bg-p-base/40 px-4 py-3.5">
              <div>
                <strong class="text-sm text-p-text">{{ item.label }}</strong>
                <span class="mt-1 block text-[13px] text-p-text-muted">{{ formatPercent((item.count / Math.max(data.meta?.totalTrackedEntries || 1, 1)) * 100) }}% do total monitorado</span>
              </div>
              <strong class="text-p-text">{{ formatNumber(item.count) }}</strong>
            </div>
          </div>
          <p v-else class="text-sm text-p-text-muted">Sem distribuição disponível.</p>
        </section>

        <section class="rounded-2xl border border-p-border bg-p-elevated p-5 shadow-sm">
          <div class="mb-4">
            <h2 class="text-xl font-bold text-p-text">Saúde operacional</h2>
            <p class="mt-2 text-sm text-p-text-muted">Capilaridade e disponibilidade atual da fila.</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div v-for="item in queueHealth" :key="item.label" class="rounded-xl border border-p-border bg-p-base/40 px-4 py-3.5">
              <span class="block text-[13px] text-p-text-muted">{{ item.label }}</span>
              <strong class="text-2xl text-p-text">{{ item.value }}</strong>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-p-border bg-p-elevated p-5 shadow-sm lg:col-span-2">
          <div class="mb-4">
            <h2 class="text-xl font-bold text-p-text">Empreendimentos com maior pressão</h2>
            <p class="mt-2 text-sm text-p-text-muted">Entradas no período combinadas com backlog ativo atual.</p>
          </div>

          <div v-if="data.topProjects?.length" class="flex flex-col gap-2.5">
            <div class="grid grid-cols-[minmax(180px,1.8fr)_repeat(5,minmax(0,1fr))] items-center gap-3 rounded-xl border border-p-border bg-slate-800/50 px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-p-text-muted">
              <span>Empreendimento</span>
              <span>Entradas</span>
              <span>Reservas</span>
              <span>Fila ativa</span>
              <span>Contatados</span>
              <span>Convertidos</span>
            </div>
            <div v-for="item in data.topProjects" :key="item.projectId" class="grid grid-cols-[minmax(180px,1.8fr)_repeat(5,minmax(0,1fr))] items-center gap-3 rounded-xl border border-p-border bg-p-base/40 px-4 py-3.5 text-sm text-p-text-secondary">
              <span>{{ item.label }}</span>
              <span>{{ formatNumber(item.entries) }}</span>
              <span>{{ formatNumber(item.reservations) }}</span>
              <span>{{ formatNumber(item.active) }}</span>
              <span>{{ formatNumber(item.contacted) }}</span>
              <span>{{ formatNumber(item.converted) }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-p-text-muted">Sem empreendimentos com fila no período.</p>
        </section>

        <section class="rounded-2xl border border-p-border bg-p-elevated p-5 shadow-sm">
          <div class="mb-4">
            <h2 class="text-xl font-bold text-p-text">Lotes mais disputados</h2>
            <p class="mt-2 text-sm text-p-text-muted">Onde a fila está concentrando pressão comercial.</p>
          </div>

          <div v-if="data.topLots?.length" class="flex flex-col gap-3">
            <div v-for="item in data.topLots" :key="item.key" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-p-border bg-p-base/40 px-4 py-3.5">
              <div>
                <strong class="text-sm text-p-text">{{ item.label }}</strong>
                <span class="mt-1 block text-[13px] text-p-text-muted">{{ item.projectName }}</span>
              </div>
              <div class="flex flex-col items-end gap-0.5">
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.entries) }} entradas</span>
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.reservations) }} reservas</span>
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.active) }} ativos</span>
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.converted) }} convertidos</span>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-p-text-muted">Nenhum lote entrou na fila de preferência neste período.</p>
        </section>

        <section class="rounded-2xl border border-p-border bg-p-elevated p-5 shadow-sm">
          <div class="mb-4">
            <h2 class="text-xl font-bold text-p-text">Velocidade por corretor</h2>
            <p class="mt-2 text-sm text-p-text-muted">Quem está recebendo e avançando melhor a fila.</p>
          </div>

          <div v-if="data.topRealtors?.length" class="flex flex-col gap-3">
            <div v-for="item in data.topRealtors" :key="item.realtorLinkId" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-p-border bg-p-base/40 px-4 py-3.5">
              <div>
                <strong class="text-sm text-p-text">{{ item.label }}</strong>
                <span class="mt-1 block text-[13px] text-p-text-muted">{{ item.code ? `Código ${item.code}` : 'Sem código público' }}</span>
              </div>
              <div class="flex flex-col items-end gap-0.5">
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.entries) }} entradas</span>
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.reservations) }} reservas</span>
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.active) }} ativos</span>
                <span class="text-[13px] text-p-text-muted">{{ formatNumber(item.converted) }} convertidos</span>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-p-text-muted">Nenhum corretor vinculado foi encontrado nesse recorte.</p>
        </section>
      </div>
    </div>
  </div>
</template>
