<template>
  <div v-if="!tenantStore.isLoaded" class="loading-full">
    <div class="spinner"></div>
  </div>
  <template v-else>
    <!-- 
      If we are on a custom domain, the [slug] parameter represents a Lot Code.
      If we are on the main domain, the [slug] parameter represents the Project.
    -->
    <LotDetailsView v-if="isCustomDomainLot" :lot-code="route.params.slug as string" />
    <ProjectLandingView v-else />
  </template>
</template>

<script setup lang="ts">
import ProjectLandingView from '~/components/ProjectLandingView.vue'
import LotDetailsView from '~/components/LotDetailsView.vue'
import { useTenantStore } from '~/stores/tenant'

const route = useRoute()
const tenantStore = useTenantStore()

const isCustomDomainLot = computed(() => {
  // If no project resolved via domain, it's definitely a project slug (on main domain)
  if (!tenantStore.config?.projectId) return false

  // If on a custom domain, and we have a slug param, it's a lot
  const host = process.client ? window.location.host : ''
  const isMainDomain = host.includes('lotio.com.br') || host.includes('localhost:3000')
  return !isMainDomain && !!route.params.slug
})

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
