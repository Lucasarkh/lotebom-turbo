<template>
  <g v-if="block && block.grid" class="grid-layer">
    <!-- Row Lines (Depths) -->
    <g v-for="(depth, idx) in block.grid.depths" :key="'row-' + idx">
      <path
        :d="rowPath(idx + 1)"
        fill="none"
        stroke="#3b82f6"
        stroke-width="2"
        stroke-dasharray="4 2"
        class="grid-line depth-line"
        @mousedown.stop="onDepthMouseDown($event, idx)"
      />
      <!-- Handle for dragging -->
      <circle
        v-if="rowHandlePos(idx + 1)"
        :cx="rowHandlePos(idx + 1)!.x"
        :cy="rowHandlePos(idx + 1)!.y"
        r="5"
        fill="#3b82f6"
        stroke="#fff"
        stroke-width="1.5"
        class="grid-handle"
        @mousedown.stop="onDepthMouseDown($event, idx)"
      />
    </g>

    <!-- Column lines are harder to drag as a whole if they are non-parallel, 
         but we can show them for feedback. -->
    <g v-for="c in block.grid.numCols - 1" :key="'col-' + c">
      <path
        :d="colPath(c)"
        fill="none"
        stroke="#3b82f6"
        stroke-width="1"
        opacity="0.4"
        pointer-events="none"
      />
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Block, BlockId } from '~/composables/lotEditor/topology/types'
import type { Vec2 } from '~/composables/lotEditor/geometry/types'
import { sub, add, scale, normalize, perpCW, dist, lerp } from '~/composables/lotEditor/geometry/vec2'
import { polygonToSVGPath } from '~/composables/lotEditor/geometry/polygon'
import { pointInPolygon } from '~/composables/lotEditor/geometry/polygon'

const props = defineProps<{
  block: Block | null
  pixelsPerMeter: number
}>()

const emit = defineEmits<{
  dragDepth: [index: number, startPos: Vec2]
}>()

function onDepthMouseDown(e: MouseEvent, index: number) {
  emit('dragDepth', index, { x: e.clientX, y: e.clientY })
}

const frontSide = computed(() => {
  if (!props.block?.grid || !props.block.sides) return []
  return props.block.sides[props.block.grid.frontSideIndex] || []
})

const cumDists = computed(() => {
  const d: number[] = [0]
  const side = frontSide.value
  for (let i = 0; i < side.length - 1; i++) {
    d.push((d[d.length - 1] ?? 0) + dist(side[i]!, side[i+1]!))
  }
  return d
})

function getPointAtDist(d: number, offset: number): Vec2 {
  const side = frontSide.value
  const cd = cumDists.value
  if (side.length < 2) return { x: 0, y: 0 }
  
  let i = 0
  while (i < cd.length - 2 && cd[i+1]! < d) i++
  const segLen = cd[i+1]! - cd[i]!
  const t = segLen > 0 ? (d - cd[i]!) / segLen : 0
  
  const p1 = side[i]!
  const p2 = side[i+1]!
  const pt = lerp(p1, p2, t)
  
  const segVec = normalize(sub(p2, p1))
  let n = perpCW(segVec)
  
  // Normal direction check (inward)
  const testPt = add(pt, scale(n, 1.0))
  if (!pointInPolygon(testPt, props.block!.polygon)) {
    n = scale(n, -1)
  }
  
  return add(pt, scale(n, offset))
}

function rowPath(rowIdx: number): string {
  if (!props.block?.grid) return ''
  const ppm = props.pixelsPerMeter
  let depth = 0
  for (let i = 0; i < rowIdx; i++) depth += props.block.grid.depths[i]! * ppm

  const points: Vec2[] = []
  const totalLen = cumDists.value[cumDists.value.length - 1] || 0
  const steps = 20
  for (let s = 0; s <= steps; s++) {
    points.push(getPointAtDist((s / steps) * totalLen, depth))
  }
  
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function rowHandlePos(rowIdx: number): Vec2 | null {
  if (!props.block?.grid) return null
  const ppm = props.pixelsPerMeter
  let depth = 0
  for (let i = 0; i < rowIdx; i++) depth += props.block.grid.depths[i]! * ppm
  const totalLen = cumDists.value[cumDists.value.length - 1] || 0
  return getPointAtDist(totalLen * 0.5, depth)
}

function colPath(colIdx: number): string {
  if (!props.block?.grid) return ''
  const ppm = props.pixelsPerMeter
  const frontage = props.block.grid.frontage * ppm
  const d = colIdx * frontage
  const totalDepth = props.block.grid.depths.reduce((a, b) => a + b, 0) * ppm

  const pStart = getPointAtDist(d, 0)
  const pEnd = getPointAtDist(d, totalDepth)
  
  return `M ${pStart.x} ${pStart.y} L ${pEnd.x} ${pEnd.y}`
}
</script>

<style scoped>
.grid-line {
  cursor: ns-resize;
  transition: stroke-width 0.2s;
}
.grid-line:hover {
  stroke-width: 4;
}
.grid-handle {
  cursor: ns-resize;
}
.grid-handle:hover {
  r: 7;
}
</style>
