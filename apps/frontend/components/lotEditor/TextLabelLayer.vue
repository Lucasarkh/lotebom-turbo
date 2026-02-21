<template>
  <g class="text-label-layer">
    <g
      v-for="label in labelList"
      :key="label.id"
      class="text-label-group"
      :transform="`translate(${label.position.x}, ${label.position.y}) rotate(${label.rotation || 0})`"
      @click="e => { if (activeTool === 'select') { e.stopPropagation(); emit('selectText', label.id, e) } }"
      @mousedown="e => { if (activeTool === 'select') { e.stopPropagation(); emit('startDragText', label.id, e) } }"
      @dblclick.stop="e => emit('editText', label.id)"
    >
      <!-- Selection highlight -->
      <rect
        v-if="isSelected(label.id)"
        :x="-4"
        :y="-label.fontSize - 2"
        :width="label.text.length * label.fontSize * 0.6 + 8"
        :height="label.fontSize + 8"
        fill="rgba(59, 130, 246, 0.08)"
        stroke="#3b82f6"
        stroke-width="1.5"
        stroke-dasharray="4 2"
        rx="3"
      />
      <text
        x="0"
        y="0"
        :fill="label.color"
        :font-size="label.fontSize"
        font-family="sans-serif"
        font-weight="600"
        class="text-label-content"
        style="cursor: move;"
      >
        {{ label.text }}
      </text>
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TextLabel, TextLabelId } from '../../composables/lotEditor/topology/types'

const props = defineProps<{
  labels: Map<string, TextLabel>
  selectedTargets: { type: string; id: string }[]
  activeTool: string
}>()

const emit = defineEmits<{
  selectText: [id: TextLabelId, event: MouseEvent]
  startDragText: [id: TextLabelId, event: MouseEvent]
  editText: [id: TextLabelId]
}>()

function isSelected(id: TextLabelId) {
  return props.selectedTargets.some(t => t.type === 'text' && t.id === id)
}

const labelList = computed(() => Array.from(props.labels.values()))
</script>

<style scoped>
.text-label-content {
  user-select: none;
  pointer-events: all;
}
.text-label-group:hover .text-label-content {
  filter: brightness(1.2);
}
</style>
