<template>
  <UiCard padding="md">
    <div class="flex items-start gap-4">
      <div v-if="icon" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-p-accent/10 text-p-accent">
        <slot name="icon">
          <span class="text-lg">{{ icon }}</span>
        </slot>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-2xl font-bold text-p-text">{{ value }}</p>
        <p class="mt-0.5 text-sm text-p-text-muted">{{ label }}</p>
        <p v-if="trend" class="mt-1 text-xs font-medium" :class="trendPositive ? 'text-p-success' : 'text-p-danger'">
          {{ trend }}
        </p>
      </div>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: string | number
  label: string
  icon?: string
  trend?: string
}>()

const trendPositive = computed(() => {
  if (!props.trend) return false
  return props.trend.startsWith('+') || props.trend.startsWith('↑')
})
</script>
