<template>
  <g class="node-layer">
    <g
      v-for="node in nodeList"
      :key="node.id"
      :transform="`translate(${node.position.x}, ${node.position.y})`"
      class="node-group"
      @mousedown="e => { if (activeTool === 'select') { e.stopPropagation(); emit('startDragNode', node.id, e) } }"
      @click="e => { if (activeTool === 'select') { e.stopPropagation(); emit('selectNode', node.id, e) } }"
    >
      <!-- Intersection: diamond -->
      <template v-if="node.type === 'intersection'">
        <rect
          :x="-6" :y="-6" width="12" height="12"
          :transform="`rotate(45)`"
          :fill="isSelected(node.id) ? theme.nodeActive : theme.nodeDefault"
          :stroke="theme.roadStroke"
          stroke-width="2"
          class="node-shape"
        />
      </template>

      <!-- Roundabout port: small square -->
      <template v-else-if="node.type === 'roundabout_port'">
        <rect
          :x="-5" :y="-5" width="10" height="10"
          :fill="isSelected(node.id) ? theme.nodeActive : '#94a3b8'"
          :stroke="theme.roundaboutStroke"
          stroke-width="1.5"
          class="node-shape"
          rx="2"
        />
      </template>

      <!-- Endpoint: circle -->
      <template v-else>
        <circle
          r="6"
          :fill="isSelected(node.id) ? theme.nodeActive : theme.nodeDefault"
          :stroke="theme.roadStroke"
          stroke-width="2"
          class="node-shape"
        />
      </template>
    </g>

    <!-- Snap indicator -->
    <circle
      v-if="snapIndicator"
      :cx="snapIndicator.x"
      :cy="snapIndicator.y"
      r="12"
      fill="none"
      :stroke="theme.nodeSnap"
      stroke-width="2"
      stroke-dasharray="4 3"
      opacity="0.8"
      pointer-events="none"
    >
      <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
    </circle>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TopoNode, NodeId } from '../../composables/lotEditor/topology/types'
import type { Vec2 } from '../../composables/lotEditor/geometry/types'
import type { ThemeColors } from '../../composables/lotEditor/themes'

const props = defineProps<{
  nodes: Map<string, TopoNode>
  theme: ThemeColors
  selectedTargets: { type: string, id: string }[]
  activeTool: string
  snapIndicator: Vec2 | null
}>()

const emit = defineEmits<{
  selectNode: [id: NodeId, event: MouseEvent]
  startDragNode: [id: NodeId, event: MouseEvent]
}>()

const nodeList = computed(() => Array.from(props.nodes.values()))

function isSelected(id: NodeId): boolean {
  return props.selectedTargets.some(t => t.type === 'node' && t.id === id)
}
</script>

<style scoped>
.node-group {
  cursor: grab;
}
.node-group:active {
  cursor: grabbing;
}
.node-shape {
  transition: fill 0.15s ease;
}
.node-group:hover .node-shape {
  filter: brightness(0.9);
}
</style>
