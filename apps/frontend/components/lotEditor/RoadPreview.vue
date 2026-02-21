<template>
  <g class="road-preview" v-if="isDrawing && lastNode && cursorPos" pointer-events="none">
    <!-- Preview line from last node to cursor -->
    <line
      :x1="lastNode.position.x" :y1="lastNode.position.y"
      :x2="cursorPos.x" :y2="cursorPos.y"
      :stroke="isWall ? '#8b7355' : '#2563eb'"
      stroke-width="2"
      stroke-dasharray="8 4"
      opacity="0.6"
    />

    <!-- Preview road width -->
    <line
      :x1="lastNode.position.x" :y1="lastNode.position.y"
      :x2="cursorPos.x" :y2="cursorPos.y"
      :stroke="isWall ? 'rgba(139,115,85,0.25)' : 'rgba(37,99,235,0.15)'"
      :stroke-width="roadWidth"
      stroke-linecap="round"
    />

    <!-- Cursor dot -->
    <circle
      :cx="cursorPos.x" :cy="cursorPos.y"
      r="5"
      :fill="isWall ? '#8b7355' : '#2563eb'"
      opacity="0.8"
    >
      <animate attributeName="r" values="4;6;4" dur="1.2s" repeatCount="indefinite" />
    </circle>
  </g>
</template>

<script setup lang="ts">
import type { TopoNode } from '../../composables/lotEditor/topology/types'
import type { Vec2 } from '../../composables/lotEditor/geometry/types'

defineProps<{
  isDrawing: boolean
  lastNode: TopoNode | null
  cursorPos: Vec2 | null
  roadWidth: number
  isWall?: boolean
}>()
</script>
