<script setup lang="ts">
const route = useRoute()
const { get, post, delete: del } = useApi()
const toast = useToast()

const campaignId = route.params.id as string
const loading = ref(true)
const performance = ref<any>(null)
const campaign = ref<any>(null)

const investmentForm = ref({
  amount: 0,
  date: getTodayInBrasilia(),
  notes: ''
})

const today = getTodayInBrasilia()

const dateFilter = ref({
  startDate: '',
  endDate: ''
})

const startDateMax = computed(() => dateFilter.value.endDate || today)
const endDateMin = computed(() => dateFilter.value.startDate || undefined)

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime()) && getISODateInBrasilia(parsed) === value
}

function normalizeCampaignDateRange(changedField: 'startDate' | 'endDate') {
  let corrected = false

  if (dateFilter.value.startDate) {
    const normalizedStart = isValidDateInput(dateFilter.value.startDate)
      ? dateFilter.value.startDate <= today
        ? dateFilter.value.startDate
        : today
      : ''

    if (normalizedStart !== dateFilter.value.startDate) {
      dateFilter.value.startDate = normalizedStart
      corrected = true
    }
  }

  if (dateFilter.value.endDate) {
    const normalizedEnd = isValidDateInput(dateFilter.value.endDate)
      ? dateFilter.value.endDate <= today
        ? dateFilter.value.endDate
        : today
      : ''

    if (normalizedEnd !== dateFilter.value.endDate) {
      dateFilter.value.endDate = normalizedEnd
      corrected = true
    }
  }

  if (dateFilter.value.startDate && dateFilter.value.endDate && dateFilter.value.startDate > dateFilter.value.endDate) {
    if (changedField === 'startDate') {
      dateFilter.value.endDate = dateFilter.value.startDate
    } else {
      dateFilter.value.startDate = dateFilter.value.endDate
    }
    toast.warn('Intervalo ajustado automaticamente para manter uma faixa válida.')
    return
  }

  if (corrected) {
    toast.info('Datas inválidas ou futuras foram ajustadas automaticamente.')
  }
}

function applyDateFilter(changedField: 'startDate' | 'endDate') {
  normalizeCampaignDateRange(changedField)
  fetchPerformance()
}

async function fetchPerformance() {
  loading.value = true
  try {
    const [perfData, campData] = await Promise.all([
      get(`/campaigns/${campaignId}/performance`, { params: dateFilter.value }),
      get(`/campaigns/${campaignId}`)
    ])
    performance.value = perfData
    campaign.value = campData
  } catch (error) {
    console.error('Error fetching performance:', error)
    toast.error('Erro ao carregar performance')
  } finally {
    loading.value = false
  }
}

async function addInvestment() {
  if (investmentForm.value.amount <= 0) {
    toast.error('Informe um valor válido')
    return
  }
  try {
    await post(`/campaigns/${campaignId}/investments`, investmentForm.value)
    toast.success('Investimento registrado!')
    investmentForm.value = {
      amount: 0,
      date: getTodayInBrasilia(),
      notes: ''
    }
    fetchPerformance()
  } catch (error) {
    toast.error('Erro ao registrar investimento')
  }
}

