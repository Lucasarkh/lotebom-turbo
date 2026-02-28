<template>
  <div class="dashboard-imobiliaria">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Olá, {{ auth.user?.name?.split(' ')[0] }} 👋</h1>
        <p>Resumo da performance da sua equipe.</p>
      </div>
      <NuxtLink to="/painel/corretores" class="btn btn-primary">
        <i class="pi pi-user-plus me-2"></i>Novo Corretor
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Carregando painel...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="loadData">Tentar novamente</button>
    </div>

    <template v-else>
      <!-- Stats -->
      <div class="grid grid-cols-4">
        <div class="stat-card stat-card--accent">
          <div class="stat-icon-wrap stat-icon--blue"><i class="pi pi-users"></i></div>
          <div class="stat-value">{{ stats.totalRealtors || 0 }}</div>
          <div class="stat-label">Corretores ativos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon--green"><i class="pi pi-target"></i></div>
          <div class="stat-value stat-value--success">{{ stats.totalLeads || 0 }}</div>
          <div class="stat-label">Leads acumulados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon--amber"><i class="pi pi-calendar"></i></div>
          <div class="stat-value">{{ stats.totalSchedulings || 0 }}</div>
          <div class="stat-label">Visitas ao stand</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon--purple"><i class="pi pi-chart-bar"></i></div>
          <div class="stat-value">{{ stats.totalSessions || 0 }}</div>
          <div class="stat-label">Acessos (30 dias)</div>
        </div>
      </div>

      <!-- Main content: two columns -->
      <div class="dashboard-grid">
        <!-- Left column -->
        <div class="dashboard-main">
          <!-- Recent Leads -->
          <div class="card" style="padding: 0;">
            <div class="card-header" style="padding: var(--space-5) var(--space-6);">
              <div>
                <h3 class="card-title">Leads Recentes</h3>
                <p class="card-subtitle">Últimos leads gerados pela equipe</p>
              </div>
              <NuxtLink to="/painel/leads" class="btn btn-ghost btn-sm">
                Ver todos <i class="pi pi-arrow-right" style="margin-left: 4px; font-size: 0.75rem;"></i>
              </NuxtLink>
            </div>

            <div class="table-wrapper" style="border: none; border-radius: 0;">
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Corretor</th>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="lead in recentLeads" :key="lead.id">
                    <td>
                      <div class="lead-cell">
                        <div class="lead-avatar">{{ lead.name?.charAt(0) || '?' }}</div>
                        <strong>{{ lead.name }}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-neutral">{{ lead.realtorLink?.name || 'Direto' }}</span>
                    </td>
                    <td class="text-secondary-cell">{{ lead.phone || '—' }}</td>
                    <td><LeadsLeadStatusBadge :status="lead.status" /></td>
                    <td class="text-secondary-cell">{{ formatDate(lead.createdAt) }}</td>
                  </tr>
                  <tr v-if="!recentLeads.length">
                    <td colspan="5">
                      <div class="empty-state" style="padding: var(--space-8);">
                        <div class="empty-state-icon">📭</div>
                        <h3>Nenhum lead registrado</h3>
                        <p>Os leads aparecerão aqui quando seus corretores começarem a indicar.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Top Performance -->
          <div style="margin-top: var(--space-8);">
            <h2 style="margin-bottom: var(--space-5);">Top Performance</h2>
            <div v-if="topRealtors.length" class="grid grid-cols-2">
              <div v-for="(r, i) in topRealtors" :key="r.id" class="realtor-perf-card">
                <div class="realtor-perf-left">
                  <div class="rank-num" :class="'rank-' + (i + 1)">#{{ i + 1 }}</div>
                  <div>
                    <div class="realtor-perf-name">{{ r.name }}</div>
                    <div class="realtor-perf-meta">{{ r.sessions }} acessos · {{ r.leads }} leads</div>
                  </div>
                </div>
                <div class="realtor-perf-conv">
                  <span class="conv-value">{{ r.conversionRate }}%</span>
                  <span class="conv-label">conv.</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state" style="padding: var(--space-8); background: white; border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
              <div class="empty-state-icon">📊</div>
              <h3>Aguardando dados</h3>
              <p>A performance aparecerá quando seus corretores tiverem atividade.</p>
            </div>
          </div>
        </div>

        <!-- Right column (sidebar) -->
        <div class="dashboard-sidebar">
          <h4 class="sidebar-section-title">Atalhos</h4>
          <div class="shortcut-grid">
            <NuxtLink to="/painel/corretores" class="shortcut-item">
              <div class="shortcut-icon shortcut-icon--blue"><i class="pi pi-users"></i></div>
              <span>Equipe</span>
            </NuxtLink>
            <NuxtLink to="/painel/leads" class="shortcut-item">
              <div class="shortcut-icon shortcut-icon--green"><i class="pi pi-list"></i></div>
              <span>Leads</span>
            </NuxtLink>
            <NuxtLink to="/painel/metricas-imobiliaria" class="shortcut-item">
              <div class="shortcut-icon shortcut-icon--purple"><i class="pi pi-chart-line"></i></div>
              <span>Métricas</span>
            </NuxtLink>
            <div class="shortcut-item" @click="showSchedulingModal = true" style="cursor: pointer;">
              <div class="shortcut-icon shortcut-icon--amber"><i class="pi pi-calendar-plus"></i></div>
              <span>Agendar</span>
            </div>
          </div>

          <!-- Upcoming Schedulings -->
          <h4 class="sidebar-section-title" style="margin-top: var(--space-8);">Próximos Agendamentos</h4>
          <div class="card" style="padding: var(--space-5);">
            <div v-if="upcomingSchedulings.length === 0" class="empty-state" style="padding: var(--space-6);">
              <div class="empty-state-icon">📅</div>
              <p>Nenhum agendamento próximo.</p>
            </div>
            <div v-for="(s, idx) in upcomingSchedulings" :key="s.id" class="schedule-preview-item" :style="idx > 0 ? 'margin-top: var(--space-3)' : ''">
              <div class="schedule-date-pill">
                <div class="schedule-month">{{ getMonthShort(s.scheduledAt) }}</div>
                <div class="schedule-day">{{ getDay(s.scheduledAt) }}</div>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="schedule-title">{{ s.lead?.name || 'Agendamento Manual' }}</div>
                <div class="schedule-meta">{{ s.project?.name }} · {{ formatTime(s.scheduledAt) }}</div>
                <span class="schedule-status" :class="s.status?.toLowerCase()">{{ translateStatus(s.status) }}</span>
              </div>
            </div>
            <NuxtLink v-if="upcomingSchedulings.length > 0" to="/painel/agendamentos" class="btn btn-ghost btn-sm" style="margin-top: var(--space-4); width: 100%; justify-content: center;">
              Ver agenda completa <i class="pi pi-arrow-right" style="margin-left: 4px; font-size: 0.75rem;"></i>
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>

    <!-- Scheduling Modal -->
    <PainelSchedulingModal
      v-if="showSchedulingModal"
      @close="showSchedulingModal = false"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const { fetchApi } = useApi()
