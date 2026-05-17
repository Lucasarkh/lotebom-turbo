<template>
  <div>
    <label v-if="label" class="mb-1.5 block text-sm font-medium text-p-text-secondary">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full rounded-lg border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30"
      :class="error ? 'border-p-danger focus:border-p-danger' : 'border-p-border focus:border-p-accent'"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="mt-1 text-xs text-p-danger">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
