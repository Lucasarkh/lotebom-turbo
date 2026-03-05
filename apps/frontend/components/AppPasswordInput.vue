<template>
  <div class="app-pw-wrapper">
    <input
      v-bind="$attrs"
      :type="show ? 'text' : 'password'"
      :value="modelValue"
      class="form-input"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button type="button" class="app-pw-toggle" :aria-label="show ? 'Ocultar senha' : 'Mostrar senha'" @click="show = !show">
      <!-- Eye open -->
      <svg v-if="show" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      <!-- Eye closed -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue?: string }>()
defineEmits(['update:modelValue'])
const show = ref(false)
</script>

<style scoped>
.app-pw-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.app-pw-wrapper .form-input {
  width: 100%;
  padding-right: 44px;
}
.app-pw-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--color-surface-400);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms;
  flex-shrink: 0;
}
.app-pw-toggle:hover { color: var(--color-surface-100); }
.app-pw-toggle svg { width: 18px; height: 18px; }
</style>
