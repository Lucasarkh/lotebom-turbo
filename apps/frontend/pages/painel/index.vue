<template>
  <div class="dashboard-page">
    <DashboardSysAdmin v-if="authStore.isSysAdmin" />
    <DashboardLoteadora v-else-if="authStore.isLoteadora" />
    <DashboardCorretor v-else />
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth'
import DashboardSysAdmin from '../../components/painel/DashboardSysAdmin.vue'
import DashboardLoteadora from '../../components/painel/DashboardLoteadora.vue'
import DashboardCorretor from '../../components/painel/DashboardCorretor.vue'

const authStore = useAuthStore()
</script>

<style scoped>
.dashboard-page {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
