<template>
  <div class="dashboard-loteadora">
    <div class="page-header">
      <div>
        <h1>Dashboard Loteadora</h1>
        <p>Visão geral dos seus projetos e leads</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Carregando...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="loadDashboard">Tentar novamente</button>
    </div>

    <template v-else>
      <div class="grid grid-cols-4">
        <div class="stat-card">
          <div class="stat-value">{{ stats.projects }}</div>
          <div class="stat-label">Projetos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.publishedProjects }}</div>
          <div class="stat-label">Publicados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalLots }}</div>
          <div class="stat-label">Elementos no Mapa</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalLeads }}</div>
          <div class="stat-label">Leads</div>
        </div>
      </div>

      <div style="margin-top: var(--space-8);">
        <h2 style="margin-bottom: var(--space-5);">Projetos Recentes</h2>
        <div v-if="projects.length === 0" class="empty-state">
          <div class="empty-state-icon">📂</div>
          <h3>Nenhum projeto ainda</h3>
          <p>Crie seu primeiro projeto para começar</p>
          <NuxtLink to="/painel/projetos" class="btn btn-primary" style="margin-top: var(--space-4);">
            Criar Projeto
          </NuxtLink>
        </div>
        <div v-else class="grid grid-cols-3">
          <ProjectCard 
            v-for="p in projects.slice(0, 6)" 
            :key="p.id" 
            :project="p" 
            @click="$router.push(`/painel/projetos/${p.id}`)"
          />
        </div>
      </div>

      <div v-if="recentLeads.length" style="margin-top: var(--space-8);">
        <h2 style="margin-bottom: var(--space-5);">Leads Recentes</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Projeto</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in recentLeads.slice(0, 5)" :key="l.id">
                <td>{{ l.name }}</td>
                <td>{{ l.email || '—' }}</td>
                <td>{{ l.phone || '—' }}</td>
                <td>{{ l.project?.name ?? '—' }}</td>
                <td><span class="badge" :class="leadBadge(l.status)">{{ leadLabel(l.status) }}</span></td>
                <td>{{ formatDate(l.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const { fetchApi } = useApi()
const loading = ref(true)
const error = ref('')
const projects = ref([])
const recentLeads = ref([])
const stats = ref({ projects: 0, publishedProjects: 0, totalLots: 0, totalLeads: 0 })

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [statsRes, projectsRes, leadsRes] = await Promise.all([
      fetchApi('/tracking/stats'),
      fetchApi('/projects'),
      fetchApi('/leads')
    ])
    stats.value = statsRes
    projects.value = projectsRes.data || projectsRes || []
    recentLeads.value = leadsRes.data || leadsRes || []
  } catch (err) {
    error.value = err.message || 'Erro ao carregar dashboard'
    console.error(err)
  } finally {
    loading.value = false
  }
}

function leadBadge(status) {
  const map = { NEW: 'badge-info', CONTACTED: 'badge-warning', QUALIFIED: 'badge-success', WON: 'badge-success', LOST: 'badge-error' }
  return map[status] || 'badge-neutral'
}

function leadLabel(status) {
  const map = { NEW: 'Novo', CONTACTED: 'Contatado', QUALIFIED: 'Qualificado', NEGOTIATING: 'Negociando', WON: 'Vendido', LOST: 'Perdido' }
  return map[status] || status
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR')
}

onMounted(loadDashboard)
</script>
