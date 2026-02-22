<template>
  <!-- SVG overlay element — rendered inside the same SVG as hotspots -->
  <g v-if="enabled" class="sun-path-line">
    <!-- The line spans diagonally across the full image -->
    <line
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      stroke="#f59e0b"
      stroke-width="2.5"
      stroke-dasharray="8 5"
      stroke-linecap="round"
      opacity="0.9"
    />

    <!-- Sun icon at center -->
    <text
      :x="(x1 + x2) / 2"
      :y="(y1 + y2) / 2 - 12"
      text-anchor="middle"
      font-size="18"
      style="pointer-events: none; user-select: none;"
    >☀️</text>

    <!-- Cardinal labels -->
    <template v-if="showLabels">
      <!-- Start label -->
      <g :transform="`translate(${x1}, ${y1})`">
        <rect x="-12" y="-10" width="24" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
        <text
          text-anchor="middle"
          dominant-baseline="central"
          font-size="11"
          font-weight="700"
          fill="#fbbf24"
          style="user-select: none;"
        >{{ startLabel }}</text>
      </g>
      <!-- End label -->
      <g :transform="`translate(${x2}, ${y2})`">
        <rect x="-12" y="-10" width="24" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
        <text
          text-anchor="middle"
          dominant-baseline="central"
          font-size="11"
          font-weight="700"
          fill="#fbbf24"
          style="user-select: none;"
        >{{ endLabel }}</text>
      </g>
    </template>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  enabled: boolean
  angleDeg: number
  showLabels: boolean
  /** SVG viewport dimensions */
  width: number
  height: number
}>()

// Convert angle to a line from edge-to-edge on the SVG canvas
const lineCoords = computed(() => {
  const angleDeg = props.angleDeg % 360
  const rad = (angleDeg * Math.PI) / 180

  const cx = props.width / 2
  const cy = props.height / 2

  // Use the diagonal length to ensure line always crosses the entire image
  const diag = Math.hypot(props.width, props.height) * 0.6

  return {
    x1: cx - Math.cos(rad) * diag,
    y1: cy - Math.sin(rad) * diag,
    x2: cx + Math.cos(rad) * diag,
    y2: cy + Math.sin(rad) * diag,
  }
})

const x1 = computed(() => lineCoords.value.x1)
const y1 = computed(() => lineCoords.value.y1)
const x2 = computed(() => lineCoords.value.x2)
const y2 = computed(() => lineCoords.value.y2)

// Cardinal direction labels based on angle quadrant
const CARDINALS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
const startLabel = computed(() => {
  const idx = Math.round(((props.angleDeg + 180) % 360) / 45) % 8
  return CARDINALS[idx]
})
const endLabel = computed(() => {
  const idx = Math.round((props.angleDeg % 360) / 45) % 8
  return CARDINALS[idx]
})
</script>
