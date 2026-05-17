<template>
  <div>
    <DashboardSysAdmin v-if="authStore.isSysAdmin" />
    <DashboardLoteadora v-else-if="authStore.isLoteadora" />
    <DashboardImobiliaria v-else-if="authStore.isImobiliaria" />
    <DashboardCorretor v-else />
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth'
import DashboardSysAdmin from '../../components/painel/DashboardSysAdmin.vue'
import DashboardLoteadora from '../../components/painel/DashboardLoteadora.vue'
import DashboardImobiliaria from '../../components/painel/DashboardImobiliaria.vue'
import DashboardCorretor from '../../components/painel/DashboardCorretor.vue'

definePageMeta({ layout: 'painel' })

const authStore = useAuthStore()
</script>
