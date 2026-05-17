<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div v-if="icon || $slots.icon" class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-p-overlay">
      <slot name="icon">
        <span class="text-2xl text-p-text-muted">{{ icon }}</span>
      </slot>
    </div>
    <h3 class="text-base font-semibold text-p-text">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-p-text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>
