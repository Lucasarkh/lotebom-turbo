<template>
  <div>
    <!-- Header -->
    <UiPageHeader :title="`Olá, ${auth.user?.name?.split(' ')[0]}`" description="Resumo da performance da sua equipe.">
      <template #actions>
        <UiButton variant="primary" to="/painel/corretores">
          <i class="pi pi-user-plus mr-2"></i>Novo Corretor
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <UiLoadingState v-if="loading" text="Carregando painel..." />

    <!-- Error -->
    <div v-else-if="error" class="mt-6">
      <UiAlert variant="error" :title="error">
        <template #default>
          <UiButton variant="primary" size="sm" class="mt-3" @click="loadData">Tentar novamente</UiButton>
        </template>
      </UiAlert>
    </div>

    <template v-else>
      <!-- Stats -->
      <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <UiCard padding="md">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500"><i class="pi pi-users"></i></div>
          <div class="text-2xl font-bold text-p-text">{{ stats.totalRealtors || 0 }}</div>
          <CommonAppTooltip text="Número de corretores vinculados e ativos na sua equipe." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Corretores ativos</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"><i class="pi pi-target"></i></div>
          <div class="text-2xl font-bold text-p-success">{{ stats.totalLeads || 0 }}</div>
          <CommonAppTooltip text="Total de leads gerados por toda a equipe desde o início." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Leads acumulados</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"><i class="pi pi-calendar"></i></div>
          <div class="text-2xl font-bold text-p-text">{{ stats.totalSchedulings || 0 }}</div>
          <CommonAppTooltip text="Total de agendamentos de visitas ao stand de vendas registrados." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Visitas ao stand</div></CommonAppTooltip>
        </UiCard>
        <UiCard padding="md">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500"><i class="pi pi-chart-bar"></i></div>
          <div class="text-2xl font-bold text-p-text">{{ stats.totalSessions || 0 }}</div>
          <CommonAppTooltip text="Total de sessões (visitas ao site) nos últimos 30 dias geradas pela equipe." position="bottom"><div class="mt-0.5 text-sm text-p-text-muted">Acessos (30 dias)</div></CommonAppTooltip>
        </UiCard>
      </div>

      <!-- Main content: two columns -->
      <div class="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1fr_340px]">
        <!-- Left column -->
        <div class="space-y-8">
          <!-- Recent Leads -->
          <UiCard padding="none">
            <div class="flex items-center justify-between border-b border-p-border px-5 py-4">
              <div>
                <h3 class="text-base font-semibold text-p-text">Leads Recentes</h3>
                <p class="mt-0.5 text-sm text-p-text-muted">Últimos leads gerados pela equipe</p>
              </div>
              <UiButton variant="ghost" size="sm" to="/painel/leads">
                Ver todos <i class="pi pi-arrow-right ml-1 text-xs"></i>
              </UiButton>
            </div>

            <UiTable>
              <template #head>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Lead</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Corretor</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Contato</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data</th>
              </template>
              <tr v-for="lead in recentLeads" :key="lead.id">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p-accent/15 text-xs font-bold text-p-accent">{{ lead.name?.charAt(0) || '?' }}</div>
                    <strong class="text-sm text-p-text">{{ lead.name }}</strong>
                  </div>
                </td>
                <td class="px-4 py-3"><UiBadge variant="neutral">{{ lead.realtorLink?.name || 'Direto' }}</UiBadge></td>
                <td class="px-4 py-3 text-sm text-p-text-secondary">{{ lead.phone || '—' }}</td>
                <td class="px-4 py-3"><LeadsLeadStatusBadge :status="lead.status" /></td>
                <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDate(lead.createdAt) }}</td>
              </tr>
              <tr v-if="!recentLeads.length">
                <td colspan="5">
                  <UiEmptyState
                    title="Nenhum lead registrado"
                    description="Os leads aparecerão aqui quando seus corretores começarem a indicar."
                    icon="📥"
                  />
                </td>
              </tr>
            </UiTable>
          </UiCard>

          <!-- Top Performance -->
          <div>
            <h2 class="mb-5 text-lg font-semibold text-p-text">Top Performance</h2>
            <div v-if="topRealtors.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UiCard v-for="(r, i) in topRealtors" :key="r.id" padding="md" class="flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold"
                    :class="{
                      'bg-red-500/10 text-red-500': i === 0,
                      'bg-amber-500/10 text-amber-500': i === 1,
                      'bg-emerald-500/10 text-emerald-500': i === 2,
                      'bg-p-overlay text-p-text-secondary': i > 2
                    }"
                  >#{{ i + 1 }}</div>
                  <div class="min-w-0">
                    <div class="truncate text-sm font-bold text-p-text">{{ r.name }}</div>
                    <div class="text-xs font-medium text-p-text-secondary">{{ r.sessions }} acessos · {{ r.leads }} leads</div>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <span class="text-base font-extrabold text-p-accent">{{ r.conversionRate }}%</span>
                  <span class="block text-[11px] font-semibold text-p-text-muted">conv.</span>
                </div>
              </UiCard>
            </div>
            <UiCard v-else>
              <UiEmptyState
                title="Aguardando dados"
                description="A performance aparecerá quando seus corretores tiverem atividade."
                icon="📊"
              />
            </UiCard>
          </div>
        </div>

        <!-- Right column (sidebar) -->
        <div class="space-y-8 xl:order-none order-first">
          <div>
            <h4 class="mb-4 text-xs font-bold uppercase tracking-wider text-p-text-secondary">Atalhos</h4>
            <div class="grid grid-cols-2 gap-3">
              <NuxtLink to="/painel/corretores" class="flex flex-col items-center justify-center rounded-xl border border-p-border bg-p-elevated p-5 transition-all hover:-translate-y-0.5 hover:border-p-accent hover:shadow-lg">
                <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-lg text-blue-500"><i class="pi pi-users"></i></div>
                <span class="text-xs font-bold text-p-text">Equipe</span>
              </NuxtLink>
              <NuxtLink to="/painel/leads" class="flex flex-col items-center justify-center rounded-xl border border-p-border bg-p-elevated p-5 transition-all hover:-translate-y-0.5 hover:border-p-accent hover:shadow-lg">
                <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-lg text-emerald-500"><i class="pi pi-list"></i></div>
                <span class="text-xs font-bold text-p-text">Leads</span>
              </NuxtLink>
              <NuxtLink to="/painel/metricas-imobiliaria" class="flex flex-col items-center justify-center rounded-xl border border-p-border bg-p-elevated p-5 transition-all hover:-translate-y-0.5 hover:border-p-accent hover:shadow-lg">
                <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-lg text-purple-500"><i class="pi pi-chart-line"></i></div>
                <span class="text-xs font-bold text-p-text">Métricas</span>
              </NuxtLink>
              <div class="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-p-border bg-p-elevated p-5 transition-all hover:-translate-y-0.5 hover:border-p-accent hover:shadow-lg" @click="showSchedulingModal = true">
                <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-lg text-amber-500"><i class="pi pi-calendar-plus"></i></div>
                <span class="text-xs font-bold text-p-text">Agendar</span>
              </div>
            </div>
          </div>

          <!-- Upcoming Schedulings -->
          <div>
            <h4 class="mb-4 text-xs font-bold uppercase tracking-wider text-p-text-secondary">Próximos Agendamentos</h4>
            <UiCard>
              <UiEmptyState
                v-if="upcomingSchedulings.length === 0"
                title="Nenhum agendamento próximo"
                icon="📅"
              />
              <template v-else>
                <div v-for="(s, idx) in upcomingSchedulings" :key="s.id" class="flex items-start gap-3" :class="{ 'mt-3': idx > 0 }">
                  <div class="flex shrink-0 flex-col items-center rounded-lg border border-p-border bg-p-overlay px-2 py-1 text-center">
                    <div class="text-[9px] font-extrabold uppercase tracking-wider text-p-text-secondary">{{ getMonthShort(s.scheduledAt) }}</div>
                    <div class="text-lg font-black leading-none text-p-text">{{ getDay(s.scheduledAt) }}</div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-bold text-p-text">{{ s.lead?.name || 'Agendamento Manual' }}</div>
                    <div class="text-[11px] font-medium text-p-text-secondary">{{ s.project?.name }} · {{ formatTime(s.scheduledAt) }}</div>
                    <UiBadge
                      :variant="{ pending: 'warning', confirmed: 'success', cancelled: 'danger', completed: 'info' }[s.status?.toLowerCase()] || 'neutral'"
                      class="mt-1"
                    >{{ translateStatus(s.status) }}</UiBadge>
                  </div>
                </div>
                <UiButton v-if="upcomingSchedulings.length > 0" variant="ghost" size="sm" to="/painel/agendamentos" class="mt-4 w-full justify-center">
                  Ver agenda completa <i class="pi pi-arrow-right ml-1 text-xs"></i>
                </UiButton>
              </template>
            </UiCard>
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
