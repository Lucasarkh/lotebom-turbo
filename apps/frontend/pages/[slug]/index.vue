<template>
  <div v-if="!tenantStore.isLoaded" class="loading-full">
    <div class="spinner"></div>
  </div>
  <ProjectLandingView v-else />
</template>

<script setup lang="ts">
import ProjectLandingView from '~/components/ProjectLandingView.vue'
import { useTenantStore } from '~/stores/tenant'

const tenantStore = useTenantStore()

definePageMeta({
  layout: 'public'
})
</script>

<style scoped>
.loading-full {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0,0,0,0.1);
  border-left-color: #0071e3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
