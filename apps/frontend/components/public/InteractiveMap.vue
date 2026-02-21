<template>
  <div ref="containerRef" class="public-map-container">
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @touchstart="onMouseDown"
      @touchmove="onMouseMove"
      @touchend="onMouseUp"
    >
      <!-- Background -->
      <v-layer>
        <v-image v-if="bgImage" :config="{ image: bgImage, x: 0, y: 0, listening: false }" />
      </v-layer>

      <!-- Elements -->
      <v-layer>
        <template v-for="el in elements" :key="el.id">
          <v-line
            v-if="el.geometryType === 'POLYGON' && el.geometryJson.points"
            :config="polygonConfig(el)"
            @click="(e) => onElementClick(e, el)"
            @tap="(e) => onElementClick(e, el)"
          />
          <v-line
            v-else-if="el.geometryType === 'POLYLINE' && el.geometryJson.points"
            :config="polylineConfig(el)"
          />
          <v-rect
            v-else-if="el.geometryType === 'RECT' && el.type !== 'LABEL'"
            :config="rectConfig(el)"
            @click="(e) => onElementClick(e, el)"
            @tap="(e) => onElementClick(e, el)"
          />
          <v-circle
            v-else-if="el.geometryType === 'CIRCLE'"
            :config="circleConfig(el)"
            @click="(e) => onElementClick(e, el)"
            @tap="(e) => onElementClick(e, el)"
          />

          <!-- Labels -->
          <v-text
            v-if="el.type === 'LABEL'"
            :config="labelTextConfig(el)"
          />
          <v-text
            v-else-if="el.code || el.name"
            :config="elementLabelConfig(el)"
          />
        </template>
      </v-layer>
    </v-stage>

    <!-- Zoom controls -->
    <div class="pub-zoom">
      <button @click="zoomIn">+</button>
      <span>{{ Math.round(scale * 100) }}%</span>
      <button @click="zoomOut">−</button>
    </div>

    <!-- Lot popup -->
    <div v-if="popupEl" class="lot-popup" :style="popupStyle">
      <button class="popup-close" @click="popupEl = null">&times;</button>
      <h4>{{ popupEl.code || popupEl.name || 'Lote' }}</h4>
      <div class="popup-badges">
        <span class="badge" :class="lotStatusBadge(popupLot?.status)">{{ lotStatusLabel(popupLot?.status) }}</span>
      </div>
      <div v-if="popupLot" class="popup-details">
        <div v-if="popupLot.areaM2" class="popup-row"><span>Área</span><strong>{{ popupLot.areaM2 }} m²</strong></div>
        <div v-if="popupLot.frontage" class="popup-row"><span>Frente</span><strong>{{ popupLot.frontage }} m</strong></div>
        <div v-if="popupLot.depth" class="popup-row"><span>Fundo</span><strong>{{ popupLot.depth }} m</strong></div>
        <div v-if="popupLot.price" class="popup-row"><span>Preço</span><strong>R$ {{ popupLot.price.toLocaleString('pt-BR') }}</strong></div>
        <div v-if="popupLot.slope && popupLot.slope !== 'FLAT'" class="popup-row"><span>Inclinação</span><strong>{{ slopeLabel(popupLot.slope) }}</strong></div>
      </div>
      <button v-if="popupLot?.status === 'AVAILABLE'" class="btn btn-primary btn-sm popup-cta" @click="$emit('interest', popupEl)">
        Tenho interesse
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface MapEl {
  id: string
  type: string
  name?: string
  code?: string
  geometryType: string
  geometryJson: any
  styleJson?: any
  lotDetails?: any
}

const props = defineProps<{
  elements: MapEl[]
  mapBaseImageUrl: string | null
}>()

const emit = defineEmits<{ interest: [el: MapEl] }>()

const containerRef = ref<HTMLElement | null>(null)
const stageRef = ref<any>(null)
const cw = ref(800)
const ch = ref(500)
const scale = ref(1)
const pos = ref({ x: 0, y: 0 })
const bgImage = ref<HTMLImageElement | null>(null)
const popupEl = ref<MapEl | null>(null)
const popupPos = ref({ x: 0, y: 0 })

