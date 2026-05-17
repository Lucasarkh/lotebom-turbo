<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="disabled || loading"
    :class="classes"
  >
    <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NuxtLink } from '#components'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'warning' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  to?: string
  type?: string
}>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
})

const classes = computed(() => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-colors rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'

  const sizes: Record<string, string> = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variants: Record<string, string> = {
    primary: 'bg-p-accent text-white hover:bg-p-accent-hover',
    secondary: 'border border-p-border text-p-text-secondary hover:bg-p-overlay hover:text-p-text',
    danger: 'bg-p-danger text-white hover:bg-red-600',
    ghost: 'text-p-text-secondary hover:bg-p-overlay hover:text-p-text',
    outline: 'border border-p-accent text-p-accent hover:bg-p-accent/10',
    warning: 'bg-p-warning text-white hover:bg-amber-600',
    success: 'bg-p-success text-white hover:bg-emerald-600',
  }

  return [base, sizes[props.size], variants[props.variant]]
})
</script>
