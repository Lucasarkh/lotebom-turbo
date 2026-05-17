<template>
  <div :class="['rounded-lg border px-4 py-3 text-sm', classes]">
    <div class="flex items-start gap-3">
      <div class="flex-1">
        <p v-if="title" class="font-semibold">{{ title }}</p>
        <slot />
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        @click="$emit('dismiss')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  dismissible?: boolean
}>(), {
  variant: 'info',
  dismissible: false,
})

defineEmits<{
  dismiss: []
}>()

const classes = computed(() => {
  const map: Record<string, string> = {
    success: 'border-p-success/30 bg-p-success-subtle/30 text-p-success',
    error: 'border-p-danger/30 bg-p-danger-subtle/30 text-p-danger',
    warning: 'border-p-warning/30 bg-p-warning-subtle/30 text-p-warning',
    info: 'border-p-info/30 bg-p-info-subtle/30 text-p-info',
  }
  return map[props.variant]
})
</script>
