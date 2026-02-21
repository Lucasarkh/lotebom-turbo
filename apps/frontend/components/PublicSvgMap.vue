<template>
  <div ref="containerRef" class="pub-svg-map">
    <svg
      :width="cw"
      :height="ch"
      :viewBox="`0 0 ${cw} ${ch}`"
      style="display:block"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Background -->
      <rect :width="cw" :height="ch" fill="#f1f5f9" />

      <g :transform="worldTransform">
        <!-- Road shadows -->
        <path
          v-for="edge in roadEdges"
          :key="'rs-' + edge.id"
          :d="roadPath(edge)"
          fill="rgba(0,0,0,0.1)"
          transform="translate(0,3)"
          pointer-events="none"
        />

        <!-- Road surfaces -->
        <path
          v-for="edge in roadEdges"
          :key="'r-' + edge.id"
          :d="roadPath(edge)"
          fill="#cbd5e1"
          stroke="#94a3b8"
          stroke-width="0.5"
          pointer-events="none"
        />

        <!-- Road joints (circles at nodes to fill gaps) -->
        <circle
          v-for="node in roadNodes"
          :key="'rj-' + node.id"
          :cx="node.position.x"
          :cy="node.position.y"
          :r="roadHalfWidthAt(node.id)"
          fill="#cbd5e1"
          pointer-events="none"
        />

        <!-- Road center dashes -->
        <path
          v-for="edge in roadEdges"
          :key="'rc-' + edge.id"
          :d="centerLinePath(edge)"
          fill="none"
          stroke="white"
          stroke-width="1.5"
          stroke-dasharray="8 6"
          opacity="0.5"
          pointer-events="none"
        />

        <!-- Lots -->
        <g
          v-for="lot in lotList"
          :key="lot.id"
          :style="{ cursor: String(lot.status).toLowerCase() === 'available' ? 'pointer' : 'default' }"
          @click.stop="onLotClick(lot)"
        >
          <path
            :d="lotPath(lot)"
            :fill="lotFill(lot)"
            :stroke="lotStroke(lot)"
            stroke-width="1.5"
          />
          <!-- Label -->
          <text
            :x="lotCenter(lot).x"
            :y="lotCenter(lot).y - 5"
            text-anchor="middle"
            dominant-baseline="central"
            fill="#1e293b"
            :font-size="12 / zoom"
            font-weight="600"
            pointer-events="none"
            opacity="0.85"
          >{{ lot.label }}</text>
          <!-- Status badge -->
          <g :transform="`translate(${lotCenter(lot).x}, ${lotCenter(lot).y + 11})`" pointer-events="none">
            <rect
              :x="-14" :y="-5" width="28" height="10" rx="5"
              :fill="statusBadgeColor(lot.status)"
              opacity="0.85"
            />
            <text
              x="0" y="1"
              text-anchor="middle" dominant-baseline="central"
              fill="white"
              :font-size="6 / zoom * Math.min(zoom, 1.5)"
              font-weight="700"
            >{{ statusLabel(lot.status) }}</text>
          </g>
        </g>
      </g>
    </svg>

    <!-- Zoom controls -->
    <div class="pub-map-zoom">
      <button @click="zoomIn">+</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomOut">−</button>
    </div>

    <!-- Lot popup -->
    <div v-if="popup" class="lot-popup" :style="popupStyle">
      <button class="popup-close" @click="popup = null">&times;</button>
      <h4>{{ popup.label }}</h4>
      <div class="popup-badges">
        <span class="badge" :class="statusBadgeClass(popup.status)">{{ statusLabelFull(popup.status) }}</span>
      </div>
      <div class="popup-details">
        <div v-if="popup.areaM2 > 0" class="popup-row"><span>Área</span><strong>{{ popup.areaM2 }} m²</strong></div>
        <div v-if="popup.frontageM > 0" class="popup-row"><span>Frente</span><strong>{{ popup.frontageM }} m</strong></div>
        <div v-if="popup.price" class="popup-row"><span>Preço</span><strong>R$ {{ Number(popup.price).toLocaleString('pt-BR') }}</strong></div>
      </div>
      <button
        v-if="String(popup.status).toLowerCase() === 'available'"
        class="btn btn-primary btn-sm popup-cta"
        @click="onInterest"
      >
        Tenho interesse
      </button>
      <NuxtLink
        :to="getLotUrl(popup)"
        class="btn btn-outline btn-sm popup-cta"
        style="margin-top: 8px; width: 100%; display: flex; justify-content: center;"
      >
        Ver detalhes
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { polygonToSVGPath, centroid } from '~/composables/lotEditor/geometry/polygon'
import { roadSurfaceFromBezier, flattenBezier } from '~/composables/lotEditor/geometry/bezier'

