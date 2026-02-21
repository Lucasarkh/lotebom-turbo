<template>
  <g class="lot-layer">
    <g
      v-for="lot in lotList"
      :key="lot.id"
      class="lot-group"
      @mouseenter="hoveredLot = lot.id"
      @mouseleave="hoveredLot = null"
      @click.stop="emit('selectLot', lot.id, $event)"
      @mousedown.stop="onLotMouseDown($event, lot.id)"
    >
      <!-- Lot fill -->
      <path
        :d="lotPath(lot)"
        :fill="lotFill(lot)"
        :stroke="lotStroke(lot)"
        stroke-width="1.5"
        :filter="isSelected(lot.id) ? 'url(#selectedGlow)' : undefined"
        class="lot-shape"
      />

      <!-- Hover overlay -->
      <path
        v-if="hoveredLot === lot.id && !isSelected(lot.id)"
        :d="lotPath(lot)"
        :fill="theme.lotHover"
        pointer-events="none"
      />

      <!-- Lot inner border for 2.5D effect -->
      <path
        :d="insetLotPath(lot)"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        stroke-width="0.5"
        pointer-events="none"
      />

      <!-- Lot label -->
      <text
        :x="lotCenter(lot).x"
        :y="lotCenter(lot).y - 6"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="theme.lotText"
        font-size="10"
        font-weight="600"
        pointer-events="none"
        opacity="0.8"
      >
        {{ lot.label }}
      </text>

      <!-- Area label -->
      <text
        :x="lotCenter(lot).x"
        :y="lotCenter(lot).y + 8"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="theme.lotText"
        font-size="8"
        pointer-events="none"
        opacity="0.5"
      >
        {{ formatArea(lot.area) }}
      </text>

      <!-- Status badge -->
      <g :transform="`translate(${lotCenter(lot).x}, ${lotCenter(lot).y + 20})`" pointer-events="none">
        <rect
          :x="-16" :y="-6" width="32" height="12" rx="6"
          :fill="statusBadgeColor(lot.status)"
          opacity="0.8"
        />
        <text
          x="0" y="1" text-anchor="middle" dominant-baseline="central"
          fill="#fff" font-size="6" font-weight="700"
        >
          {{ statusLabel(lot.status) }}
        </text>
      </g>

      <!-- Vertex Handles (Editable) -->
      <g v-if="isSelected(lot.id)">
        <!-- Edge midpoint add-vertex indicators -->
        <g
          v-for="(p, i) in lot.polygon"
          :key="'mid-' + i"
        >
          <circle
            :cx="edgeMid(lot, i).x"
            :cy="edgeMid(lot, i).y"
            r="5"
            fill="rgba(255,255,255,0.7)"
            stroke="#3b82f6"
            stroke-width="1.5"
            stroke-dasharray="2 1"
            class="midpoint-handle"
            title="Clique para adicionar ponto"
            @mousedown.stop
            @click.stop="emit('addVertex', lot.id, i)"
          />
          <text
            :x="edgeMid(lot, i).x" :y="edgeMid(lot, i).y + 0.5"
            text-anchor="middle" dominant-baseline="central"
            fill="#2563eb" font-size="8" font-weight="700"
            pointer-events="none"
          >+</text>
        </g>

        <!-- Vertex circles -->
        <circle
          v-for="(p, i) in lot.polygon"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="5"
          :fill="activeVertexIndex === i ? '#f59e0b' : '#4ade80'"
          :stroke="activeVertexIndex === i ? '#92400e' : '#fff'"
          stroke-width="1.5"
          class="vertex-handle"
          title="Arrastar para mover"
          @mousedown="onVertexMouseDown($event, i, lot.id)"
          @contextmenu.prevent.stop
        />
      </g>
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Lot, LotId, LotStatus } from '../../composables/lotEditor/topology/types'
import type { Vec2 } from '../../composables/lotEditor/geometry/types'
import type { ThemeColors } from '../../composables/lotEditor/themes'
import { polygonToSVGPath, centroid, insetPolygon } from '../../composables/lotEditor/geometry/polygon'