async function removeInvestment(id: string) {
  if (!confirm('Excluir este registro de investimento?')) return
  try {
    await del(`/campaigns/${campaignId}/investments/${id}`)
    toast.success('Removido')
    fetchPerformance()
  } catch (error) {
    toast.error('Erro ao remover')
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatPercent(value: number) {
  return (value || 0).toFixed(1) + '%'
}

function getMax(type: 'sessions' | 'leads') {
  if (!performance.value?.dailyStats?.length) return 1;
  const max = Math.max(...performance.value.dailyStats.map((d: any) => d[type]));
  return max || 1;
}

function getBarHeight(value: number, type: 'sessions' | 'leads') {
  const max = getMax(type);
  const maxHeight = 100; // px
  return (value / max) * maxHeight + 'px';
}

onMounted(fetchPerformance)

definePageMeta({
  layout: 'painel'
})
</script>

<template>
  <div class="space-y-6">
    <UiLoadingState v-if="loading && !performance" text="Carregando..." />

    <template v-else-if="campaign && performance">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <NuxtLink to="/painel/campanhas" class="mb-2 inline-flex items-center gap-2 text-sm text-p-text-muted hover:text-p-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar para Campanhas
          </NuxtLink>
          <h1 class="text-xl font-semibold text-p-text md:text-2xl">{{ campaign.name }}</h1>
          <p class="mt-1 text-sm text-p-text-muted">{{ campaign.project?.name }} -- {{ campaign.utmSource }} / {{ campaign.utmMedium || '-' }}</p>
        </div>
        <div class="flex items-center gap-2 text-sm text-p-text-muted">
          <input type="date" v-model="dateFilter.startDate" :max="startDateMax" class="rounded-lg border border-p-border bg-p-raised px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" @change="applyDateFilter('startDate')" />
          <span>até</span>
          <input type="date" v-model="dateFilter.endDate" :min="endDateMin" :max="today" class="rounded-lg border border-p-border bg-p-raised px-3 py-2 text-sm text-p-text focus:border-p-accent focus:outline-none" @change="applyDateFilter('endDate')" />
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
        <UiStatCard :value="formatCurrency(performance.metrics.totalSpent)" label="Investimento Total" :trend="campaign.budget ? `Meta: ${formatCurrency(campaign.budget)} (${formatPercent((performance.metrics.totalSpent / campaign.budget) * 100)})` : undefined" />
        <UiStatCard :value="String(performance.metrics.totalLeads)" label="Total de Leads" :trend="`Conversão: ${formatPercent(performance.metrics.conversionRate)}`" />
        <UiStatCard :value="formatCurrency(performance.metrics.costPerLead)" label="Custo por Lead (CPL)" :trend="`Visitantes: ${performance.metrics.totalSessions}`" />
        <UiStatCard :value="String(performance.metrics.totalWonLeads)" label="Vendas Realizadas" :trend="`Tx. Venda: ${formatPercent(performance.metrics.salesConversionRate)}`" />
        <UiStatCard :value="formatPercent(performance.metrics.roi)" label="ROI da Campanha" :trend="`Retorno: ${formatCurrency(performance.metrics.totalRevenue)}`" />
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
        <!-- Chart -->
        <UiCard>
          <h2 class="mb-6 text-lg font-semibold text-p-text">Histórico da Campanha</h2>
          <div v-if="performance.dailyStats.length > 0" class="flex flex-1 items-end justify-around border-b border-p-border py-8">
            <div v-for="day in performance.dailyStats.slice(-15)" :key="day.date" class="flex flex-col items-center gap-2 w-full">
              <div class="flex items-end gap-1">
                <div class="w-3 rounded-t border border-p-accent bg-p-accent/10" :style="{ height: getBarHeight(day.sessions, 'sessions') }" :title="'Sessões: ' + day.sessions"></div>
                <div class="w-3 rounded-t border border-p-success bg-p-success/10" :style="{ height: getBarHeight(day.leads, 'leads') }" :title="'Leads: ' + day.leads"></div>
              </div>
              <span class="text-[10px] text-p-text-muted">{{ day.date.split('-')[2] }}</span>
            </div>
          </div>
          <div v-else class="py-12 text-center text-sm text-p-text-muted">Sem dados para o período</div>
          <div v-if="performance.dailyStats.length > 0" class="mt-4 flex justify-center gap-6">
            <span class="flex items-center gap-2 text-xs text-p-text-muted"><span class="h-2 w-2 rounded-full bg-p-accent"></span> Sessões</span>
            <span class="flex items-center gap-2 text-xs text-p-text-muted"><span class="h-2 w-2 rounded-full bg-p-success"></span> Leads</span>
          </div>
        </UiCard>

        <!-- Investments -->
        <UiCard>
          <h2 class="mb-4 text-lg font-semibold text-p-text">Registrar Investimento</h2>
          <form @submit.prevent="addInvestment" class="space-y-3">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-p-text-secondary">Valor</label>
              <div class="relative">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-p-text-muted">R$</span>
                <input type="number" step="0.01" v-model="investmentForm.amount" class="w-full rounded-lg border border-p-border bg-p-raised py-2.5 pl-9 pr-3.5 text-sm text-p-text focus:border-p-accent focus:outline-none" required />
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium text-p-text-secondary">Data</label>
              <input type="date" v-model="investmentForm.date" :max="today" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" required />
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium text-p-text-secondary">Observação (Opcional)</label>
              <input type="text" v-model="investmentForm.notes" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: Patrocinado Março" />
            </div>
            <UiButton variant="primary" type="submit" class="w-full">Adicionar</UiButton>
          </form>

          <div class="mt-6">
            <h3 class="mb-4 text-sm font-semibold text-p-text">Histórico Recente</h3>
            <div v-if="performance.investments.length === 0" class="rounded-lg bg-p-raised p-4 text-center text-sm text-p-text-muted">Nenhum investimento registrado</div>
            <div v-for="inv in performance.investments" :key="inv.id" class="flex items-center justify-between border-b border-p-border py-3">
              <div>
                <span class="block text-xs text-p-text-muted">{{ formatDateToBrasilia(inv.date) }}</span>
                <span class="font-semibold text-p-text-secondary">{{ formatCurrency(inv.amount) }}</span>
              </div>
              <button class="rounded-lg p-1.5 text-p-danger hover:bg-p-danger/10 transition-colors" @click="removeInvestment(inv.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </UiCard>
      </div>
    </template>
  </div>
</template>
