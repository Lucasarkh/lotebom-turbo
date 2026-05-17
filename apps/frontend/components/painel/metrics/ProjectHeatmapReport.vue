<template>
  <div>
    <div v-if="!report?.plantMap" class="flex items-center gap-5 rounded-xl border border-p-border bg-p-base/30 p-7">
      <div class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-2xl text-blue-400">
        <i class="bi bi-image-alt" aria-hidden="true"></i>
      </div>
      <div>
        <h3 class="text-base font-semibold text-p-text">Planta indisponível</h3>
        <p class="mt-1.5 text-sm text-p-text-muted">Cadastre a planta do empreendimento para visualizar o mapa de calor sobre os lotes.</p>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
      <section class="rounded-2xl border border-p-border bg-p-base/30 p-6 shadow-md">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="mb-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-p-accent">Mapa de calor da planta</p>
            <h2 class="text-lg font-semibold text-p-text">Distribuição visual de interesse por lote</h2>
            <p class="mt-1.5 text-sm text-p-text-muted">Troque a camada para comparar volume de acessos, geração de leads, reservas e eficiência por lote.</p>
          </div>

          <div class="flex flex-wrap justify-end gap-2" role="tablist" aria-label="Camadas do mapa de calor">
            <button
              v-for="option in metricOptions"
              :key="option.value"
              type="button"
              class="rounded-full border px-3.5 py-2.5 text-[0.84rem] font-semibold transition-all hover:-translate-y-px"
              :class="selectedMetric === option.value
                ? 'border-p-accent/30 bg-p-accent/15 text-green-300'
                : 'border-p-border bg-p-base/50 text-p-text-secondary hover:border-p-accent/30'"
              @click="selectedMetric = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="mt-5 mb-5 flex items-center gap-3 text-[0.84rem] text-p-text-muted">
          <span>{{ currentMetricLabel }}</span>
          <div class="h-2.5 flex-1 rounded-full" style="background: linear-gradient(90deg, #22c55e, #facc15 48%, #ef4444);" aria-hidden="true"></div>
          <span>Mais intenso</span>
        </div>

        <div class="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <div class="flex flex-col gap-1 rounded-2xl border border-p-accent/20 bg-p-accent/10 px-3.5 py-3">
            <span class="text-[0.72rem] font-bold uppercase tracking-wider text-p-text-muted">Camada ativa</span>
            <strong class="text-sm text-p-text">{{ currentMetricLabel }}</strong>
          </div>
          <div v-if="topLots.length" class="flex flex-col gap-1 rounded-2xl border border-p-border bg-p-base/40 px-3.5 py-3">
            <span class="text-[0.72rem] font-bold uppercase tracking-wider text-p-text-muted">Ponto mais quente</span>
            <strong class="text-sm text-p-text">{{ topLots[0]?.code }}</strong>
          </div>
          <div class="flex flex-col gap-1 rounded-2xl border border-p-border bg-p-base/40 px-3.5 py-3">
            <span class="text-[0.72rem] font-bold uppercase tracking-wider text-p-text-muted">Lotes com calor</span>
            <strong class="text-sm text-p-text">{{ formatNumber(activeLots.length) }}</strong>
          </div>
          <div class="flex flex-col gap-1 rounded-2xl border border-p-border bg-blue-500/5 px-3.5 py-3">
            <span class="text-[0.72rem] font-bold uppercase tracking-wider text-p-text-muted">Como ler</span>
            <strong class="text-sm text-p-text">Passe o mouse nos focos</strong>
          </div>
        </div>

        <div class="relative min-h-[420px] overflow-hidden rounded-2xl border border-p-border bg-p-base/30">
          <div class="pointer-events-none absolute inset-x-0 top-4 z-[2] flex items-center justify-between gap-3 px-4 max-md:flex-col max-md:items-start">
            <span class="inline-flex items-center rounded-full border border-p-border bg-p-base/60 px-3 py-2 text-[0.74rem] font-extrabold uppercase tracking-wider text-green-300 backdrop-blur-xl">Mapa de Calor</span>
            <span class="inline-flex items-center rounded-full border border-p-border bg-p-base/60 px-3 py-2 text-[0.78rem] text-p-text-secondary backdrop-blur-xl">A concentração aparece diretamente sobre a planta.</span>
          </div>

          <div class="pointer-events-none absolute inset-0 z-0" style="background: radial-gradient(circle at center, rgba(16,185,129,0.05), transparent 42%), linear-gradient(180deg, rgba(2,6,23,0.12), rgba(2,6,23,0.34));" aria-hidden="true"></div>

          <img
            :src="report.plantMap.imageUrl"
            class="block h-auto min-h-[420px] w-full object-cover saturate-[0.88] brightness-[0.78] contrast-[1.05]"
            alt="Planta do empreendimento"
          />

          <svg
            class="absolute inset-0 z-[1] h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="lot-heat-blur" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="1.75" />
              </filter>
            </defs>

            <g
              v-for="hotspot in lotHotspots"
              :key="hotspot.id"
              @mouseenter="setActiveLot(hotspot.lotMetrics?.mapElementId || null)"
              @mouseleave="setActiveLot(null)"
            >
              <template v-if="hotspot.lotMetrics && metricValue(hotspot.lotMetrics) > 0">
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="glowRadius(hotspot.lotMetrics) * 1.45"
                  :fill="heatColor(hotspot.lotMetrics)"
                  :fill-opacity="0.1 + normalizedMetric(hotspot.lotMetrics) * 0.18"
                  filter="url(#lot-heat-blur)"
                />
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="glowRadius(hotspot.lotMetrics)"
                  :fill="heatColor(hotspot.lotMetrics)"
                  :fill-opacity="0.2 + normalizedMetric(hotspot.lotMetrics) * 0.24"
                  filter="url(#lot-heat-blur)"
                />
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="coreRadius(hotspot.lotMetrics)"
                  :fill="heatColor(hotspot.lotMetrics)"
                  :fill-opacity="0.35 + normalizedMetric(hotspot.lotMetrics) * 0.38"
                />
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="Math.max(0.85, coreRadius(hotspot.lotMetrics) * 0.52)"
                  fill="rgba(255,255,255,0.72)"
                  :fill-opacity="0.28 + normalizedMetric(hotspot.lotMetrics) * 0.34"
                />
              </template>

              <circle
                :cx="hotspot.x * 100"
                :cy="hotspot.y * 100"
                :r="hitRadius(hotspot.lotMetrics)"
                fill="transparent"
              />

              <circle
                :cx="hotspot.x * 100"
                :cy="hotspot.y * 100"
                :r="0.58"
                :fill="(!hotspot.lotMetrics || metricValue(hotspot.lotMetrics) === 0) ? 'rgba(148,163,184,0.68)' : (hotspot.lotMetrics?.mapElementId === activeLotId ? 'white' : 'rgba(255,255,255,0.85)')"
                stroke="rgba(15,23,42,0.8)"
                stroke-width="0.28"
                class="transition-all duration-200"
              />

              <text
                v-if="hotspot.lotMetrics && normalizedMetric(hotspot.lotMetrics) >= 0.48"
                :x="hotspot.x * 100"
                :y="hotspot.y * 100 - 1.45"
                text-anchor="middle"
                fill="rgba(255,255,255,0.94)"
                font-size="1.45"
                font-weight="700"
                paint-order="stroke"
                stroke="rgba(15,23,42,0.82)"
                stroke-width="0.55"
                letter-spacing="0.08"
              >
                {{ hotspot.lotMetrics.code }}
              </text>
            </g>
          </svg>

          <div v-if="activeLot" class="absolute z-[3] min-w-[180px] max-w-[min(280px,calc(100%-24px))] max-md:!inset-x-4 max-md:!bottom-4 max-md:!top-auto max-md:max-w-none max-md:!transform-none" :style="tooltipStyle">
            <div
              class="rounded-2xl border border-p-border p-2.5 shadow-lg backdrop-blur-xl transition-all duration-150"
              :class="isTooltipExpanded ? 'min-w-[220px] bg-p-base/95 p-3.5' : 'bg-p-base/90'"
              style="background-image: linear-gradient(135deg, rgba(16,185,129,0.06), transparent 48%);"
              @mouseenter="handleTooltipMouseEnter"
              @mouseleave="handleTooltipMouseLeave"
            >
              <div class="relative z-[1] flex items-start justify-between gap-2.5">
                <div class="min-w-0" :class="{ 'flex items-center min-h-[28px]': !tooltipPrimaryTitle(activeLot) }">
                  <span class="block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-green-300">{{ activeLot.code }}</span>
                  <strong v-if="tooltipPrimaryTitle(activeLot)" class="text-sm text-p-text">{{ tooltipPrimaryTitle(activeLot) }}</strong>
                  <p v-if="isTooltipExpanded && tooltipSecondaryText(activeLot)" class="mt-1 text-[0.78rem] text-p-text-muted">{{ tooltipSecondaryText(activeLot) }}</p>
                </div>
                <span
                  class="inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-[0.72rem] font-bold"
                  :class="{
                    'bg-green-500/15 text-green-300': activeLot.status === 'AVAILABLE',
                    'bg-yellow-500/15 text-yellow-200': activeLot.status === 'RESERVED',
                    'bg-red-500/15 text-red-300': activeLot.status === 'SOLD',
                    'bg-white/10 text-p-text-secondary': !activeLot.status || !['AVAILABLE','RESERVED','SOLD'].includes(activeLot.status)
                  }"
                >{{ statusLabel(activeLot.status) }}</span>
              </div>

              <div v-if="isTooltipExpanded" class="relative z-[1] mt-3 grid grid-cols-2 gap-2">
                <div class="rounded-xl border border-white/5 bg-p-base/30 p-2.5">
                  <span class="text-[0.72rem] text-p-text-muted">Acessos</span>
                  <strong class="mt-0.5 block text-base text-p-text">{{ formatNumber(activeLot.views) }}</strong>
                </div>
                <div class="rounded-xl border border-white/5 bg-p-base/30 p-2.5">
                  <span class="text-[0.72rem] text-p-text-muted">Leads</span>
                  <strong class="mt-0.5 block text-base text-p-text">{{ formatNumber(activeLot.leads) }}</strong>
                </div>
                <div class="rounded-xl border border-white/5 bg-p-base/30 p-2.5">
                  <span class="text-[0.72rem] text-p-text-muted">Reservas</span>
                  <strong class="mt-0.5 block text-base text-p-text">{{ formatNumber(activeLot.reservations) }}</strong>
                </div>
                <div class="rounded-xl border border-p-accent/15 bg-p-accent/10 p-2.5">
                  <span class="block whitespace-nowrap text-[0.72rem] text-p-text-muted">Conversão</span>
                  <strong class="mt-0.5 block text-base" :class="hasConversionData(activeLot) ? 'text-p-text' : 'text-[0.92rem] tracking-wider text-p-text-secondary'">{{ formatTooltipConversion(activeLot) }}</strong>
                </div>
              </div>

              <div v-else class="relative z-[1] mt-2 flex items-center justify-between gap-2 text-[0.76rem] text-p-text-secondary">
                <span>{{ formatNumber(activeLot.views) }} acessos</span>
                <i class="bi bi-arrows-angle-expand text-[0.8rem] text-blue-300" aria-hidden="true"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="flex flex-col gap-5">
        <section class="rounded-2xl border border-p-border bg-p-base/30 p-5 shadow-md">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="mb-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-p-accent">Ranking dinâmico</p>
              <h3 class="text-base font-semibold text-p-text">Lotes mais quentes</h3>
            </div>
            <span class="inline-flex items-center justify-center rounded-full bg-white/10 px-2.5 py-1.5 text-[0.72rem] font-bold text-p-text-secondary">{{ currentMetricLabel }}</span>
          </div>

          <div v-if="topLots.length" class="mt-5 flex flex-col gap-3">
            <button
              v-for="(lot, index) in topLots"
              :key="lot.mapElementId"
              type="button"
              class="grid w-full grid-cols-[36px_minmax(0,1fr)] gap-3.5 rounded-2xl border border-p-border bg-p-base/35 p-3.5 text-left transition-all hover:-translate-y-px hover:border-p-accent/20 hover:bg-p-base/50 max-md:grid-cols-1"
              :class="{ '!border-p-accent/20 !bg-p-base/50 -translate-y-px': lot.mapElementId === activeLotId }"
              @mouseenter="setActiveLot(lot.mapElementId)"
              @mouseleave="setActiveLot(null)"
            >
              <span class="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 font-bold text-blue-300">{{ index + 1 }}</span>
              <div class="min-w-0">
                <div class="flex items-start justify-between gap-2.5">
                  <div>
                    <strong class="text-sm text-p-text">{{ lot.code }}</strong>
                    <span v-if="tooltipPrimaryTitle(lot)" class="mt-0.5 block text-[0.82rem] text-p-text-muted">{{ tooltipPrimaryTitle(lot) }}</span>
                  </div>
                  <span class="shrink-0 font-bold text-p-text">{{ formatMetric(lot) }}</span>
                </div>
                <div class="mt-3 mb-2.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <span class="block h-full rounded-full" :style="{ width: `${normalizedMetric(lot) * 100}%`, background: heatColor(lot) }"></span>
                </div>
                <div class="flex flex-wrap gap-2.5 text-[0.76rem] text-p-text-muted">
                  <span>{{ formatNumber(lot.views) }} acessos</span>
                  <span>{{ formatNumber(lot.leads) }} leads</span>
                  <span>{{ formatNumber(lot.reservations) }} reservas</span>
                </div>
              </div>
            </button>
          </div>

          <div v-else class="mt-5 text-sm text-p-text-muted">
            Nenhuma atividade registrada nos lotes para o período selecionado.
          </div>
        </section>

        <section class="rounded-2xl border border-p-border bg-p-base/30 p-5 shadow-md">
          <div>
            <p class="mb-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-p-accent">Cobertura do mapa</p>
            <h3 class="text-base font-semibold text-p-text">Qualidade do espelhamento</h3>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
            <div class="flex flex-col">
              <span class="text-[0.72rem] text-p-text-muted">Lotes na planta</span>
              <strong class="mt-0.5 text-base text-p-text">{{ formatNumber(report.summary.totalPlantLots) }}</strong>
            </div>
            <div class="flex flex-col">
              <span class="text-[0.72rem] text-p-text-muted">Lotes com atividade</span>
              <strong class="mt-0.5 text-base text-p-text">{{ formatNumber(report.summary.totalTrackedLots) }}</strong>
            </div>
            <div class="flex flex-col">
              <span class="text-[0.72rem] text-p-text-muted">Atividade espelhada</span>
              <strong class="mt-0.5 text-base text-p-text">{{ formatNumber(report.summary.lotsWithHotspot) }}</strong>
            </div>
            <div class="flex flex-col">
              <span class="text-[0.72rem] text-p-text-muted">Média de acessos</span>
              <strong class="mt-0.5 text-base text-p-text">{{ report.summary.avgViewsPerTrackedLot.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) }}</strong>
            </div>
          </div>
        </section>

        <section v-if="report.unmappedLots.length" class="rounded-2xl border border-p-border bg-p-base/30 p-5 shadow-md">
          <div>
            <p class="mb-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-p-accent">Pendências</p>
            <h3 class="text-base font-semibold text-p-text">Lotes sem hotspot</h3>
          </div>

          <ul class="mt-5 flex list-none flex-col gap-2.5 p-0">
            <li v-for="item in report.unmappedLots" :key="item.label" class="flex items-center justify-between gap-3 rounded-2xl bg-p-base/50 px-3.5 py-3 text-p-text-secondary">
              <span>{{ item.label }}</span>
              <strong class="text-p-text">{{ formatNumber(item.views) }}</strong>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
