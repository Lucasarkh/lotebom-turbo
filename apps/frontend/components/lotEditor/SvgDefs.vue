<template>
  <defs>
    <!-- Lake water gradient -->
    <linearGradient id="lakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" :stop-color="colors.lakeLight" />
      <stop offset="100%" :stop-color="colors.lakeDark" />
    </linearGradient>

    <!-- Road shadow filter -->
    <filter id="roadShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" :flood-color="theme.roadShadow" />
    </filter>

    <!-- Soft glow for selected items -->
    <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feFlood flood-color="#2563eb" flood-opacity="0.4" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Green area texture pattern -->
    <pattern id="greenPattern" patternUnits="userSpaceOnUse" width="12" height="12">
      <rect width="12" height="12" :fill="theme.greenFill" />
      <circle cx="3" cy="3" r="1" :fill="colors.greenDot" opacity="0.3" />
      <circle cx="9" cy="9" r="1" :fill="colors.greenDot" opacity="0.3" />
    </pattern>

    <!-- Grid pattern -->
    <pattern id="gridPattern" patternUnits="userSpaceOnUse" width="50" height="50">
      <path d="M 50 0 L 0 0 0 50" fill="none" :stroke="theme.bgGrid" stroke-width="0.5" />
    </pattern>
  </defs>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ThemeColors } from '../../composables/lotEditor/themes'

const props = defineProps<{ theme: ThemeColors }>()

const colors = computed(() => ({
  lakeLight: '#93c5fd',
  lakeDark: '#3b82f6',
  greenDot: '#22c55e',
}))
</script>
