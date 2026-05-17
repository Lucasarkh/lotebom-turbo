<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70" @click="dismissible && $emit('update:modelValue', false)" />

        <!-- Modal -->
        <div
          class="relative w-full rounded-xl border border-p-border bg-p-elevated shadow-2xl overflow-hidden"
          :class="sizeClass"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="flex items-center justify-between border-b border-p-border px-5 py-4">
            <slot name="header">
              <h2 class="text-lg font-semibold text-p-text">{{ title }}</h2>
            </slot>
            <button
              v-if="dismissible"
              type="button"
              class="rounded-lg p-1.5 text-p-text-muted hover:bg-p-overlay hover:text-p-text transition-colors"
              @click="$emit('update:modelValue', false)"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="overflow-y-auto max-h-[calc(100vh-12rem)] px-5 py-5">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="border-t border-p-border px-5 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useBodyScrollLock } from '~/composables/useBodyScrollLock'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dismissible?: boolean
}>(), {
  size: 'md',
  dismissible: true,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed(() => props.modelValue)
useBodyScrollLock(isOpen as any)

const sizeClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  return map[props.size]
})
</script>