type MetricMode = 'activity' | 'views' | 'leads' | 'reservations' | 'conversion'

type HeatmapLot = {
  mapElementId: string
  hotspotId: string | null
  code: string
  name: string
  x: number | null
  y: number | null
  hasHotspot: boolean
  views: number
  leads: number
  reservations: number
  status: string | null
  activityScore: number
  conversionRate: number
  label: string
  title: string
}

type HeatmapHotspot = {
  id: string
  type: string
  title: string
  x: number
  y: number
  label?: string | null
  linkType: string
  linkId?: string | null
  loteStatus?: string | null
  lotMetrics?: HeatmapLot | null
}

type HeatmapReport = {
  summary: {
    totalLotViews: number
    totalLotLeads: number
    totalReservations: number
    totalTrackedLots: number
    totalPlantLots: number
    lotsWithHotspot: number
    lotsWithoutHotspot: number
    avgViewsPerTrackedLot: number
    lotLeadConversionRate: number
  }
  plantMap: {
    imageUrl: string
    hotspots: HeatmapHotspot[]
  } | null
  lots: HeatmapLot[]
  unmappedLots: Array<{ label: string; views: number }>
}

const props = defineProps<{
  report: HeatmapReport | null
}>()

const metricOptions: Array<{ value: MetricMode; label: string }> = [
  { value: 'activity', label: 'Atividade geral' },
  { value: 'views', label: 'Acessos' },
  { value: 'leads', label: 'Leads' },
  { value: 'reservations', label: 'Reservas' },
  { value: 'conversion', label: 'Conversão' }
]

