<template>
  <g class="road-layer">
    <!-- Road surface polygons (shadows first) -->
    <path
      v-for="edge in roadEdges"
      :key="'shadow-' + edge.id"
      :d="roadSurfacePath(edge)"
      :fill="theme.roadShadow"
      :transform="`translate(0, 3)`"
      opacity="0.5"
      pointer-events="none"
    />

    <!-- Road surfaces -->
    <path
      v-for="edge in roadEdges"
      :key="'road-' + edge.id"
      :d="roadSurfacePath(edge)"
      :fill="theme.roadFill"
      :stroke="isSelected(edge.id) ? '#3b82f6' : theme.roadStroke"
      :stroke-width="isSelected(edge.id) ? 3 : 1"
      class="road-path"
      :class="{ 'road-hover': hoveredEdge === edge.id }"
      @mouseenter="hoveredEdge = edge.id"
      @mouseleave="hoveredEdge = null"
      @click="e => { if (activeTool === 'select') { e.stopPropagation(); emit('selectEdge', edge.id, e) } }"
      @mousedown="e => { if (activeTool === 'select') { e.stopPropagation(); emit('startDragEdge', edge.id, e) } }"
    />

    <!-- Road joints at nodes (circles to fill gaps at corners) -->
    <circle
      v-for="node in roadNodeList"
      :key="'joint-' + node.id"
      :cx="node.position.x"
      :cy="node.position.y"
      :r="maxRoadHalfWidthAtNode(node)"
      :fill="theme.roadFill"
      pointer-events="none"
    />

    <!-- Road center dashes -->
    <path
      v-for="edge in roadEdges"
      :key="'center-' + edge.id"
      :d="centerLinePath(edge)"
      fill="none"
      stroke="#ffffff"
      stroke-width="1.5"
      stroke-dasharray="8 6"
      opacity="0.4"
      pointer-events="none"
    />

    <!-- Wall edges (thin solid lines) -->
    <path
      v-for="edge in wallEdges"
      :key="'wall-' + edge.id"
      :d="centerLinePath(edge)"
      fill="none"
      :stroke="isSelected(edge.id) ? '#3b82f6' : '#8b7355'"
      :stroke-width="Math.max(edge.width, 3)"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="road-path wall-path"
      :class="{ 'road-hover': hoveredEdge === edge.id }"
      @mouseenter="hoveredEdge = edge.id"
      @mouseleave="hoveredEdge = null"
      @click="e => { if (activeTool === 'select') { e.stopPropagation(); emit('selectEdge', edge.id, e) } }"
      @mousedown="e => { if (activeTool === 'select') { e.stopPropagation(); emit('startDragEdge', edge.id, e) } }"
    />
    <!-- Wall pattern (brick-like dashes) -->
    <path
      v-for="edge in wallEdges"
      :key="'wall-pattern-' + edge.id"
      :d="centerLinePath(edge)"
      fill="none"
      stroke="#a0906a"
      :stroke-width="Math.max(edge.width - 2, 1)"
      stroke-dasharray="4 3"
      stroke-linecap="butt"
      opacity="0.6"
      pointer-events="none"
    />
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TopoEdge, EdgeId, LoteamentoState, TopoNode } from '../../composables/lotEditor/topology/types'
import type { ThemeColors } from '../../composables/lotEditor/themes'
import { roadSurfaceFromBezier, flattenBezier } from '../../composables/lotEditor/geometry/bezier'
import { polygonToSVGPath } from '../../composables/lotEditor/geometry/polygon'

const props = defineProps<{
  edges: Map<string, TopoEdge>
  nodes: Map<string, TopoNode>
  theme: ThemeColors
  selectedTargets: { type: string, id: string }[]
  activeTool: string
}>()

const emit = defineEmits<{
  selectEdge: [id: EdgeId, event: MouseEvent]
  startDragEdge: [id: EdgeId, event: MouseEvent]
}>()

function isSelected(id: EdgeId) {
  return props.selectedTargets.some(t => t.type === 'edge' && t.id === id)
}

const hoveredEdge = ref<EdgeId | null>(null)

const edgeList = computed(() => Array.from(props.edges.values()).filter(e => e.style !== 'roundabout_internal'))
const roadEdges = computed(() => edgeList.value.filter(e => e.style !== 'wall'))
const wallEdges = computed(() => edgeList.value.filter(e => e.style === 'wall'))
const nodeList = computed(() => Array.from(props.nodes.values()).filter(n => !n.roundaboutId))
const roadNodeList = computed(() => {
  // Only show road joints for nodes connected to at least one non-wall road
  const roadNodeIds = new Set<string>()
  for (const e of roadEdges.value) {
    roadNodeIds.add(e.from)
    roadNodeIds.add(e.to)
  }
  return nodeList.value.filter(n => roadNodeIds.has(n.id))
})

/**
 * Returns half the maximum width of any road connected to this node.
 * This is used to draw an "asphalt circle" at joints to fill gaps.
 */
function maxRoadHalfWidthAtNode(node: TopoNode): number {
  let maxWidth = 0
  for (const edge of props.edges.values()) {
    if (edge.style === 'wall' || edge.style === 'roundabout_internal') continue
    if (edge.from === node.id || edge.to === node.id) {
      if (edge.width > maxWidth) maxWidth = edge.width
    }
  }
  return maxWidth / 2
}

function roadSurfacePath(edge: TopoEdge): string {
  const halfWidth = edge.width / 2
  const polygon = roadSurfaceFromBezier(edge.curve, halfWidth, 24)
  return polygonToSVGPath(polygon)
}

function centerLinePath(edge: TopoEdge): string {
  const points = flattenBezier(edge.curve, 24)
  if (points.length === 0) return ''
  const first = points[0]!
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < points.length; i++) {
    const pt = points[i]!
    d += ` L ${pt.x} ${pt.y}`
  }
  return d
}
</script>

<style scoped>
.road-hover {
  filter: brightness(1.15);
  cursor: pointer;
}
</style>
