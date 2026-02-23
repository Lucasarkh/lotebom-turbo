<script setup lang="ts">
const { get } = useApi()
const toast = useToast()

const projects = ref([])
const selectedProjectId = ref('all')
const metrics = ref(null)
const loadingMetrics = ref(false)

async function fetchProjects() {
  try {
    projects.value = await get('/projects')
  } catch (error) {
    toast.error('Erro ao carregar projetos')
  }
}

async function fetchMetrics() {
  loadingMetrics.value = true
  try {
    const url = selectedProjectId.value === 'all' 
      ? '/tracking/metrics' 
      : `/tracking/metrics?projectId=${selectedProjectId.value}`
    metrics.value = await get(url)
  } catch (error) {
    toast.error('Erro ao carregar métricas')
  } finally {
    loadingMetrics.value = false
  }
}

watch(selectedProjectId, () => {
  fetchMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchMetrics()
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="metrics-page">
    <div class="header">
      <div>
        <h1>Métricas de Acesso</h1>
        <p class="subtitle">Acompanhe o desempenho dos seus empreendimentos</p>
      </div>
      
      <div class="filter">
        <label>Filtrar por Projeto:</label>
        <select v-model="selectedProjectId" class="project-select">
          <option value="all">Todos os Projetos</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="loadingMetrics" class="loading">Carregando métricas...</div>

    <div v-else-if="metrics" class="dashboard">
      <!-- Top Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total de Sessões</span>
          <span class="stat-value">{{ metrics.summary.totalSessions }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total de Visualizações</span>
          <span class="stat-value">{{ metrics.summary.totalPageViews }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Cliques em Lotes</span>
          <span class="stat-value">{{ metrics.summary.totalLotClicks }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Cliques em Corretores</span>
          <span class="stat-value">{{ metrics.summary.totalRealtorClicks }}</span>
        </div>
      </div>

      <div class="details-grid">
        <!-- Top UTM Sources -->
        <div class="details-card">
          <h3>Origens de Tráfego (UTM Source)</h3>
          <div class="chart-list">
            <div v-for="item in metrics.topUtmSources" :key="item.utmSource" class="chart-item">
              <span class="item-label">{{ item.utmSource || '(Direto/Orgânico)' }}</span>
              <div class="bar-container">
                <div class="bar" :style="{ width: `${(item._count.id / metrics.summary.totalSessions) * 100}%` }"></div>
              </div>
              <span class="item-count">{{ item._count.id }}</span>
            </div>
          </div>
        </div>

        <!-- Top UTM Campaigns -->
        <div class="details-card">
          <h3>Campanhas (UTM Campaign)</h3>
          <div class="chart-list">
            <div v-for="item in metrics.topUtmCampaigns" :key="item.utmCampaign" class="chart-item">
              <span class="item-label">{{ item.utmCampaign || '(Indefinida)' }}</span>
              <div class="bar-container">
                <div class="bar" :style="{ width: `${(item._count.id / metrics.summary.totalSessions) * 100}%` }"></div>
              </div>
              <span class="item-count">{{ item._count.id }}</span>
            </div>
          </div>
        </div>

        <!-- Most Clicked Lots -->
        <div class="details-card">
          <h3>Lotes mais Clicados</h3>
          <table class="simple-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th class="text-right">Cliques</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lot in metrics.topLots" :key="lot.lotId">
                <td>Lote #{{ lot.lotId }}</td>
                <td class="text-right">{{ lot._count.id }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Most Contacted Realtors -->
        <div class="details-card">
          <h3>Corretores mais Acessados</h3>
          <table class="simple-table">
            <thead>
              <tr>
                <th>Corretor</th>
                <th class="text-right">Cliques</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in metrics.topRealtors" :key="r.realtorId">
                <td>{{ r.realtorName || 'N/A' }}</td>
                <td class="text-right">{{ r._count.id }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-page {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #64748b;
  margin: 0;
}

.project-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  min-width: 250px;
}

.filter label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.stat-label {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.details-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.details-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #1e293b;
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-label {
  font-size: 13px;
  color: #475569;
  width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-container {
  flex: 1;
  background: #f1f5f9;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  background: #2563eb;
  height: 100%;
}

.item-count {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  min-width: 40px;
  text-align: right;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th {
  text-align: left;
  font-size: 12px;
  color: #64748b;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.simple-table td {
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.text-right {
  text-align: right;
}

.loading {
  padding: 48px;
  text-align: center;
  color: #64748b;
}
</style>
