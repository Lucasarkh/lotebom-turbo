<template>
  <div :class="['rounded-xl border border-p-border bg-p-elevated', paddingClass]">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  padding?: 'none' | 'sm' | 'md' | 'lg'
}>(), {
  padding: 'md',
})

const paddingClass = computed(() => {
  const map: Record<string, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4 md:p-5',
    lg: 'p-5 md:p-6',
  }
  return map[props.padding]
})
</script>