/* ── Lot status helpers ───── */
const lotStatusBadge = (s?: string) => ({ AVAILABLE: 'badge-success', RESERVED: 'badge-warning', SOLD: 'badge-danger' }[s || ''] || 'badge-neutral')
const lotStatusLabel = (s?: string) => ({ AVAILABLE: 'Disponível', RESERVED: 'Reservado', SOLD: 'Vendido' }[s || ''] || 'Disponível')
const slopeLabel = (s?: string) => ({ FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive' }[s || ''] || s)

const popupLot = computed(() => popupEl.value?.lotDetails ?? null)

const popupStyle = computed(() => ({
  left: `${popupPos.value.x}px`,
  top: `${popupPos.value.y}px`,
}))

/* ── Stage config ───── */
const stageConfig = computed(() => ({
  width: cw.value,
  height: ch.value,
  scaleX: scale.value,
  scaleY: scale.value,
  x: pos.value.x,
  y: pos.value.y,
  draggable: false,
}))

/* ── Background image ───── */
watch(() => props.mapBaseImageUrl, (url) => {
  if (!url) { bgImage.value = null; return }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { bgImage.value = img }
  img.src = url
}, { immediate: true })

/* ── Element style helpers ───── */
function lotFill(el: MapEl) {
  const st = el.lotDetails?.status
  if (st === 'SOLD') return 'rgba(239,68,68,0.35)'
  if (st === 'RESERVED') return 'rgba(245,158,11,0.35)'
  return el.styleJson?.fill ?? 'rgba(34,197,94,0.2)'
}

function lotStroke(el: MapEl) {
  const st = el.lotDetails?.status
  if (st === 'SOLD') return '#ef4444'
  if (st === 'RESERVED') return '#f59e0b'
  return el.styleJson?.stroke ?? '#22c55e'
}

function isClickable(el: MapEl) {
  return el.type === 'LOT'
}

function polygonConfig(el: MapEl) {
  const s = el.styleJson ?? {}
  const isLot = el.type === 'LOT'
  return {
    points: el.geometryJson.points ?? [],
    closed: true,
    fill: isLot ? lotFill(el) : (s.fill ?? '#94a3b833'),
    stroke: isLot ? lotStroke(el) : (s.stroke ?? '#94a3b8'),
    strokeWidth: (s.strokeWidth ?? 2) / scale.value,
    opacity: s.opacity ?? 1,
    hitStrokeWidth: isLot ? 10 / scale.value : 0,
    listening: isClickable(el),
  }
}

function polylineConfig(el: MapEl) {
  const s = el.styleJson ?? {}
  return {
    points: el.geometryJson.points ?? [],
    closed: false,
    stroke: s.stroke ?? '#94a3b8',
    strokeWidth: (s.strokeWidth ?? 2) / scale.value,
    opacity: s.opacity ?? 1,
    listening: false,
  }
}

function rectConfig(el: MapEl) {
  const s = el.styleJson ?? {}
  const g = el.geometryJson
  const isLot = el.type === 'LOT'
  return {
    x: g.x ?? 0, y: g.y ?? 0,
    width: g.width ?? 100, height: g.height ?? 60,
    rotation: g.rotation ?? 0,
    fill: isLot ? lotFill(el) : (s.fill ?? '#e2e8f033'),
    stroke: isLot ? lotStroke(el) : (s.stroke ?? '#e2e8f0'),
    strokeWidth: (s.strokeWidth ?? 2) / scale.value,
    opacity: s.opacity ?? 1,
    listening: isClickable(el),
  }
}

function circleConfig(el: MapEl) {
  const s = el.styleJson ?? {}
  const g = el.geometryJson
  return {
    x: g.x ?? 0, y: g.y ?? 0,
    radius: g.radius ?? 30,
    fill: s.fill ?? '#a78bfa33',
    stroke: s.stroke ?? '#a78bfa',
    strokeWidth: (s.strokeWidth ?? 2) / scale.value,
    opacity: s.opacity ?? 1,
    listening: isClickable(el),
  }
}

function labelTextConfig(el: MapEl) {
  const s = el.styleJson ?? {}
  const g = el.geometryJson
  return {
    x: g.x ?? 0, y: g.y ?? 0,
    text: el.name || 'Rótulo',
    fontSize: s.fontSize ?? 16,
    fontFamily: s.fontFamily ?? 'Inter',
    fill: s.fontColor ?? '#1e293b',
    listening: false,
  }
}

function elementLabelConfig(el: MapEl) {
  const c = getCenter(el)
  const txt = el.code || el.name || ''
  return {
    x: c.x - txt.length * 3,
    y: c.y - 6,
    text: txt,
    fontSize: 12 / scale.value,
    fontFamily: 'Inter',
    fill: '#1e293b',
    listening: false,
  }
}

function getCenter(el: MapEl) {
  const g = el.geometryJson
  if (g.points?.length >= 4) {
    let sx = 0, sy = 0
    const n = g.points.length / 2
    for (let i = 0; i < g.points.length; i += 2) { sx += g.points[i]; sy += g.points[i + 1] }
    return { x: sx / n, y: sy / n }
  }
  return { x: g.x ?? 0, y: g.y ?? 0 }
}

/* ── Click handler ───── */
function onElementClick(e: any, el: MapEl) {
  if (!isClickable(el)) return
  e.cancelBubble = true
  popupEl.value = el
  // Position popup near the element center in screen space
  const stage = stageRef.value?.getNode()
  if (!stage) return
  const c = getCenter(el)
  const containerRect = containerRef.value?.getBoundingClientRect()
  if (!containerRect) return
  popupPos.value = {
    x: Math.min(c.x * scale.value + pos.value.x + 16, cw.value - 260),
    y: Math.max(c.y * scale.value + pos.value.y - 60, 10),
  }
}

/* ── Pan ───── */
let isPanning = false
let panStart = { x: 0, y: 0 }
let posStart = { x: 0, y: 0 }

function getClientXY(e: any): { x: number, y: number } | null {
  const evt = e.evt
  if (!evt) return null
  if (evt.touches?.length) return { x: evt.touches[0].clientX, y: evt.touches[0].clientY }
  return { x: evt.clientX, y: evt.clientY }
}

function onMouseDown(e: any) {
  const pt = getClientXY(e)
  if (!pt) return
  isPanning = true
  panStart = pt
  posStart = { ...pos.value }
}

function onMouseMove(e: any) {
  if (!isPanning) return
  const pt = getClientXY(e)
  if (!pt) return
  pos.value = { x: posStart.x + (pt.x - panStart.x), y: posStart.y + (pt.y - panStart.y) }
}

function onMouseUp() { isPanning = false }

/* ── Zoom ───── */
function onWheel(e: any) {
  e.evt.preventDefault()
  const stage = stageRef.value?.getNode()
  if (!stage) return
  const ptr = stage.getPointerPosition()
  if (!ptr) return
  const scaleBy = 1.08
  const old = scale.value
  const mpt = { x: (ptr.x - pos.value.x) / old, y: (ptr.y - pos.value.y) / old }
  const dir = e.evt.deltaY > 0 ? -1 : 1
  const nw = Math.max(0.1, Math.min(5, dir > 0 ? old * scaleBy : old / scaleBy))
  scale.value = nw
  pos.value = { x: ptr.x - mpt.x * nw, y: ptr.y - mpt.y * nw }
}

function zoomIn() { scale.value = Math.min(scale.value * 1.2, 5) }
function zoomOut() { scale.value = Math.max(scale.value / 1.2, 0.1) }

/* ── Resize ───── */
let ro: ResizeObserver | null = null
onMounted(() => {
  if (containerRef.value) {
    cw.value = containerRef.value.clientWidth
    ch.value = containerRef.value.clientHeight
    ro = new ResizeObserver(entries => {
      cw.value = entries[0].contentRect.width
      ch.value = entries[0].contentRect.height
    })
    ro.observe(containerRef.value)
  }
})
onUnmounted(() => ro?.disconnect())
</script>

<style scoped>
.public-map-container {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  cursor: grab;
  touch-action: none;
}
.public-map-container:active { cursor: grabbing; }

.pub-zoom {
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
.pub-zoom button {
  width: 28px; height: 28px; border: none; background: transparent;
  cursor: pointer; font-size: 1rem; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
}
.pub-zoom button:hover { background: var(--gray-100); }
.pub-zoom span { font-size: 0.75rem; color: var(--gray-500); min-width: 36px; text-align: center; }

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
@keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

.popup-close {
  position: absolute;
  top: 8px;
  right: 10px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--gray-400);
  line-height: 1;
}

.lot-popup h4 { margin: 0 0 var(--space-2); font-size: 1rem; color: var(--gray-800); }
.popup-badges { margin-bottom: var(--space-3); }
.popup-details { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-3); }
.popup-row { display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--gray-600); }
.popup-row strong { color: var(--gray-800); }
.popup-cta { width: 100%; }
</style>
