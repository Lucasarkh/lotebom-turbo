<template>
  <div>
    <UiPageHeader title="Dashboard Loteadora" description="Visão geral dos seus projetos e leads" />

    <UiLoadingState v-if="loading" text="Carregando..." />

    <div v-else-if="error" class="mt-6">
      <UiAlert variant="error" :title="error">
        <template #default>
          <UiButton variant="primary" size="sm" class="mt-3" @click="loadDashboard">Tentar novamente</UiButton>
        </template>
      </UiAlert>
    </div>

    <template v-else>
      <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <UiCard padding="md">
          <div class="text-2xl font-bold text-p-text">{{ stats.projects }}</div>
          <CommonAppTooltip text="Total de empreendimentos cadastrados na plataforma." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Projetos</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="text-2xl font-bold text-p-text">{{ stats.publishedProjects }}</div>
          <CommonAppTooltip text="Projetos que estão publicados e visíveis para o público." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Publicados</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="text-2xl font-bold text-p-text">{{ stats.totalLots }}</div>
          <CommonAppTooltip text="Total de lotes e elementos desenhados nos mapas de todos os projetos." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Elementos no Mapa</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="text-2xl font-bold text-p-text">{{ stats.totalLeads }}</div>
          <CommonAppTooltip text="Total de leads (contatos de interessados) captados em todos os projetos." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Leads</div></CommonAppTooltip>
        </UiCard>
      </div>

      <div class="mt-8">
        <h2 class="mb-5 text-lg font-semibold text-p-text">Projetos Recentes</h2>
        <UiEmptyState
          v-if="projects.length === 0"
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para começar"
          icon="📂"
        >
          <template #action>
            <UiButton variant="primary" to="/painel/projetos">Criar Projeto</UiButton>
          </template>
        </UiEmptyState>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCard
            v-for="p in projects.slice(0, 6)"
            :key="p.id"
            :project="p"
            @click="$router.push(`/painel/projetos/${p.id}`)"
          />
        </div>
      </div>

      <div v-if="recentLeads.length" class="mt-8">
        <h2 class="mb-5 text-lg font-semibold text-p-text">Leads Recentes</h2>
        <UiTable>
          <template #head>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Nome</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">E-mail</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Telefone</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Projeto</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data</th>
          </template>
          <tr v-for="l in recentLeads.slice(0, 5)" :key="l.id">
            <td class="px-4 py-3 text-sm text-p-text">{{ l.name }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ l.email || '—' }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ l.phone || '—' }}</td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ l.project?.name ?? '—' }}</td>
            <td class="px-4 py-3"><UiBadge :variant="leadBadgeVariant(l.status)">{{ leadLabel(l.status) }}</UiBadge></td>
            <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDate(l.createdAt) }}</td>
          </tr>
        </UiTable>
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

function leadBadgeVariant(status) {
  const map = { NEW: 'info', CONTACTED: 'warning', QUALIFIED: 'success', WON: 'success', LOST: 'danger' }
  return map[status] || 'neutral'
}

function leadLabel(status) {
  const map = { NEW: 'Novo', CONTACTED: 'Contatado', QUALIFIED: 'Qualificado', NEGOTIATING: 'Negociando', WON: 'Vendido', LOST: 'Perdido' }
  return map[status] || status
}

function formatDate(date) {
  return formatDateToBrasilia(date)
}

onMounted(loadDashboard)
</script>
