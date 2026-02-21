<template>
  <g class="roundabout-layer">
    <g v-for="rab in rabList" :key="rab.id">
      <!-- Roundabout circle -->
      <circle
        :cx="rab.center.x"
        :cy="rab.center.y"
        :r="rab.radius"
        :fill="theme.roundaboutFill"
        :stroke="isSelected(rab.id) ? '#3b82f6' : theme.roundaboutStroke"
        :stroke-width="isSelected(rab.id) ? 4 : 2"
        class="roundabout-circle"
        @click="e => { if (activeTool === 'select') { e.stopPropagation(); emit('selectRoundabout', rab.id, e) } }"
        @mousedown="e => { if (activeTool === 'select') { e.stopPropagation(); emit('startDragRoundabout', rab.id, e) } }"
      />

      <!-- Inner circle (island) -->
      <circle
        :cx="rab.center.x"
        :cy="rab.center.y"
        :r="Math.max(8, rab.radius * 0.4)"
        fill="#7ab060"
        stroke="#4a8030"
        stroke-width="1"
        pointer-events="none"
      />

      <!-- Directional arrows -->
      <path
        :d="arrowPath(rab)"
        fill="none"
        stroke="#fff"
        stroke-width="1.5"
        stroke-dasharray="4 3"
        opacity="0.5"
        pointer-events="none"
      />
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Roundabout, RoundaboutId } from '../../composables/lotEditor/topology/types'
import type { ThemeColors } from '../../composables/lotEditor/themes'

const props = defineProps<{
  roundabouts: Map<string, Roundabout>
  theme: ThemeColors
  selectedTargets: { type: string, id: string }[]
  activeTool: string
}>()

const emit = defineEmits<{
  selectRoundabout: [id: RoundaboutId, event: MouseEvent]
  startDragRoundabout: [id: RoundaboutId, event: MouseEvent]
}>()

function isSelected(id: RoundaboutId) {
  return props.selectedTargets.some(t => t.type === 'roundabout' && t.id === id)
}

const rabList = computed(() => Array.from(props.roundabouts.values()))

function arrowPath(rab: Roundabout): string {
  const r = rab.radius * 0.7
  const cx = rab.center.x
  const cy = rab.center.y
  // Draw a partial circle as direction indicator
  return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
}
</script>

<style scoped>
.roundabout-circle {
  cursor: pointer;
  transition: fill 0.15s ease;
}
.roundabout-circle:hover {
  filter: brightness(1.1);
}
</style>