const selectedMetric = ref<MetricMode>('activity')
const activeLotId = ref<string | null>(null)
const isTooltipExpanded = ref(false)
let tooltipCloseTimer: ReturnType<typeof setTimeout> | null = null

const lotHotspots = computed(() => {
  return (props.report?.plantMap?.hotspots || []).filter(
    hotspot => hotspot.linkType === 'LOTE_PAGE' && hotspot.linkId,
  )
})

const activeLots = computed(() => {
  return (props.report?.lots || []).filter(
    lot => lot.views > 0 || lot.leads > 0 || lot.reservations > 0,
  )
})

const currentMetricLabel = computed(() => {
  return metricOptions.find(option => option.value === selectedMetric.value)?.label || 'Atividade geral'
})

function metricValue(lot: HeatmapLot, mode = selectedMetric.value) {
  switch (mode) {
    case 'views':
      return lot.views
    case 'leads':
      return lot.leads
    case 'reservations':
      return lot.reservations
    case 'conversion':
      return lot.conversionRate * 100
    default:
      return lot.activityScore
  }
}

const maxMetricValue = computed(() => {
  const values = activeLots.value.map(lot => metricValue(lot))
  return Math.max(...values, 0)
})

function normalizedMetric(lot: HeatmapLot) {
  const max = maxMetricValue.value
  if (!max) return 0
  return metricValue(lot) / max
}

