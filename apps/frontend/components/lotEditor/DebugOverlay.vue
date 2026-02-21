<template>
  <!-- Debug overlay: only rendered when showDebug is true -->
  <g v-if="showDebug && block" class="debug-overlay" pointer-events="none" opacity="0.7">

    <!-- 1) Block perimeter (thick red dashed) -->
    <path
      :d="blockPath"
      fill="none"
      stroke="#ef4444"
      stroke-width="2"
      stroke-dasharray="6 3"
    />

    <!-- 2) Bounding box (blue dashed) -->
    <rect
      :x="aabb.min.x"
      :y="aabb.min.y"
      :width="aabb.max.x - aabb.min.x"
      :height="aabb.max.y - aabb.min.y"
      fill="none"
      stroke="#3b82f6"
      stroke-width="1"
      stroke-dasharray="4 2"
    />

    <!-- 3) Front side highlight (green thick) -->
    <polyline
      v-if="frontSide.length > 0"
      :points="frontSide.map(p => `${p.x},${p.y}`).join(' ')"
      fill="none"
      stroke="#22c55e"
      stroke-width="3"
    />

    <!-- 4) Column cut lines (yellow) -->
    <line
      v-for="(line, i) in columnLines"
      :key="'col-' + i"
      :x1="line.a.x" :y1="line.a.y"
      :x2="line.b.x" :y2="line.b.y"
      stroke="#eab308"
      stroke-width="1"
      stroke-dasharray="3 2"
    />

    <!-- 5) Row cut lines (orange) -->
    <line
      v-for="(line, i) in rowLines"
      :key="'row-' + i"
      :x1="line.a.x" :y1="line.a.y"
      :x2="line.b.x" :y2="line.b.y"
      stroke="#f97316"
      stroke-width="1"
      stroke-dasharray="3 2"
    />

    <!-- 6) Local frame axes (origin dot + arrows) -->
    <circle
      :cx="originPt.x" :cy="originPt.y"
      r="4" fill="#ef4444"
    />
    <line
      :x1="originPt.x" :y1="originPt.y"
      :x2="originPt.x + frontDirVec.x * 40"
      :y2="originPt.y + frontDirVec.y * 40"
      stroke="#22c55e" stroke-width="2"
    />
    <line
      :x1="originPt.x" :y1="originPt.y"
      :x2="originPt.x + depthDirVec.x * 40"
      :y2="originPt.y + depthDirVec.y * 40"
      stroke="#f97316" stroke-width="2"
    />

    <!-- 7) Lot vertex markers -->
    <g v-for="(lot, li) in lotList" :key="'dbg-lot-' + li">
      <circle
        v-for="(pt, pi) in lot.polygon"
        :key="pi"
        :cx="pt.x" :cy="pt.y"
        r="2.5"
        :fill="isInsideBlock(pt) ? '#22c55e' : '#ef4444'"
        :stroke="isInsideBlock(pt) ? '#166534' : '#991b1b'"
        stroke-width="0.5"
      />
    </g>

    <!-- 8) Info text -->
    <text
      :x="aabb.min.x"
      :y="aabb.min.y - 8"
      fill="#ef4444"
      font-size="10"
      font-family="monospace"
    >
      DEBUG | verts={{ block.polygon.length }} | sides={{ block.sides?.length ?? 0 }} | lots={{ lotList.length }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Block, Lot } from '../../composables/lotEditor/topology/types'
import type { Vec2 } from '../../composables/lotEditor/geometry/types'
import { polygonToSVGPath, polygonAABB, pointInPolygon } from '../../composables/lotEditor/geometry/polygon'
import { sub, normalize, dot, add, scale, dist } from '../../composables/lotEditor/geometry/vec2'

const props = defineProps<{
  showDebug: boolean
  block: Block | null
  lots: Map<string, Lot>
  pixelsPerMeter: number
}>()

// ─── Helpers ──────────────────────────────────────────────

function polylineMidpoint(pts: Vec2[]): Vec2 {
  if (pts.length === 0) return { x: 0, y: 0 }
  let totalLen = 0
  for (let i = 0; i < pts.length - 1; i++) totalLen += dist(pts[i]!, pts[i + 1]!)
  if (totalLen < 1e-10) return pts[0]!
  const halfLen = totalLen / 2
  let acc = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const segLen = dist(pts[i]!, pts[i + 1]!)
    if (acc + segLen >= halfLen) {
      const t = segLen > 0 ? (halfLen - acc) / segLen : 0
      return { x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * t, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * t }
    }
    acc += segLen
  }
  return pts[pts.length - 1]!
}

// ─── Computed geometry ────────────────────────────────────