const props = defineProps<{
  lots: Map<string, Lot>
  theme: ThemeColors
  selectedTargets: { type: string, id: string }[]
  pixelsPerMeter: number
  activeVertexIndex?: number | null
}>()

const emit = defineEmits<{
  selectLot: [id: LotId, event: MouseEvent]
  dragLotVertex: [lotId: LotId, vertexIndex: number]
  dragLot: [lotId: LotId, event: MouseEvent]
  addVertex: [lotId: LotId, afterIndex: number]
}>()

function onVertexMouseDown(e: MouseEvent, index: number, lotId: LotId) {
  if (e.button !== 0) return  // only left-click drags
  e.stopPropagation()
  emit('dragLotVertex', lotId, index)
}

function edgeMid(lot: Lot, i: number): { x: number; y: number } {
  const n = lot.polygon.length
  const a = lot.polygon[i]!
  const b = lot.polygon[(i + 1) % n]!
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function onLotMouseDown(e: MouseEvent, lotId: LotId) {
  // Only initiate drag from the lot body (not vertex handles)
  if ((e.target as HTMLElement)?.closest('.vertex-handle')) return
  emit('dragLot', lotId, e)
}

const hoveredLot = ref<LotId | null>(null)

const lotList = computed(() => Array.from(props.lots.values()))

function lotPath(lot: Lot): string {
  return polygonToSVGPath(lot.polygon)
}

function insetLotPath(lot: Lot): string {
  const inset = insetPolygon(lot.polygon, 3)
  return polygonToSVGPath(inset)
}

function lotCenter(lot: Lot): Vec2 {
  return centroid(lot.polygon)
}

function lotFill(lot: Lot): string {
  if (isSelected(lot.id)) return props.theme.lotSelected
  switch (lot.status) {
    case 'available': return props.theme.lotAvailable
    case 'reserved': return props.theme.lotReserved
    case 'sold': return props.theme.lotSold
    default: return props.theme.lotAvailable
  }
}

function lotStroke(lot: Lot): string {
  if (isSelected(lot.id)) return '#3b82f6'
  switch (lot.status) {
    case 'available': return props.theme.lotAvailableStroke
    case 'reserved': return props.theme.lotReservedStroke
    case 'sold': return props.theme.lotSoldStroke
    default: return props.theme.lotAvailableStroke
  }
}

function isSelected(id: LotId): boolean {
  return props.selectedTargets.some(t => t.type === 'lot' && t.id === id)
}

function formatArea(areaPx: number): string {
  const ppm = props.pixelsPerMeter || 10
  const m2 = areaPx / (ppm * ppm)
  return isNaN(m2) ? '???' : `${m2.toFixed(2)} m²`
}

function statusBadgeColor(status: LotStatus): string {
  switch (status) {
    case 'available': return '#10b981'
    case 'reserved': return '#f59e0b'
    case 'sold': return '#ef4444'
    default: return '#64748b'
  }
}

function statusLabel(status: LotStatus): string {
  switch (status) {
    case 'available': return 'Disp.'
    case 'reserved': return 'Res.'
    case 'sold': return 'Vend.'
    default: return ''
  }
}
</script>

<style scoped>
.lot-shape {
  cursor: grab;
  transition: fill 0.15s ease, stroke 0.15s ease;
}
.lot-shape:active {
  cursor: grabbing;
}

.vertex-handle {
  cursor: grab;
}
.vertex-handle:hover {
  fill: #ef4444;
}
.vertex-handle:active {
  cursor: grabbing;
}

.midpoint-handle {
  cursor: crosshair;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.midpoint-handle:hover {
  opacity: 1;
}

.delete-vertex-btn {
  cursor: pointer;
}
.delete-vertex-btn:hover circle {
  fill: #b91c1c;
}
</style>