function glowRadius(lot: HeatmapLot) {
  return 1.8 + normalizedMetric(lot) * 5.8
}

function coreRadius(lot: HeatmapLot) {
  return 0.9 + normalizedMetric(lot) * 2.1
}

function hitRadius(lot?: HeatmapLot | null) {
  if (!lot) return 1.5
  return Math.max(1.5, coreRadius(lot) + 0.75)
}

function heatColor(lot: HeatmapLot) {
  const intensity = normalizedMetric(lot)
  const hue = Math.round(46 - intensity * 44)
  const lightness = 62 - intensity * 14
  return `hsl(${hue} 96% ${lightness}%)`
}

const sortedLots = computed(() => {
  return [...activeLots.value].sort((left, right) => {
    const metricDelta = metricValue(right) - metricValue(left)
    if (metricDelta !== 0) return metricDelta
    if (right.activityScore !== left.activityScore) return right.activityScore - left.activityScore
    return right.views - left.views
  })
})

const topLots = computed(() => sortedLots.value.slice(0, 8))

const activeLot = computed(() => {
  if (!activeLotId.value) return null
  return props.report?.lots.find(lot => lot.mapElementId === activeLotId.value) || null
})

const tooltipStyle = computed(() => {
  if (!activeLot.value || activeLot.value.x === null || activeLot.value.y === null) {
    return { left: '24px', top: '24px' }
  }

  const left = Math.min(Math.max(activeLot.value.x * 100, 18), 82)
  const top = Math.min(Math.max(activeLot.value.y * 100, 14), 82)
  const translateX = left > 66 ? '-100%' : '0%'
  const translateY = top > 62 ? '-100%' : '0%'

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: `translate(${translateX}, ${translateY})`
  }
})

