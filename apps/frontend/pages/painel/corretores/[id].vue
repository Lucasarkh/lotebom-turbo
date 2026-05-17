<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { get } = useApi()
const toast = useToast()

// Guard
if (!auth.isLoteadora && !auth.isImobiliaria && !auth.isSysAdmin) {
  router.replace(auth.getDashboardRoute())
}

const id = computed(() => route.params.id as string)
const loading = ref(true)
const stats = ref<any>(null)

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  NEW:         { label: 'Novo',        color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  QUALIFIED:   { label: 'Qualificado', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  RESERVATION: { label: 'Reserva',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  SOLD:        { label: 'Vendido',     color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  LOST:        { label: 'Perdido',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  CANCELED:    { label: 'Cancelado',   color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
}

function statusLabel(s: string | number) { return statusConfig[String(s)]?.label ?? String(s) }
function statusColor(s: string | number) { return statusConfig[String(s)]?.color ?? '#9ca3af' }
function statusBg(s: string | number)    { return statusConfig[String(s)]?.bg    ?? 'rgba(156,163,175,0.12)' }

function formatDate(d: string) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

async function fetchStats() {
  loading.value = true
  try {
    stats.value = await get(`/realtor-links/${id.value}/stats`)
  } catch {
    toast.error('Erro ao carregar dados do corretor')
    router.replace('/painel/corretores')
  } finally {
    loading.value = false
  }
}

// View all leads of this corretor
function viewAllLeads() {
  router.push({ path: '/painel/leads', query: { realtorLinkId: id.value } })
}

onMounted(fetchStats)

definePageMeta({ layout: 'painel' })
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Back + header -->
    <div>
      <NuxtLink to="/painel/corretores" class="mb-2 inline-flex items-center gap-1.5 text-sm text-p-text-muted transition-colors hover:text-p-text-secondary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        Voltar
      </NuxtLink>

      <div v-if="!loading && stats" class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-p-accent bg-p-accent/15 text-xl font-bold text-p-accent">{{ stats.name?.[0]?.toUpperCase() ?? '?' }}</div>
          <div>
            <div class="text-xl font-bold text-p-text">{{ stats.name }}</div>
            <div class="mt-0.5 text-[13px] text-p-text-muted">Código: <span class="rounded-full border border-p-border bg-p-overlay px-2 py-px font-mono text-xs text-p-text-secondary">{{ stats.code }}</span></div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <UiBadge :variant="stats.enabled ? 'success' : 'neutral'" size="md">
            {{ stats.enabled ? 'Ativo' : 'Inativo' }}
          </UiBadge>
          <UiButton variant="primary" @click="viewAllLeads">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            Ver todos os leads
          </UiButton>
        </div>
      </div>

      <div v-if="loading" class="h-[52px] animate-pulse rounded-lg bg-p-overlay"></div>
    </div>

    <div v-if="loading">
      <div class="h-[200px] animate-pulse rounded-xl bg-p-overlay"></div>
    </div>

    <template v-else-if="stats">
      <!-- Info card -->
      <UiCard>
        <div class="flex flex-wrap gap-4 gap-x-8">
          <div v-if="stats.email" class="flex items-center gap-2 text-sm text-p-text-secondary">
            <svg class="shrink-0 text-p-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>{{ stats.email }}</span>
          </div>
          <div v-if="stats.phone" class="flex items-center gap-2 text-sm text-p-text-secondary">
            <svg class="shrink-0 text-p-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 010 .22 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92"/></svg>
            <span>{{ stats.phone }}</span>
          </div>
          <div v-if="stats.creci" class="flex items-center gap-2 text-sm text-p-text-secondary">
            <svg class="shrink-0 text-p-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            <span>CRECI: {{ stats.creci }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-p-text-secondary">
            <svg class="shrink-0 text-p-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
            <span>Cadastrado em {{ formatDate(stats.createdAt) }}</span>
          </div>
        </div>
      </UiCard>

      <!-- Stats grid -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <UiCard padding="md">
          <div class="flex h-10 w-10 items-center justify-center rounded-[10px]" style="background: rgba(96,165,250,0.1); color: #60a5fa;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="mt-2 text-[1.75rem] font-bold leading-none text-p-text">{{ stats.totalLeads }}</div>
          <div class="mt-1 text-[13px] text-p-text-muted">Total de Leads</div>
        </UiCard>

        <UiCard padding="md">
          <div class="flex h-10 w-10 items-center justify-center rounded-[10px]" style="background: rgba(251,191,36,0.1); color: #fbbf24;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div class="mt-2 text-[1.75rem] font-bold leading-none text-p-text">{{ stats.leadsByStatus?.RESERVATION ?? 0 }}</div>
          <div class="mt-1 text-[13px] text-p-text-muted">Reservas</div>
        </UiCard>

        <UiCard padding="md">
          <div class="flex h-10 w-10 items-center justify-center rounded-[10px]" style="background: rgba(52,211,153,0.1); color: #34d399;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="mt-2 text-[1.75rem] font-bold leading-none text-p-text">{{ stats.leadsByStatus?.SOLD ?? 0 }}</div>
          <div class="mt-1 text-[13px] text-p-text-muted">Vendas</div>
        </UiCard>

        <UiCard padding="md">
          <div class="flex h-10 w-10 items-center justify-center rounded-[10px]" style="background: rgba(167,139,250,0.1); color: #a78bfa;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="mt-2 text-[1.75rem] font-bold leading-none text-p-text">{{ stats.schedulingCount }}</div>
          <div class="mt-1 text-[13px] text-p-text-muted">Visitas Agendadas</div>
        </UiCard>

        <UiCard padding="md">
          <div class="flex h-10 w-10 items-center justify-center rounded-[10px]" style="background: rgba(251,146,60,0.1); color: #fb923c;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="mt-2 text-[1.75rem] font-bold leading-none text-p-text">{{ stats.sessionCount }}</div>
          <div class="mt-1 text-[13px] text-p-text-muted">Sessões via Link</div>
        </UiCard>

        <UiCard padding="md">
          <div class="flex h-10 w-10 items-center justify-center rounded-[10px]" style="background: rgba(248,113,113,0.1); color: #f87171;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div class="mt-2 text-[1.75rem] font-bold leading-none text-p-text">{{ stats.leadsByStatus?.LOST ?? 0 }}</div>
          <div class="mt-1 text-[13px] text-p-text-muted">Leads Perdidos</div>
        </UiCard>
      </div>

      <!-- Status breakdown -->
      <UiCard v-if="stats.totalLeads > 0">
        <h2 class="mb-4 text-base font-semibold text-p-text">Distribuição por Status</h2>
        <div class="flex flex-col gap-2.5">
          <template v-for="(count, status) in stats.leadsByStatus" :key="status">
            <div v-if="count > 0" class="flex items-center gap-3">
              <div class="flex w-[120px] shrink-0 items-center gap-2">
                <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: statusColor(status) }"></span>
                <span class="text-sm text-p-text-secondary whitespace-nowrap">{{ statusLabel(status) }}</span>
              </div>
              <div class="flex-1 h-1.5 rounded-full bg-p-overlay overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" :style="{ width: (count / stats.totalLeads * 100) + '%', background: statusColor(status) }"></div>
              </div>
              <span class="w-10 shrink-0 text-right text-sm font-semibold text-p-text-secondary">{{ count }}</span>
            </div>
          </template>
        </div>
      </UiCard>

      <!-- Recent leads -->
      <UiCard v-if="stats.recentLeads?.length" padding="none">
        <div class="flex items-center justify-between px-5 py-4">
          <h2 class="text-base font-semibold text-p-text">Leads Recentes</h2>
          <UiButton variant="ghost" size="sm" @click="viewAllLeads">
            Ver todos
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
          </UiButton>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-y border-p-border bg-p-raised/50">
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Nome</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Projeto</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Status</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-p-text-secondary">Data</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-p-border">
              <tr v-for="lead in stats.recentLeads" :key="lead.id">
                <td class="px-4 py-3">
                  <div class="font-medium text-p-text">{{ lead.name }}</div>
                  <div class="text-xs text-p-text-muted">{{ lead.email }}</div>
                </td>
                <td class="px-4 py-3 text-sm text-p-text-secondary">{{ lead.project?.name ?? '-' }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" :style="{ color: statusColor(lead.status), background: statusBg(lead.status) }">
                    {{ statusLabel(lead.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-p-text-secondary">{{ formatDate(lead.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </template>
  </div>
</template>
