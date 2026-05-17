<template>
  <span :class="classes">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
}>(), {
  variant: 'neutral',
  size: 'sm',
})

const classes = computed(() => {
  const base = 'inline-flex items-center font-semibold rounded-full'

  const sizes: Record<string, string> = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  }

  const variants: Record<string, string> = {
    primary: 'bg-p-accent/15 text-p-accent',
    success: 'bg-p-success/15 text-p-success',
    warning: 'bg-p-warning/15 text-p-warning',
    danger: 'bg-p-danger/15 text-p-danger',
    info: 'bg-p-info/15 text-p-info',
    neutral: 'bg-p-overlay text-p-text-secondary',
  }

  return [base, sizes[props.size], variants[props.variant]]
})
</script>