const toast = useToast()

const loading = ref(true)
const error = ref('')
const stats = ref({})
const recentLeads = ref([])
const topRealtors = ref([])
const upcomingSchedulings = ref([])
const showSchedulingModal = ref(false)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [statsRes, leadsRes, metricsRes, schedulingsRes] = await Promise.all([
      fetchApi('/tracking/stats').catch(() => ({})),
      fetchApi('/leads?limit=6').catch(() => ({ data: [] })),
      fetchApi('/agencies/metrics').catch(() => ({ team: [] })),
      fetchApi('/scheduling').catch(() => []),
    ])

    stats.value = {
      totalRealtors: statsRes.totalRealtors || metricsRes.totalRealtors || 0,
      totalLeads: statsRes.totalLeads || 0,
      totalSchedulings: statsRes.totalSchedulings || 0,
      totalSessions: statsRes.totalSessions || 0,
    }

    recentLeads.value = leadsRes.data || leadsRes || []
    if (Array.isArray(recentLeads.value)) {
      recentLeads.value = recentLeads.value.slice(0, 6)
    }

    if (metricsRes && metricsRes.team) {
      topRealtors.value = metricsRes.team
        .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
        .slice(0, 6)
        .map(r => ({
          id: r.id,
          name: r.name,
          sessions: r.sessions || 0,
          leads: r.leads || 0,
          conversionRate: r.conversionRate || 0,
          code: r.code,
        }))
    }

    const now = new Date()
    const allSchedulings = Array.isArray(schedulingsRes) ? schedulingsRes : []
    upcomingSchedulings.value = allSchedulings
      .filter(s => new Date(s.scheduledAt) >= now && ['PENDING', 'CONFIRMED'].includes(s.status))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 4)

  } catch (err) {
    error.value = 'Erro ao carregar dashboard'
    console.error('Error loading dashboard data:', err)
  } finally {
    loading.value = false
  }
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
}