const blockPath = computed(() => {
  if (!props.block) return ''
  return polygonToSVGPath(props.block.polygon)
})

const aabb = computed(() => {
  if (!props.block) return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  return polygonAABB(props.block.polygon)
})

const frontSide = computed((): Vec2[] => {
  if (!props.block?.sides?.length) return []
  let longestLen = 0
  let longestIdx = 0
  for (let i = 0; i < props.block.sides.length; i++) {
    const side = props.block.sides[i]!
    let len = 0
    for (let j = 0; j < side.length - 1; j++) len += dist(side[j]!, side[j + 1]!)
    if (len > longestLen) { longestLen = len; longestIdx = i }
  }
  return props.block.sides[longestIdx] ?? []
})

const originPt = computed((): Vec2 => {
  const fs = frontSide.value
  return fs.length >= 2 ? polylineMidpoint(fs) : { x: 0, y: 0 }
})

const frontDirVec = computed((): Vec2 => {
  const fs = frontSide.value
  if (fs.length < 2) return { x: 1, y: 0 }
  return normalize(sub(fs[fs.length - 1]!, fs[0]!))
})

const depthDirVec = computed((): Vec2 => {
  if (!props.block) return { x: 0, y: 1 }
  const fd = frontDirVec.value
  // perpCCW = inward for positive-area polygon
  let dd: Vec2 = { x: -fd.y, y: fd.x }
  // Verify against centroid
  const poly = props.block.polygon
  let cx = 0, cy = 0
  for (const p of poly) { cx += p.x; cy += p.y }
  const centroid: Vec2 = { x: cx / poly.length, y: cy / poly.length }
  const o = originPt.value
  const toCentroid = sub(centroid, o)
  if (dot(dd, toCentroid) < 0) dd = { x: -dd.x, y: -dd.y }
  return dd
})

function projectOnAxis(p: Vec2, origin: Vec2, axis: Vec2): number {
  return (p.x - origin.x) * axis.x + (p.y - origin.y) * axis.y
}

function projectedRange(poly: Vec2[], origin: Vec2, axis: Vec2): [number, number] {
  let lo = Infinity, hi = -Infinity
  for (const p of poly) {
    const d = projectOnAxis(p, origin, axis)
    if (d < lo) lo = d
    if (d > hi) hi = d
  }
  return [lo, hi]
}

const columnLines = computed(() => {
  if (!props.block?.grid) return []
  const grid = props.block.grid
  const o = originPt.value
  const fd = frontDirVec.value
  const dd = depthDirVec.value
  const poly = props.block.polygon

  const [fMin, fMax] = projectedRange(poly, o, fd)
  const [_dMin, dMax] = projectedRange(poly, o, dd)

  // Front side min depth
  const fs = frontSide.value
  let minFrontDepth = 0
  if (fs.length >= 2) {
    minFrontDepth = Infinity
    for (const p of fs) {
      const d = projectOnAxis(p, o, dd)
      if (d < minFrontDepth) minFrontDepth = d
    }
  }

  const colWidth = (fMax - fMin) / grid.numCols
  const lines = []
  for (let c = 0; c <= grid.numCols; c++) {
    const f = fMin + c * colWidth
    const a: Vec2 = add(add(o, scale(fd, f)), scale(dd, minFrontDepth))
    const b: Vec2 = add(add(o, scale(fd, f)), scale(dd, dMax))
    lines.push({ a, b })
  }
  return lines
})

const rowLines = computed(() => {
  if (!props.block?.grid) return []
  const grid = props.block.grid
  const o = originPt.value
  const fd = frontDirVec.value
  const dd = depthDirVec.value
  const poly = props.block.polygon
  const fs = frontSide.value
  if (fs.length < 2) return []

  const [fMin, fMax] = projectedRange(poly, o, fd)

  // Front side min depth
  let minFrontDepth = Infinity
  for (const p of fs) {
    const d = projectOnAxis(p, o, dd)
    if (d < minFrontDepth) minFrontDepth = d
  }

  const lines = []
  let cumDepth = minFrontDepth
  for (const depthM of grid.depths) {
    cumDepth += depthM * props.pixelsPerMeter
    const a: Vec2 = add(add(o, scale(fd, fMin)), scale(dd, cumDepth))
    const b: Vec2 = add(add(o, scale(fd, fMax)), scale(dd, cumDepth))
    lines.push({ a, b })
  }
  return lines
})

const lotList = computed((): Lot[] => {
  if (!props.block) return []
  return props.block.lots
    .map(id => props.lots.get(id))
    .filter((l): l is Lot => !!l)
})

function isInsideBlock(pt: Vec2): boolean {
  if (!props.block) return false
  return pointInPolygon(pt, props.block.polygon)
}
</script>
