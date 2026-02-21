<template>
  <g class="bezier-handles" v-if="edge">
    <!-- Line from p0 to cp1 -->
    <line
      :x1="edge.curve.p0.x" :y1="edge.curve.p0.y"
      :x2="edge.curve.cp1.x" :y2="edge.curve.cp1.y"
      stroke="#2563eb" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"
    />
    <!-- Line from p3 to cp2 -->
    <line
      :x1="edge.curve.p3.x" :y1="edge.curve.p3.y"
      :x2="edge.curve.cp2.x" :y2="edge.curve.cp2.y"
      stroke="#2563eb" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"
    />

    <!-- CP1 handle -->
    <circle
      :cx="edge.curve.cp1.x" :cy="edge.curve.cp1.y"
      r="8"
      fill="#2563eb"
      stroke="#fff"
      stroke-width="2"
      class="handle"
      @mousedown.stop="startDrag(1, $event)"
    />

    <!-- CP2 handle -->
    <circle
      :cx="edge.curve.cp2.x" :cy="edge.curve.cp2.y"
      r="8"
      fill="#2563eb"
      stroke="#fff"
      stroke-width="2"
      class="handle"
      @mousedown.stop="startDrag(2, $event)"
    />
  </g>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TopoEdge, EdgeId } from '../../composables/lotEditor/topology/types'

const props = defineProps<{
  edge: TopoEdge | null
}>()

const emit = defineEmits<{
  dragHandle: [edgeId: EdgeId, handleIndex: 1 | 2, dx: number, dy: number]
  dragEnd: []
}>()

const dragging = ref<{ handleIndex: 1 | 2; startX: number; startY: number } | null>(null)

function startDrag(handleIndex: 1 | 2, event: MouseEvent) {
  if (!props.edge) return
  dragging.value = { handleIndex, startX: event.clientX, startY: event.clientY }

  const onMove = (e: MouseEvent) => {
    if (!dragging.value || !props.edge) return
    const dx = e.clientX - dragging.value.startX
    const dy = e.clientY - dragging.value.startY
    dragging.value.startX = e.clientX
    dragging.value.startY = e.clientY
    emit('dragHandle', props.edge.id, dragging.value.handleIndex, dx, dy)
  }

  const onUp = () => {
    dragging.value = null
    emit('dragEnd')
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.handle {
  cursor: grab;
  transition: r 0.15s ease;
}
.handle:hover {
  r: 10;
}
.handle:active {
  cursor: grabbing;
}
</style>