/* ── Props ─────────────────────────────────────────────── */
const props = defineProps<{
  mapData: any
}>()

const emit = defineEmits<{ interest: [lot: any] }>()

const router = useRouter()
const route = useRoute()
const tSlug = route.params.tenant
const pSlug = route.params.project
const cCode = route.query.c || ''

function getLotUrl(lot: ParsedLot) {
  const code = lot.code || lot.id
  const base = `/p/${tSlug}/${pSlug}/lote/${encodeURIComponent(code)}`
  return cCode ? `${base}?c=${cCode}` : base
}

/* ── Container size ──────────────────────────────────────── */
const containerRef = ref<HTMLElement | null>(null)
const cw = ref(800)
const ch = ref(500)

let ro: ResizeObserver | null = null
onMounted(() => {
  if (containerRef.value) {
    cw.value = containerRef.value.clientWidth || 800
    ch.value = containerRef.value.clientHeight || 500
    ro = new ResizeObserver(e => {
      cw.value = e[0]!.contentRect.width
      ch.value = e[0]!.contentRect.height
    })
    ro.observe(containerRef.value)
  }
})
onUnmounted(() => ro?.disconnect())

/* ── Parse mapData ─────────────────────────────────────── */
const PPM = 10 // pixels per meter (default from store)

interface ParsedLot {
  id: string
  label: string
  code: string
  polygon: { x: number; y: number }[]
  status: string
  area: number
  frontage: number
  price: number | null
  areaM2: number
  frontageM: number
}

interface ParsedEdge {
  id: string
  from: string
  to: string
  curve: { p0: any; cp1: any; cp2: any; p3: any }
  width: number
  style: string
}

interface ParsedNode {
  id: string
  position: { x: number; y: number }
}

const parsedData = computed<{ lots: ParsedLot[]; edges: ParsedEdge[]; nodes: ParsedNode[] }>(() => {
  if (!props.mapData) return { lots: [], edges: [], nodes: [] }
  try {
    const raw = typeof props.mapData === 'string' ? JSON.parse(props.mapData) : props.mapData
    const lots: ParsedLot[] = (raw.lots || []).map(([, l]: [string, any]) => ({
      id: l.id,
      label: l.label || 'Lote',
      code: l.code || l.label || l.id,
      polygon: l.polygon || [],
      status: l.status || 'available',
      area: l.area || 0,
      frontage: l.manualFrontage || l.frontage || 0,
      price: l.price ?? null,
      areaM2: Number(l.area) > 0 ? parseFloat((Number(l.area) / (PPM * PPM)).toFixed(1)) : 0,
      frontageM: Number(l.manualFrontage)
        ? parseFloat((Number(l.manualFrontage)).toFixed(1))
        : Number(l.frontage) > 0 ? parseFloat((Number(l.frontage) / PPM).toFixed(1)) : 0,
    }))
    const edges: ParsedEdge[] = (raw.edges || []).map(([, e]: [string, any]) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      curve: e.curve,
      width: e.width || 10,
      style: e.style || 'normal',
    }))
    const nodes: ParsedNode[] = (raw.nodes || []).map(([, n]: [string, any]) => ({
      id: n.id,
      position: n.position || { x: 0, y: 0 },
    }))
    return { lots, edges, nodes }
  } catch {
    return { lots: [], edges: [], nodes: [] }
  }
})