function getMonthShort(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '').toUpperCase()
}

function getDay(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function translateStatus(status) {
  const map = { PENDING: 'Pendente', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', COMPLETED: 'Concluído' }
  return map[status] || status
}

onMounted(loadData)
</script>

<style scoped>
/* Page animation */
.dashboard-imobiliaria {
  animation: fadeSlideIn 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Stat card accent variant */
.stat-card--accent {
  border-color: var(--primary) !important;
  background: linear-gradient(135deg, var(--primary-50) 0%, white 100%);
}

.stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin-bottom: var(--space-3);
}

.stat-icon--blue { background: #e0f2fe; color: var(--primary); }
.stat-icon--green { background: #dcfce7; color: #16a34a; }
.stat-icon--amber { background: #fef3c7; color: #d97706; }
.stat-icon--purple { background: #f3e8ff; color: #9333ea; }

.stat-value--success { color: var(--success); }

/* Dashboard two-column layout */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--space-8);
  margin-top: var(--space-8);
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-sidebar {
    order: -1;
  }
}

/* Lead cell in table */
.lead-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.lead-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--primary-50);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.text-secondary-cell {
  color: var(--gray-500);
  font-size: 0.8125rem;
}

/* Realtor performance cards */
.realtor-perf-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  transition: all var(--transition);
}
.realtor-perf-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}

.realtor-perf-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.rank-num {
  width: 28px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 800;
  flex-shrink: 0;
  background: var(--gray-100);
  color: var(--gray-600);
}
.rank-1 { background: #fee2e2; color: #ef4444; }
.rank-2 { background: #fef3c7; color: #d97706; }
.rank-3 { background: #dcfce7; color: #059669; }

.realtor-perf-name {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.realtor-perf-meta {
  font-size: 0.75rem;
  color: var(--gray-500);
  font-weight: 500;
}

.realtor-perf-conv {
  text-align: right;
  flex-shrink: 0;
}

.conv-value {
  font-weight: 800;
  font-size: 1rem;
  color: var(--primary);
}
.conv-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--gray-400);
  font-weight: 600;
}

/* Sidebar */
.sidebar-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gray-500);
  margin-bottom: var(--space-4);
}

/* Shortcuts */
.shortcut-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-5) var(--space-3);
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all var(--transition);
}
.shortcut-item:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}
.shortcut-item span {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--gray-700);
}

.shortcut-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  margin-bottom: var(--space-2);
}
.shortcut-icon--blue { background: #e0f2fe; color: var(--primary); }
.shortcut-icon--green { background: #dcfce7; color: #16a34a; }
.shortcut-icon--purple { background: #f3e8ff; color: #9333ea; }
.shortcut-icon--amber { background: #fef3c7; color: #d97706; }

/* Schedule preview items */
.schedule-preview-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.schedule-date-pill {
  min-width: 40px;
  padding: var(--space-1) var(--space-2);
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  text-align: center;
  flex-shrink: 0;
}
.schedule-month {
  font-size: 0.5625rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--gray-500);
  letter-spacing: 0.04em;
}
.schedule-day {
  font-size: 1.0625rem;
  font-weight: 900;
  line-height: 1;
  color: var(--gray-900);
}

.schedule-title {
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.schedule-meta {
  font-size: 0.6875rem;
  color: var(--gray-500);
  font-weight: 500;
}

.schedule-status {
  display: inline-block;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  margin-top: 2px;
}
.schedule-status.pending { background: #fef3c7; color: #b45309; }
.schedule-status.confirmed { background: #dcfce7; color: #15803d; }
.schedule-status.cancelled { background: #fee2e2; color: #b91c1c; }
.schedule-status.completed { background: #e0f2fe; color: #0369a1; }

/* Utilities used locally */
.me-2 { margin-right: 0.5rem; }
</style>
