<template>
  <div>
    <UiPageHeader title="Dashboard Sistema" description="Visão geral de todos os clientes registrados" />

    <UiLoadingState v-if="loading" />

    <template v-else>
      <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <UiStatCard :value="globalMetrics.totalTenants" label="Loteadoras Ativas" />
        <UiStatCard :value="globalMetrics.totalProjects" label="Projetos Totais" />
        <UiStatCard :value="globalMetrics.totalBrokers" label="Corretores" />
        <UiStatCard :value="globalMetrics.totalLeads" label="Leads Gerados" />
      </div>

      <div class="mt-8">
        <h2 class="mb-5 text-lg font-semibold text-p-text">Top Loteadoras (Leads)</h2>
        <UiTable>
          <template #head>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Loteadora</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Projetos</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Corretores</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Leads Gerados</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
          </template>
          <tr v-for="t in topTenants" :key="t.id">
            <td class="px-4 py-3 text-sm text-p-text">{{ t.name }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ t.metrics.projects }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ t.metrics.brokers }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ t.metrics.leads }}</td>
            <td class="px-4 py-3">
              <UiBadge :variant="t.isActive ? 'success' : 'danger'">{{ t.isActive ? 'Ativa' : 'Desativada' }}</UiBadge>
            </td>
          </tr>
        </UiTable>
        <div class="mt-4 text-right">
          <UiButton variant="outline" to="/painel/tenants">Ver Todas as Loteadoras</UiButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const { fetchApi } = useApi()
const tenants = ref([])
const loading = ref(true)

async function loadData() {
  loading.value = true
  try {
    tenants.value = await fetchApi('/tenants')
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const globalMetrics = computed(() => {
  return tenants.value.reduce((acc, t) => {
    if (t.isActive) acc.totalTenants++
    acc.totalProjects += t.metrics.projects
    acc.totalBrokers += t.metrics.brokers
    acc.totalLeads += t.metrics.leads
    return acc
  }, { totalTenants: 0, totalProjects: 0, totalBrokers: 0, totalLeads: 0 })
})

const topTenants = computed(() => {
  return [...tenants.value].sort((a,b) => b.metrics.leads - a.metrics.leads).slice(0, 5)
})

onMounted(loadData)
</script>
