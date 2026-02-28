<template>
  <div class="dashboard-corretor">
    <div class="page-header">
      <div>
        <h1>Olá, {{ authStore.user?.name }}</h1>
        <p>Bem-vindo ao seu painel de corretor</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="!realtorLink" class="empty-state">
      <div class="empty-state-icon">📄</div>
      <h3>Link não configurado</h3>
      <p>Você ainda não possui um link de divulgação associado à sua conta. Entre em contato com o administrador da sua loteadora.</p>
    </div>

    <template v-else>
      <div class="grid grid-cols-3">
        <div class="stat-card">
          <div class="stat-value">{{ realtorLink._count.leads }}</div>
          <div class="stat-label">Total de Leads</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ campaigns.length }}</div>
          <div class="stat-label">Campanhas Ativas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ recentLeads.length }}</div>
          <div class="stat-label">Leads Recentes</div>
        </div>
      </div>

      <div class="card" style="margin-top: var(--space-8);">
        <h2 style="margin-bottom: var(--space-4);">Seu Link de Divulgação</h2>
        <p style="color: var(--text-muted); margin-bottom: var(--space-4);">Use este link para divulgar os projetos. Qualquer lead gerado através dele será atribuído a você.</p>
        
        <div v-for="p in realtorLink.projects" :key="p.id" class="link-item">
          <div class="link-info">
            <strong>{{ p.name }}</strong>
            <div class="link-url">{{ getProjectUrl(p.slug) }}</div>
          </div>
          <button class="btn btn-sm btn-outline" @click="copyToClipboard(getProjectUrl(p.slug))">
            Copiar Link
          </button>
        </div>
      </div>

      <div style="margin-top: var(--space-8);">
        <div class="flex justify-between items-center" style="margin-bottom: var(--space-5);">
          <h2>Suas Campanhas</h2>
          <NuxtLink to="/painel/campanhas" class="btn btn-sm btn-primary">Gerenciar Campanhas</NuxtLink>
        </div>
        <div v-if="campaigns.length === 0" class="empty-state">
          <p>Nenhuma campanha criada ainda.</p>
        </div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Fonte (UTM)</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in campaigns.slice(0, 5)" :key="c.id">
                <td>{{ c.name }}</td>
                <td>{{ c.utmSource }}</td>
                <td><span class="badge" :class="c.active ? 'badge-success' : 'badge-error'">{{ c.active ? 'Ativa' : 'Pausada' }}</span></td>
                <td>{{ formatDate(c.createdAt) }}</td>
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
import { useAuthStore } from '../../stores/auth'
import { formatDateToBrasilia } from '~/utils/date'

const authStore = useAuthStore()
const { fetchApi } = useApi()
const toast = useToast()

const loading = ref(true)
const realtorLink = ref(null)
const campaigns = ref([])
const recentLeads = ref([])

async function loadData() {
  loading.value = true
  try {
    realtorLink.value = await fetchApi('/realtor-links/me')
    const [leadsData, campaignsData] = await Promise.all([
      fetchApi('/leads'),
      fetchApi('/campaigns')
    ])
    recentLeads.value = leadsData.data || []
    campaigns.value = campaignsData.data || []
  } catch (err) {
    console.error('Error loading dashboard data:', err)
  } finally {
    loading.value = false
  }
}

function getProjectUrl(slug) {
  if (!realtorLink.value) return ''
  const base = `${window.location.origin}/${slug}`
  return `${base}?c=${realtorLink.value.code}`
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  toast.success('Link copiado para a área de transferência!')
}

function formatDate(date) {
  return formatDateToBrasilia(date)
}

onMounted(loadData)
</script>

<style scoped>
.link-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--bg-alt);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-color);
}
.link-info {
  display: flex;
  flex-direction: column;
}
.link-url {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--primary-color);
  margin-top: 4px;
}
</style>
