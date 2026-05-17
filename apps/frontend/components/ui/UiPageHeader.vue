<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-p-text md:text-2xl">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-p-text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
