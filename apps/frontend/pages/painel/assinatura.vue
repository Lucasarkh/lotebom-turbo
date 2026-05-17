<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import { formatCents } from '@/composables/useBilling'

definePageMeta({ layout: 'painel' })

const route = useRoute()
const { get, post } = useApi()
const toast = useToast()

const loading = ref(true)
const status = ref<any>(null)
const plans = ref<any>(null)
const paymentMethods = ref<any[]>([])
const invoices = ref<any[]>([])
const activeTab = ref<'planos' | 'faturas' | 'metodos'>('planos')

async function fetchAll() {
  loading.value = true
  try {
    const s = await get('/billing/status').catch(() => null)
    const trialActive = !!s?.trialActive

    const [p, pm, inv] = await Promise.all([
      get('/billing/plans').catch(() => null),
      trialActive ? Promise.resolve([]) : get('/billing/payment-methods').catch(() => []),
      trialActive ? Promise.resolve([]) : get('/billing/invoices').catch(() => []),
    ])
    status.value = s
    plans.value = p
    paymentMethods.value = pm || []
    invoices.value = inv || []

    if (trialActive && activeTab.value !== 'planos') {
      activeTab.value = 'planos'
    }
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

async function openPortal() {
  if (status.value?.trialActive) {
    toast.error('A cobrança fica oculta durante o período de teste.')
    return
  }
  try {
    const res = await post('/billing/portal')
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao abrir portal')
  }
}

async function openCheckout() {
  if (status.value?.trialActive) {
    toast.error('A cobrança fica oculta durante o período de teste.')
    return
  }
  try {
    const res = await post('/billing/checkout')
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao abrir checkout')
  }
}

async function subscribeToPlan(projectCount: number) {
  if (status.value?.trialActive) {
    toast.error('A cobrança fica oculta durante o período de teste.')
    return
  }
  try {
    const res = await post('/billing/subscribe', { projectCount })
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao iniciar assinatura')
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const billingStatusMap: Record<string, { label: string; cls: string }> = {
  OK: { label: 'Em dia', cls: 'bg-p-success/15 text-p-success' },
  GRACE_PERIOD: { label: 'Pagamento pendente', cls: 'bg-p-warning/15 text-p-warning' },
  INADIMPLENTE: { label: 'Inadimplente', cls: 'bg-p-danger/15 text-p-danger' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-p-danger/15 text-p-danger' },
}

const statusInfo = computed(() => {
  return billingStatusMap[status.value?.billingStatus] || billingStatusMap['OK']
})

const totalFormatted = computed(() => {
  if (!status.value) return 'R$ 0,00'
  return formatCents(status.value.totalMonthlyCents)
})

const nextDue = computed(() => {
  return formatDate(status.value?.subscription?.currentPeriodEnd)
})

const invoiceStatusMap: Record<string, { label: string; variant: string }> = {
  paid: { label: 'Pago', variant: 'success' },
  open: { label: 'Aberto', variant: 'warning' },
  draft: { label: 'Rascunho', variant: 'neutral' },
  void: { label: 'Cancelado', variant: 'danger' },
  uncollectible: { label: 'Irrecuperável', variant: 'danger' },
}

function getPlanLabel(plan: any) {
  if (plan.isLastTier) return `${plan.projectCount} ou mais`
  if (plan.projectCount === 1) return '1 Projeto'
  return `${plan.projectCount} Projetos`
}

const trialDaysLeft = computed(() => {
  const endDate = status.value?.trialEndDate
  if (!endDate) return 0
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
})

const trialMonthsLabel = computed(() => {
  const months = Number(status.value?.trialMonths || 1)
  return `${months} ${months === 1 ? 'mês' : 'meses'}`
})

const freeProjectsLabel = computed(() => {
  const free = Number(status.value?.freeProjects || 1)
  return `${free} ${free === 1 ? 'Projeto' : 'Projetos'}`
})

const lastTierQty = ref<Record<number, number>>({})

function getLastTierQty(plan: any): number {
  if (lastTierQty.value[plan.projectCount] === undefined) {
    lastTierQty.value[plan.projectCount] = plan.projectCount
  }
  return lastTierQty.value[plan.projectCount] ?? plan.projectCount
}

function setLastTierQty(plan: any, val: number) {
  lastTierQty.value[plan.projectCount] = Math.max(plan.projectCount, val || plan.projectCount)
}

onMounted(async () => {
  // Capture state before clearing params
  const isLimitReached = route.query.limit_reached === 'true'
  const checkoutStatus = route.query.status

  // Clear query params immediately to avoid re-triggering,
  // but keep the state in variables for the logic below
  if (isLimitReached || checkoutStatus) {
    navigateTo('/painel/assinatura', { replace: true })
  }

  // Handle toasts AFTER navigation/cleanup to ensure they survive
  if (isLimitReached) {
    setTimeout(() => {
      toast.error('Limite do plano atingido. Faça upgrade para criar novos projetos.')
    }, 100)
  }

  // After checkout return, trigger billing sync so subscription is ready
  if (checkoutStatus === 'success' || checkoutStatus === 'subscribed') {
    try {
      await post('/billing/sync')
    } catch { /* continue */ }

    setTimeout(() => {
      if (checkoutStatus === 'subscribed') {
        toast.success('Assinatura ativada com sucesso! Agora você pode criar seus projetos.')
      } else {
        toast.success('Forma de pagamento configurada!')
      }
    }, 100)
  }

  await fetchAll()
})
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader title="Minha Assinatura" description="Escolha o plano ideal e gerencie sua assinatura.">
      <template #actions>
        <UiButton v-if="!status?.trialActive" variant="primary" @click="openPortal">
          Gerenciar Pagamento
        </UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" />

    <template v-else-if="status">
      <!-- Free trial banner (active) -->
      <div v-if="status.isOnFreeTier" class="flex items-center gap-3 rounded-xl border border-p-success/30 bg-p-success-subtle p-4 text-p-success">
        <span class="text-lg">*</span>
        <div>
          <strong>Seu período de teste está ativo ({{ trialMonthsLabel }})!</strong>
          <p class="mt-1 text-sm">
            Aproveite para configurar seu loteamento. Restam <strong>{{ trialDaysLeft }}</strong> dia{{ trialDaysLeft !== 1 ? 's' : '' }} de teste.
            Para adicionar mais projetos, escolha um plano abaixo.
          </p>
        </div>
      </div>

      <!-- Trial expired banner -->
      <div v-else-if="status.trialExpired && status.requiresSubscription" class="flex items-center gap-3 rounded-xl border border-p-warning/40 bg-p-warning-subtle p-4 text-p-warning">
        <span class="text-lg">!</span>
        <div>
          <strong>Seu período de teste expirou</strong>
          <p class="mt-1 text-sm">Assine um plano para continuar usando a plataforma e gerenciar seus projetos.</p>
        </div>
      </div>

      <!-- Warning Banners -->
      <div v-if="status.billingStatus === 'GRACE_PERIOD'" class="flex items-center gap-3 rounded-xl border border-p-warning/30 bg-p-warning-subtle p-4 text-p-warning">
        <span class="text-lg">!</span>
        <div class="flex-1">
          <strong>Pagamento pendente</strong>
          <p class="mt-1 text-sm">Regularize até <strong>{{ formatDate(status.gracePeriodEnd) }}</strong> para evitar o bloqueio.</p>
        </div>
        <UiButton variant="primary" size="sm" @click="openPortal">Resolver agora</UiButton>
      </div>

      <div v-if="status.billingStatus === 'INADIMPLENTE'" class="flex items-center gap-3 rounded-xl border border-p-danger/30 bg-p-danger-subtle p-4 text-p-danger">
        <span class="text-lg">X</span>
        <div class="flex-1">
          <strong>Acesso bloqueado por inadimplência</strong>
          <p class="mt-1 text-sm">Entre em contato com o suporte ou regularize o pagamento.</p>
        </div>
        <UiButton variant="danger" size="sm" @click="openPortal">Regularizar</UiButton>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-xl border border-p-border bg-p-elevated p-5 text-center">
          <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">Plano Atual</div>
          <div class="mt-2 text-2xl font-bold text-p-accent">
            <template v-if="status.isOnFreeTier">
              {{ freeProjectsLabel }} <span class="ml-1 inline-block rounded-md bg-p-success/15 px-2 py-0.5 align-middle text-[0.65rem] font-semibold uppercase text-p-success">em teste</span>
            </template>
            <template v-else>
              {{ status.activeProjectCount }} {{ status.activeProjectCount === 1 ? 'Projeto' : 'Projetos' }}
            </template>
          </div>
        </div>
        <div class="rounded-xl border border-p-border bg-p-elevated p-5 text-center">
          <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">Valor Mensal</div>
          <div class="mt-2 text-2xl font-bold text-p-accent">
            <template v-if="status.isOnFreeTier">
              R$ 0,00 <span class="ml-1 inline-block rounded-md bg-p-success/15 px-2 py-0.5 align-middle text-[0.65rem] font-semibold uppercase text-p-success">grátis</span>
            </template>
            <template v-else>
              {{ totalFormatted }}
            </template>
          </div>
        </div>
        <div class="rounded-xl border border-p-border bg-p-elevated p-5 text-center">
          <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">
            <template v-if="status.isOnFreeTier">Fim do Teste</template>
            <template v-else>Próximo Vencimento</template>
          </div>
          <div class="mt-2 text-2xl font-bold text-p-text">
            <template v-if="status.isOnFreeTier && status.trialEndDate">
              {{ formatDate(status.trialEndDate) }}
            </template>
            <template v-else>{{ nextDue }}</template>
          </div>
        </div>
        <div class="rounded-xl border border-p-border bg-p-elevated p-5 text-center">
          <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">Status</div>
          <div class="mt-2">
            <span :class="['inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold', statusInfo?.cls]">
              {{ statusInfo?.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex border-b-2 border-p-border">
        <button :class="['border-b-2 px-5 py-2.5 text-sm font-medium transition-colors -mb-[2px]', activeTab === 'planos' ? 'border-p-accent text-p-accent' : 'border-transparent text-p-text-muted hover:text-p-text-secondary']" @click="activeTab = 'planos'">Planos</button>
        <button v-if="!status.trialActive" :class="['border-b-2 px-5 py-2.5 text-sm font-medium transition-colors -mb-[2px]', activeTab === 'faturas' ? 'border-p-accent text-p-accent' : 'border-transparent text-p-text-muted hover:text-p-text-secondary']" @click="activeTab = 'faturas'">Faturas</button>
        <button v-if="!status.trialActive" :class="['border-b-2 px-5 py-2.5 text-sm font-medium transition-colors -mb-[2px]', activeTab === 'metodos' ? 'border-p-accent text-p-accent' : 'border-transparent text-p-text-muted hover:text-p-text-secondary']" @click="activeTab = 'metodos'">Métodos de Pagamento</button>
      </div>

      <!-- Tab: Plans (Volume Pricing) -->
      <div v-if="activeTab === 'planos'">
        <div v-if="plans && plans.plans.length > 0" class="space-y-6">
          <p class="text-sm leading-relaxed text-p-text-muted">
            Todos os seus projetos compartilham o mesmo desconto por volume.
            Quanto mais projetos, menor o custo por projeto.
          </p>

          <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">
            <div
              v-for="plan in plans.plans"
              :key="plan.projectCount"
              class="relative flex flex-col rounded-2xl border-2 p-5 pt-6 transition-all hover:-translate-y-1 hover:shadow-xl"
              :class="{
                'border-p-accent bg-gradient-to-br from-p-accent/10 to-violet-500/5 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]': plan.isCurrent,
                'border-p-border bg-p-elevated': !plan.isCurrent && plan.projectCount > (plans.paidPlanLevel || 0),
                'border-p-border bg-p-elevated opacity-70': !plan.isCurrent && plan.projectCount < (plans.paidPlanLevel || 0),
              }"
            >
              <!-- Current badge -->
              <div v-if="plan.isCurrent" class="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-p-accent px-4 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-white">Plano Atual</div>

              <!-- Plan header -->
              <div class="mb-4 border-b border-p-border pb-4 text-center">
                <div class="mb-2 text-lg font-bold text-p-text">{{ getPlanLabel(plan) }}</div>
                <!-- Free during trial -->
                <template v-if="status.isOnFreeTier && plan.projectCount <= Math.max(status?.freeProjects || 0, 1)">
                  <div class="text-2xl font-extrabold text-p-success">Gratuito</div>
                  <div class="mt-0.5 text-xs text-p-success/70">durante o período de teste</div>
                  <div class="mt-1 text-xs italic text-p-text-muted">Depois: {{ formatCents(plan.unitPriceCents) }}/mês</div>
                </template>
                <template v-else-if="!plan.isLastTier">
                  <div class="text-2xl font-extrabold text-p-accent">
                    {{ formatCents(plan.totalMonthlyCents) }}
                    <span class="text-sm font-normal text-p-text-muted">/mês</span>
                  </div>
                </template>
                <template v-else>
                  <div class="text-2xl font-extrabold text-p-accent">
                    {{ formatCents(plan.unitPriceCents) }}
                    <span class="text-sm font-normal text-p-text-muted">/projeto/mês</span>
                  </div>
                </template>
              </div>

              <!-- Volume pricing info -->
              <div class="mb-4 flex flex-1 flex-col gap-2">
                <!-- During trial: free tier -->
                <template v-if="status.isOnFreeTier && plan.projectCount <= Math.max(status?.freeProjects || 0, 1)">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-p-text-muted">Valor por projeto</span>
                    <span class="font-semibold text-p-success">R$ 0,00</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-p-text-muted">Total mensal</span>
                    <span class="font-semibold text-p-success">R$ 0,00</span>
                  </div>
                  <div class="flex items-center justify-between text-sm italic text-p-text-muted">
                    <span>Após o teste</span>
                    <span>{{ formatCents(plan.unitPriceCents) }}/mês</span>
                  </div>
                  <div class="mt-1 rounded-lg bg-p-success/15 px-2.5 py-1 text-center text-xs font-bold text-p-success">Grátis por {{ trialDaysLeft }} dia{{ trialDaysLeft !== 1 ? 's' : '' }}</div>
                </template>
                <template v-else>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-p-text-muted">Valor por projeto</span>
                    <span class="font-semibold text-p-text-secondary">{{ formatCents(plan.unitPriceCents) }}</span>
                  </div>
                  <div v-if="!plan.isLastTier" class="flex items-center justify-between text-sm">
                    <span class="text-p-text-muted">Total mensal</span>
                    <span class="font-semibold text-p-accent">{{ formatCents(plan.totalMonthlyCents) }}</span>
                  </div>
                  <div v-else class="space-y-2">
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-p-text-muted">Projetos</span>
                      <div class="flex items-center gap-1">
                        <button class="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-p-border bg-p-raised text-sm font-bold text-p-text-secondary transition-colors hover:border-p-accent hover:text-p-accent" @click="setLastTierQty(plan, getLastTierQty(plan) - 1)">-</button>
                        <input
                          type="number"
                          class="w-[52px] rounded-md border border-p-border bg-p-raised px-1 py-0.5 text-center text-sm font-semibold text-p-text focus:border-p-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          :min="plan.projectCount"
                          :value="getLastTierQty(plan)"
                          @change="setLastTierQty(plan, parseInt(($event.target as HTMLInputElement).value))"
                        />
                        <button class="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-p-border bg-p-raised text-sm font-bold text-p-text-secondary transition-colors hover:border-p-accent hover:text-p-accent" @click="setLastTierQty(plan, getLastTierQty(plan) + 1)">+</button>
                      </div>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-p-text-muted">Total mensal</span>
                      <span class="font-semibold text-p-accent">{{ formatCents(getLastTierQty(plan) * plan.unitPriceCents) }}</span>
                    </div>
                  </div>
                  <div v-if="plan.discountPercent > 0" class="mt-1 rounded-lg bg-p-success/15 px-2.5 py-1 text-center text-xs font-bold text-p-success">
                    {{ plan.discountPercent }}% de desconto
                  </div>
                </template>
              </div>

              <!-- Action -->
              <div class="text-center">
                <template v-if="plan.isCurrent && status.isOnFreeTier && plan.projectCount <= Math.max(status?.freeProjects || 0, 1)">
                  <span class="text-sm font-semibold text-p-success">Grátis por {{ trialDaysLeft }}d</span>
                </template>
                <template v-else-if="plan.isCurrent">
                  <span class="text-sm font-semibold text-p-accent">&#10003; Seu plano atual</span>
                </template>
                <template v-else-if="status.trialActive">
                  <span class="text-sm font-semibold text-p-accent">Cobrança liberada após o teste</span>
                </template>
                <template v-else-if="plan.projectCount > (plans.paidPlanLevel || 0)">
                  <UiButton variant="primary" size="sm" class="w-full" @click="subscribeToPlan(plan.isLastTier ? getLastTierQty(plan) : plan.projectCount)">
                    Fazer upgrade
                  </UiButton>
                </template>
                <template v-else>
                  <span class="text-sm font-medium text-p-success">&#10003; Incluído</span>
                </template>
              </div>
            </div>
          </div>

          <!-- Current projects detail -->
          <div v-if="status.projects.length > 0" class="space-y-4">
            <h3 class="text-base font-semibold text-p-text-secondary">Seus projetos ativos</h3>
            <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
              <div
                v-for="proj in status.projects"
                :key="proj.projectId"
                class="flex items-center justify-between gap-4 rounded-xl border border-p-border bg-p-elevated px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                :class="proj.isFree ? 'border-l-4 border-l-p-success' : 'border-l-4 border-l-p-accent'"
              >
                <div class="flex-1">
                  <div class="text-[0.7rem] font-bold uppercase tracking-wider text-p-text-muted">Projeto #{{ proj.tierNumber }}</div>
                  <h4 class="mt-0.5 text-sm font-semibold text-p-text">{{ proj.projectName }}</h4>
                  <UiBadge v-if="proj.isFree" variant="success" class="mt-1">Gratuito</UiBadge>
                  <UiBadge v-else-if="proj.discountPercent > 0" variant="primary" class="mt-1">
                    {{ proj.discountPercent }}% desc. volume
                  </UiBadge>
                </div>
                <div class="text-right font-bold text-p-text">
                  <template v-if="proj.isFree">
                    <span class="text-p-success">R$ 0</span>
                  </template>
                  <template v-else>
                    {{ formatCents(proj.effectivePriceCents) }}
                  </template>
                  <span class="text-xs font-normal text-p-text-muted">/mês</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <UiEmptyState v-else title="Sem planos" description="Nenhuma tabela de preços configurada. Entre em contato com o suporte." />
      </div>

      <!-- Tab: Invoices -->
      <div v-if="activeTab === 'faturas' && !status.trialActive">
        <div v-if="invoices.length > 0" class="overflow-x-auto rounded-xl border border-p-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-p-border bg-p-raised text-left text-xs font-semibold uppercase tracking-wider text-p-text-muted">
                <th class="px-4 py-3">Período</th>
                <th class="px-4 py-3">Valor</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Pago em</th>
                <th class="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in invoices" :key="inv.id" class="border-b border-p-border last:border-b-0">
                <td class="px-4 py-3 text-p-text">{{ formatDate(inv.periodStart) }} -- {{ formatDate(inv.periodEnd) }}</td>
                <td class="px-4 py-3 text-p-text">{{ formatCents(inv.amountDue) }}</td>
                <td class="px-4 py-3">
                  <UiBadge :variant="(invoiceStatusMap[inv.status]?.variant as any) || 'neutral'">
                    {{ invoiceStatusMap[inv.status]?.label || inv.status }}
                  </UiBadge>
                </td>
                <td class="px-4 py-3 text-p-text-secondary">{{ inv.paidAt ? formatDate(inv.paidAt) : '—' }}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <a v-if="inv.invoiceUrl" :href="inv.invoiceUrl" target="_blank" class="inline-flex items-center rounded-lg border border-p-border px-2.5 py-1 text-xs font-medium text-p-text-secondary hover:bg-p-raised transition-colors">Ver</a>
                    <a v-if="inv.invoicePdf" :href="inv.invoicePdf" target="_blank" class="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium text-p-text-muted hover:text-p-text-secondary transition-colors">PDF</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <UiEmptyState v-else title="Sem faturas" description="Nenhuma fatura encontrada." />
      </div>

      <!-- Tab: Payment Methods -->
      <div v-if="activeTab === 'metodos' && !status.trialActive">
        <div v-if="paymentMethods.length > 0" class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));">
          <div v-for="pm in paymentMethods" :key="pm.id" class="rounded-xl border border-p-border bg-gradient-to-br from-p-raised to-p-elevated p-5">
            <div class="mb-4 text-xs font-bold uppercase text-p-accent">
              <template v-if="pm.type === 'boleto'">BOLETO</template>
              <template v-else>{{ pm.brand?.toUpperCase() || 'CARTÃO' }}</template>
            </div>
            <div v-if="pm.type === 'card'" class="text-lg font-semibold tracking-widest text-p-text">**** **** **** {{ pm.last4 }}</div>
            <div v-else-if="pm.type === 'boleto'" class="text-lg font-semibold tracking-widest text-p-text">CPF/CNPJ ***{{ pm.last4 }}</div>
            <div v-if="pm.expMonth && pm.expYear" class="mt-2 text-sm text-p-text-muted">{{ String(pm.expMonth).padStart(2, '0') }}/{{ pm.expYear }}</div>
          </div>
        </div>
        <div v-else class="space-y-4 py-10 text-center">
          <p class="text-p-text-muted">Nenhum método de pagamento salvo.</p>
          <UiButton variant="primary" @click="openCheckout">Adicionar Cartão de Crédito</UiButton>
          <p class="text-sm text-p-text-muted">
            Boleto estará disponível como opção de pagamento nas suas faturas.
          </p>
        </div>
      </div>
    </template>

    <!-- No subscription -->
    <UiEmptyState
      v-else
      title="Assinatura não configurada"
      description="Sua assinatura ainda não foi configurada. Entre em contato com o suporte."
    />
  </div>
</template>