const lotList = computed(() => parsedData.value.lots)
const roadEdges = computed(() => parsedData.value.edges.filter(e => e.style !== 'wall' && e.style !== 'roundabout_internal'))
const roadNodes = computed(() => {
  const idsInRoads = new Set<string>()
  for (const e of roadEdges.value) { idsInRoads.add(e.from); idsInRoads.add(e.to) }
  return parsedData.value.nodes.filter(n => idsInRoads.has(n.id))
})

/* ── Pan / Zoom State ────────────────────────────────────── */
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const worldTransform = computed(() => `translate(${pan.value.x},${pan.value.y}) scale(${zoom.value})`)

/* ── Auto-fit view on data change ─────────────────────── */
watch([lotList, cw, ch], ([list, w, h]) => {
  if (list.length === 0 || w <= 0 || h <= 0) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const lot of list) {
    for (const p of lot.polygon) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!isFinite(minX)) return
  const pad = 40
  const dataW = maxX - minX + pad * 2
  const dataH = maxY - minY + pad * 2
  const scaleX = w / dataW
  const scaleY = h / dataH
  zoom.value = Math.min(scaleX, scaleY, 2)
  pan.value = {
    x: (w - dataW * zoom.value) / 2 - (minX - pad) * zoom.value,
    y: (h - dataH * zoom.value) / 2 - (minY - pad) * zoom.value,
  }
}, { immediate: true })

/* ── Pan / Zoom Actions ──────────────────────────────────── */
function zoomIn() { applyZoom(1.2, { x: cw.value / 2, y: ch.value / 2 }) }
function zoomOut() { applyZoom(1 / 1.2, { x: cw.value / 2, y: ch.value / 2 }) }

function applyZoom(factor: number, center: { x: number; y: number }) {
  const newZoom = Math.max(0.1, Math.min(8, zoom.value * factor))
  const ratio = newZoom / zoom.value
  pan.value = {
    x: center.x - (center.x - pan.value.x) * ratio,
    y: center.y - (center.y - pan.value.y) * ratio,
  }
  zoom.value = newZoom
}

function onWheel(e: WheelEvent) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  applyZoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, { x: cx, y: cy })
}

/* ── Mouse pan ─────────────────────────────────────────── */
let isPanning = false
let panStart = { x: 0, y: 0 }
let panOrigin = { x: 0, y: 0 }

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isPanning = true
  panStart = { x: e.clientX, y: e.clientY }
  panOrigin = { ...pan.value }
}
function onMouseMove(e: MouseEvent) {
  if (!isPanning) return
  pan.value = {
    x: panOrigin.x + (e.clientX - panStart.x),
    y: panOrigin.y + (e.clientY - panStart.y),
  }
}
function onMouseUp() { isPanning = false }
function onMouseLeave() { isPanning = false }

/* ── Touch pan ─────────────────────────────────────────── */
let touchStart: { x: number; y: number } | null = null
let touchPanOrigin = { x: 0, y: 0 }

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    touchStart = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
    touchPanOrigin = { ...pan.value }
  }
}
function onTouchMove(e: TouchEvent) {
  if (!touchStart || e.touches.length !== 1) return
  pan.value = {
    x: touchPanOrigin.x + (e.touches[0]!.clientX - touchStart.x),
    y: touchPanOrigin.y + (e.touches[0]!.clientY - touchStart.y),
  }
}
function onTouchEnd() { touchStart = null }

/* ── Lot rendering helpers ─────────────────────────────── */
function lotPath(lot: ParsedLot): string {
  return polygonToSVGPath(lot.polygon)
}

function lotCenter(lot: ParsedLot): { x: number; y: number } {
  return centroid(lot.polygon)
}

function lotFill(lot: ParsedLot): string {
  const st = String(lot.status).toLowerCase()
  if (st === 'sold') return 'rgba(239,68,68,0.35)'
  if (st === 'reserved') return 'rgba(245,158,11,0.35)'
  return 'rgba(34,197,94,0.2)'
}

function lotStroke(lot: ParsedLot): string {
  const st = String(lot.status).toLowerCase()
  if (st === 'sold') return '#ef4444'
  if (st === 'reserved') return '#f59e0b'
  return '#22c55e'
}

