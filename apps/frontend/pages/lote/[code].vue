<template>
  <div v-if="!tenantStore.isLoaded" class="loading-full">
    <div class="spinner"></div>
  </div>
  <LotDetailsView v-else-if="tenantStore.config?.projectId" />
  <div v-else class="p-8 text-center text-gray-500">
     <h1 class="text-2xl font-bold">Unidade não encontrada</h1>
     <NuxtLink to="/" class="text-primary underline">Voltar para o início</NuxtLink>
  </div>
</template>

<script setup>
import { useTenantStore } from '~/stores/tenant'
import LotDetailsView from '~/components/LotDetailsView.vue'
const tenantStore = useTenantStore()

definePageMeta({
  layout: 'public'
})
</script>