watch(
  () => props.report?.lots,
  () => {
    if (activeLotId.value && !props.report?.lots.some(lot => lot.mapElementId === activeLotId.value)) {
      activeLotId.value = null
      isTooltipExpanded.value = false
    }
  },
  { deep: true },
)

function clearTooltipCloseTimer() {
  if (tooltipCloseTimer) {
    clearTimeout(tooltipCloseTimer)
    tooltipCloseTimer = null
  }
}

function scheduleTooltipClose() {
  clearTooltipCloseTimer()
  tooltipCloseTimer = setTimeout(() => {
    activeLotId.value = null
    isTooltipExpanded.value = false
  }, 120)
}

function setActiveLot(mapElementId: string | null, expand = false) {
  if (!mapElementId) {
    scheduleTooltipClose()
    return
  }

  clearTooltipCloseTimer()
  activeLotId.value = mapElementId
  isTooltipExpanded.value = expand
}

function handleTooltipMouseEnter() {
  clearTooltipCloseTimer()
  isTooltipExpanded.value = true
}

function handleTooltipMouseLeave() {
  isTooltipExpanded.value = false
  scheduleTooltipClose()
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function normalizeLotText(value?: string | null) {
  if (!value) return null

  const normalized = value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

  return normalized || null
}

function isSameLotText(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeLotText(left)
  const normalizedRight = normalizeLotText(right)

  if (!normalizedLeft || !normalizedRight) return false
  return normalizedLeft === normalizedRight
}

function tooltipPrimaryTitle(lot: HeatmapLot) {
  const candidates = [lot.name, lot.title, lot.label]
  return candidates.find(candidate => candidate && !isSameLotText(candidate, lot.code)) || null
}

function tooltipSecondaryText(lot: HeatmapLot) {
  const primary = tooltipPrimaryTitle(lot)
  const candidates = [lot.label, lot.title, lot.name]

  return candidates.find(candidate => {
    if (!candidate) return false
    if (isSameLotText(candidate, lot.code)) return false
    if (isSameLotText(candidate, primary)) return false
    return true
  }) || null
}

function hasConversionData(lot: HeatmapLot) {
  return lot.views > 0
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function formatTooltipConversion(lot: HeatmapLot) {
  if (!hasConversionData(lot)) return 'N/D'
  return formatPercent(lot.conversionRate)
}

function formatMetric(lot: HeatmapLot) {
  if (selectedMetric.value === 'conversion') {
    return formatPercent(lot.conversionRate)
  }

  return formatNumber(metricValue(lot))
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    AVAILABLE: 'Disponível',
    RESERVED: 'Reservado',
    SOLD: 'Vendido'
  }

  if (!status) return 'Sem status'
  return labels[status] || status
}

function statusClass(status?: string | null) {
  const classes: Record<string, string> = {
    AVAILABLE: 'is-available',
    RESERVED: 'is-reserved',
    SOLD: 'is-sold'
  }

  return status ? classes[status] || '' : ''
}
</script>
