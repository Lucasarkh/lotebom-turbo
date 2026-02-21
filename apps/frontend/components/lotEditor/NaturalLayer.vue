<template>
  <g class="natural-layer">
    <g
      v-for="el in elementList"
      :key="el.id"
      class="natural-group"
      @click="e => { if (activeTool === 'select') { e.stopPropagation(); emit('selectNatural', el.id, e) } }"
      @mousedown="e => { if (activeTool === 'select') { e.stopPropagation(); emit('startDragNatural', el.id, e) } }"
    >
      <!-- Lake -->
      <template v-if="el.kind === 'lake'">
        <path
          :d="smoothPath(el)"
          fill="url(#lakeGradient)"
          :stroke="isSelected(el.id) ? '#3b82f6' : theme.lakeStroke"
          :stroke-width="isSelected(el.id) ? 4 : 2"
          class="natural-shape"
        />
        <!-- Water ripple effect -->
        <path
          :d="innerPath(el, 8)"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          stroke-width="1"
          pointer-events="none"
        />
        <path
          :d="innerPath(el, 16)"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          stroke-width="0.5"
          pointer-events="none"
        />
      </template>

      <!-- Green area -->
      <template v-else-if="el.kind === 'green_area'">
        <path
          :d="smoothPath(el)"
          fill="url(#greenPattern)"
          :stroke="isSelected(el.id) ? '#3b82f6' : theme.greenStroke"
          :stroke-width="isSelected(el.id) ? 3 : 1.5"
          class="natural-shape"
        />
      </template>

      <!-- Institutional -->
      <template v-else>
        <path
          :d="smoothPath(el)"
          :fill="theme.institutionalFill"
          :stroke="isSelected(el.id) ? '#3b82f6' : theme.institutionalStroke"
          :stroke-width="isSelected(el.id) ? 3 : 1.5"
          class="natural-shape"
        />
        <!-- Hatching -->
        <path
          :d="smoothPath(el)"
          fill="url(#greenPattern)"
          opacity="0.15"
          pointer-events="none"
        />
      </template>

      <!-- Label -->
      <text
        :x="elCenter(el).x"
        :y="elCenter(el).y"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="theme.labelColor"
        font-size="12"
        font-weight="600"
        opacity="0.7"
        pointer-events="none"
      >
        {{ el.label }}
      </text>
    </g>

    <!-- Drawing preview -->
    <path
      v-if="drawingPoints.length >= 2"
      :d="drawingPath"
      fill="rgba(37,99,235,0.1)"
      stroke="#2563eb"
      stroke-width="2"
      stroke-dasharray="6 4"
      pointer-events="none"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NaturalElement, NaturalElementId } from '../../composables/lotEditor/topology/types'
import type { Vec2 } from '../../composables/lotEditor/geometry/types'
import type { ThemeColors } from '../../composables/lotEditor/themes'
import { smoothPolygon, polygonToSVGPath, centroid, insetPolygon } from '../../composables/lotEditor/geometry/polygon'

const props = defineProps<{
  elements: Map<string, NaturalElement>
  drawingPoints: Vec2[]
  theme: ThemeColors
  selectedTargets: { type: string, id: string }[]
  activeTool: string
}>()

const emit = defineEmits<{
  selectNatural: [id: NaturalElementId, event: MouseEvent]
  startDragNatural: [id: NaturalElementId, event: MouseEvent]
}>()

function isSelected(id: NaturalElementId) {
  return props.selectedTargets.some(t => t.type === 'natural' && t.id === id)
}

const elementList = computed(() => Array.from(props.elements.values()))

function smoothPath(el: NaturalElement): string {
  const smooth = smoothPolygon(el.polygon, 2)
  return polygonToSVGPath(smooth)
}

function innerPath(el: NaturalElement, insetDist: number): string {
  const smooth = smoothPolygon(el.polygon, 2)
  const inset = insetPolygon(smooth, insetDist)
  return polygonToSVGPath(inset)
}

function elCenter(el: NaturalElement): Vec2 {
  return centroid(el.polygon)
}

const drawingPath = computed(() => {
  if (props.drawingPoints.length < 2) return ''
  return polygonToSVGPath(props.drawingPoints, props.drawingPoints.length >= 3)
})
</script>

<style scoped>
.natural-shape {
  cursor: pointer;
  transition: filter 0.15s ease;
}
.natural-shape:hover {
  filter: brightness(1.08);
}
</style>