function statusBadgeColor(status: string): string {
  const st = String(status).toLowerCase()
  if (st === 'sold') return '#ef4444'
  if (st === 'reserved') return '#f59e0b'
  return '#10b981'
}

function statusBadgeClass(status: string): string {
  const st = String(status).toLowerCase()
  if (st === 'sold') return 'badge-danger'
  if (st === 'reserved') return 'badge-warning'
  return 'badge-success'
}

function statusLabel(status: string): string {
  const st = String(status).toLowerCase()
  if (st === 'sold') return 'Vend.'
  if (st === 'reserved') return 'Res.'
  return 'Disp.'
}

function statusLabelFull(status: string): string {
  const st = String(status).toLowerCase()
  if (st === 'sold') return 'Vendido'
  if (st === 'reserved') return 'Reservado'
  return 'Disponível'
}

/* ── Road rendering helpers ────────────────────────────── */
function roadPath(edge: ParsedEdge): string {
  try {
    const polygon = roadSurfaceFromBezier(edge.curve as any, edge.width / 2, 20)
    return polygonToSVGPath(polygon)
  } catch { return '' }
}

function centerLinePath(edge: ParsedEdge): string {
  try {
    const pts = flattenBezier(edge.curve as any, 20)
    if (!pts.length) return ''
    let d = `M ${pts[0]!.x} ${pts[0]!.y}`
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i]!.x} ${pts[i]!.y}`
    return d
  } catch { return '' }
}

function roadHalfWidthAt(nodeId: string): number {
  let max = 0
  for (const e of roadEdges.value) {
    if (e.from === nodeId || e.to === nodeId) {
      if (e.width > max) max = e.width
    }
  }
  return max / 2
}

/* ── Lot popup ─────────────────────────────────────────── */
interface Popup extends ParsedLot {
  screenX: number
  screenY: number
}
const popup = ref<Popup | null>(null)

const popupStyle = computed(() => {
  if (!popup.value) return {}
  const x = Math.min(popup.value.screenX + 16, cw.value - 260)
  const y = Math.max(popup.value.screenY - 60, 10)
  return { left: `${x}px`, top: `${y}px` }
})

function onLotClick(lot: ParsedLot) {
  // If clicking on already open popup lot, navigate directly
  if (popup.value?.id === lot.id) {
    router.push(getLotUrl(lot))
    return
  }
  const c = lotCenter(lot)
  const sx = c.x * zoom.value + pan.value.x
  const sy = c.y * zoom.value + pan.value.y
  popup.value = { ...lot, screenX: sx, screenY: sy }
}

function onInterest() {
  if (popup.value) {
    emit('interest', popup.value)
    popup.value = null
  }
}
</script>

<style scoped>
.pub-svg-map {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.pub-svg-map:active { cursor: grabbing; }

.pub-map-zoom {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.95);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: var(--shadow-sm);
}
.pub-map-zoom button {
  width: 28px; height: 28px; border: none; background: transparent;
  cursor: pointer; font-size: 1rem; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
}
.pub-map-zoom button:hover { background: var(--gray-100); }
.pub-map-zoom span { font-size: 0.75rem; color: var(--gray-500); min-width: 36px; text-align: center; }

.lot-popup {
  position: absolute;
  width: 240px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-4);
  z-index: 10;
  animation: popIn 0.15s ease;
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.popup-close {
  position: absolute;
  top: 8px; right: 10px;
  border: none; background: transparent;
  font-size: 1.2rem; cursor: pointer;
  color: var(--gray-400); line-height: 1;
}
.popup-close:hover { color: var(--gray-700); }

.lot-popup h4 { margin: 0 0 var(--space-2); font-size: 0.9rem; padding-right: 20px; }

.popup-badges { display: flex; gap: 4px; margin-bottom: var(--space-2); }

.popup-details { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-3); }

.popup-row {
  display: flex; justify-content: space-between;
  font-size: 0.8rem; color: var(--gray-600);
}
.popup-row strong { color: var(--gray-800); }

.popup-cta { width: 100%; justify-content: center; }
</style>
