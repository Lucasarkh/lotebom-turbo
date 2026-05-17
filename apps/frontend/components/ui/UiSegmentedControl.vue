<template>
  <div class="inline-flex items-center gap-1 rounded-lg border border-p-border bg-p-raised p-1">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
      :class="modelValue === option.value
        ? 'bg-p-accent text-white'
        : 'text-p-text-secondary hover:text-p-text hover:bg-p-overlay'"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
      <span v-if="option.count !== undefined" class="ml-1 text-xs opacity-70">({{ option.count }})</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string | number
  options: Array<{ value: string | number; label: string; count?: number }>
}>()

defineEmits<{
  'update:modelValue': [value: string | number]
}>()
</script>
