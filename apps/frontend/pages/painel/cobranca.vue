<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

definePageMeta({ layout: 'painel' })

const { get, post, put, delete: del } = useApi()
const toast = useToast()

// ─── State ────────────────────────────────────────────
const loading = ref(true)
const tenants = ref<any[]>([])
const pricingTables = ref<any[]>([])
const selectedTenant = ref<any>(null)
const showPricingTableModal = ref(false)
const showAssignModal = ref(false)
const showAnchorModal = ref(false)
const showLimitsModal = ref(false)
const showTrialModal = ref(false)
const saving = ref(false)

// ─── Pricing Table form (volume pricing) ──────────────
const pricingTableForm = ref({
  id: null as string | null,
  name: '',
  description: '',
  basePriceReais: '',
  volumeTiers: [] as { projectNumber: number; discountPercent: number }[],
})

// ─── Assign Pricing Table form ────────────────────────
const assignForm = ref({
  pricingTableId: '',
  discountPercent: 0,
  freeProjects: 0,
})

// ─── Billing Anchor ──────────────────────────────────
const billingDay = ref<number | null>(null)

// ─── Trial Control ──────────────────────────────────
const trialForm = ref({
  trialMonths: 1,
})

// ─── Tenant Limits (read-only view) ──────────────────
const tenantLimits = ref<any>(null)

// ─── Fetch Data ───────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const [tenantsRes, tablesRes] = await Promise.all([
      get('/tenants').catch(() => []),
      get('/billing/admin/pricing-tables').catch(() => []),
    ])
    tenants.value = Array.isArray(tenantsRes) ? tenantsRes : tenantsRes?.data || []
    pricingTables.value = tablesRes || []
  } catch (e: any) {
    toast.error('Erro ao carregar dados: ' + e.message)
  } finally {
    loading.value = false
  }
}

// ─── Pricing Table CRUD ──────────────────────────────
function openPricingTableModal(table?: any) {
  if (table && table.tiers?.length > 0) {
    const sorted = [...table.tiers].sort((a: any, b: any) => a.projectNumber - b.projectNumber)
    const baseCents = sorted[0].priceCents
    pricingTableForm.value = {
      id: table.id,
      name: table.name,
      description: table.description || '',
      basePriceReais: (baseCents / 100).toFixed(2),
      volumeTiers: sorted.slice(1).map((t: any) => ({
        projectNumber: t.projectNumber,
        discountPercent: baseCents > 0 ? Math.round((1 - t.priceCents / baseCents) * 100) : 0,
      })),
    }
  } else {
    pricingTableForm.value = {
      id: null,
      name: '',
      description: '',
      basePriceReais: '',
      volumeTiers: [{ projectNumber: 2, discountPercent: 10 }],
    }
  }
  showPricingTableModal.value = true
}

function addVolumeTier() {
  const last = pricingTableForm.value.volumeTiers[pricingTableForm.value.volumeTiers.length - 1]
  pricingTableForm.value.volumeTiers.push({
    projectNumber: (last?.projectNumber || 1) + 1,
    discountPercent: 0,
  })
}

function removeVolumeTier(idx: number) {
  pricingTableForm.value.volumeTiers.splice(idx, 1)
}

async function savePricingTable() {
  saving.value = true
  try {
    const baseCents = Math.round(Number(pricingTableForm.value.basePriceReais) * 100)
    if (isNaN(baseCents) || baseCents <= 0) {
      toast.error('Preencha o preço base por projeto corretamente.')
      saving.value = false
      return
    }

    const tiers = [
      { projectNumber: 1, priceCents: baseCents },
      ...pricingTableForm.value.volumeTiers.map((vt) => ({
        projectNumber: Number(vt.projectNumber),
        priceCents: Math.round(baseCents * (1 - (vt.discountPercent || 0) / 100)),
      })),
    ]

    if (tiers.some((t) => isNaN(t.priceCents) || t.priceCents < 0)) {
      toast.error('Valores inválidos nos tiers.')
      saving.value = false
      return
    }

    await post('/billing/admin/pricing-tables', {
      id: pricingTableForm.value.id || undefined,
      name: pricingTableForm.value.name,
      description: pricingTableForm.value.description || undefined,
      tiers,
    })
    toast.success('Tabela de preços salva')
    showPricingTableModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar tabela')
  } finally {
    saving.value = false
  }
}

async function deletePricingTable(tableId: string) {
  if (!confirm('Excluir esta tabela de preços?')) return
  try {
    await del(`/billing/admin/pricing-tables/${tableId}`)
    toast.success('Tabela de preços excluída')
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao excluir tabela')
  }
}

// ─── Assign Pricing Table to Tenant ──────────────────
function openAssignModal(tenant: any) {
  selectedTenant.value = tenant
  assignForm.value = {
    pricingTableId: tenant.pricingTableId || '',
    discountPercent: tenant.discountPercent || 0,
    freeProjects: tenant.freeProjects ?? 0,
  }
  showAssignModal.value = true
}

async function saveAssign() {
  if (!selectedTenant.value || !assignForm.value.pricingTableId) return
  saving.value = true
  try {
    await put(`/billing/admin/tenants/${selectedTenant.value.id}/pricing-table`, {
      pricingTableId: assignForm.value.pricingTableId,
      discountPercent: Number(assignForm.value.discountPercent) || 0,
      freeProjects: Number(assignForm.value.freeProjects) || 0,
    })
    toast.success(`Tabela de preços atribuída para ${selectedTenant.value.name}`)
    showAssignModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao atribuir tabela')
  } finally {
    saving.value = false
  }
}

// ─── Tenant Project Limits ───────────────────────────
async function openLimitsModal(tenant: any) {
  selectedTenant.value = tenant
  tenantLimits.value = null
  showLimitsModal.value = true
  try {
    tenantLimits.value = await get(`/billing/admin/tenants/${tenant.id}/project-limits`)
  } catch (e: any) {
    toast.error(e.message || 'Erro ao buscar limites')
  }
}

// ─── Sync Subscription ──────────────────────────────
async function syncSubscription(tenant: any) {
  try {
    await post(`/billing/admin/tenants/${tenant.id}/sync-subscription`)
    toast.success(`Assinatura sincronizada para ${tenant.name}`)
  } catch (e: any) {
    toast.error(e.message || 'Erro ao sincronizar')
  }
}

// ─── Billing Anchor ───────────────────────────────────
function openAnchorModal(tenant: any) {
  selectedTenant.value = tenant
  billingDay.value = tenant.subscriptions?.[0]?.billingDay ?? null
  showAnchorModal.value = true
}

async function saveAnchor() {
  if (!selectedTenant.value || !billingDay.value) return
  saving.value = true
  try {
    await put(`/billing/admin/tenants/${selectedTenant.value.id}/billing-anchor`, {
      billingDay: Number(billingDay.value),
    })
    toast.success('Dia de vencimento atualizado')
    showAnchorModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar')
  } finally {
    saving.value = false
  }
}

function openTrialModal(tenant: any) {
  selectedTenant.value = tenant
  trialForm.value = {
    trialMonths: Number(tenant?.trialMonths || 1),
  }
  showTrialModal.value = true
}

async function saveTrial() {
  if (!selectedTenant.value) return
  saving.value = true
  try {
    await put(`/billing/admin/tenants/${selectedTenant.value.id}/trial`, {
      trialMonths: Number(trialForm.value.trialMonths),
    })
    toast.success(`Período de teste atualizado para ${selectedTenant.value.name}`)
    showTrialModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao configurar período de teste')
  } finally {
    saving.value = false
  }
}

async function interruptTrial(tenant: any) {
  if (!confirm(`Interromper o período de teste de ${tenant.name} agora?`)) return
  try {
    await post(`/billing/admin/tenants/${tenant.id}/trial/interrupt`)
    toast.success(`Período de teste interrompido para ${tenant.name}`)
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao interromper período de teste')
  }
}

// ─── Fix Payment Methods (for existing subscriptions) ─
async function fixPaymentMethods(tenant: any) {
  try {
    await post(`/billing/admin/tenants/${tenant.id}/fix-payment-methods`)
    toast.success(`Métodos de pagamento corrigidos para ${tenant.name} (boleto habilitado)`)
  } catch (e: any) {
    toast.error(e.message || 'Erro ao corrigir métodos de pagamento')
  }
}

// ─── Helpers ──────────────────────────────────────────
function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function addMonths(dateStr: string, months: number) {
  const dt = new Date(dateStr)
  dt.setMonth(dt.getMonth() + Math.max(1, Number(months || 1)))
  return dt
}

function getTrialMeta(tenant: any) {
  const startedAt = tenant?.trialStartedAt
  if (!startedAt) {
    return {
      configured: false,
      active: false,
      endDate: null as Date | null,
    }
  }

  const interrupted = !!tenant?.trialInterruptedAt
  const endDate = addMonths(startedAt, tenant?.trialMonths || 1)
  const active = !interrupted && endDate.getTime() > Date.now()

  return {
    configured: true,
    active,
    endDate,
  }
}

function formatTrialEndDate(tenant: any) {
  const meta = getTrialMeta(tenant)
  if (!meta.endDate) return '—'
  return meta.endDate.toLocaleDateString('pt-BR')
}

function getTenantPricingTableName(tenant: any) {
  if (!tenant.pricingTableId) return '—'
  const table = pricingTables.value.find((t: any) => t.id === tenant.pricingTableId)
  return table?.name || '—'
}

const assignVolumePreview = computed(() => {
  const table = pricingTables.value.find((t: any) => t.id === assignForm.value.pricingTableId)
  if (!table?.tiers?.length) return []
  const sorted = [...table.tiers].sort((a: any, b: any) => a.projectNumber - b.projectNumber)
  const baseCents = sorted[0]?.priceCents || 0
  const addDiscount = assignForm.value.discountPercent || 0
  const freeProjects = assignForm.value.freeProjects || 0

  return sorted.map((t: any, idx: number) => {
    let unitCents = t.priceCents
    if (addDiscount > 0) {
      unitCents = Math.round(unitCents * (1 - addDiscount / 100))
    }
    const isFree = t.projectNumber <= freeProjects
    const paidCount = isFree ? 0 : Math.max(0, t.projectNumber - freeProjects)
    return {
      projectNumber: t.projectNumber,
      unitPriceCents: isFree ? 0 : unitCents,
      totalCents: paidCount * unitCents,
      volumeDiscount: baseCents > 0 ? Math.round((1 - t.priceCents / baseCents) * 100) : 0,
      isFree,
      isLast: idx === sorted.length - 1,
    }
  })
})

/** Computed volume pricing preview for the pricing table form */
const volumePreview = computed(() => {
  const base = Number(pricingTableForm.value.basePriceReais)
  if (!base || base <= 0) return []
  const baseCents = Math.round(base * 100)
  const allTiers = [
    { projectNumber: 1, discountPercent: 0 },
    ...pricingTableForm.value.volumeTiers,
  ]
  return allTiers.map((t, idx) => {
    const unitCents = Math.round(baseCents * (1 - (t.discountPercent || 0) / 100))
    return {
      projectNumber: t.projectNumber,
      unitPriceCents: unitCents,
      totalCents: t.projectNumber * unitCents,
      discountPercent: t.discountPercent || 0,
      isLast: idx === allTiers.length - 1,
    }
  })
})

/** Build volume pricing info from a pricing table for card display */
function computeVolumeTiers(table: any) {
  if (!table?.tiers?.length) return []
  const sorted = [...table.tiers].sort((a: any, b: any) => a.projectNumber - b.projectNumber)
  const baseCents = sorted[0]?.priceCents || 0
  return sorted.map((t: any, idx: number) => ({
    projectNumber: t.projectNumber,
    unitPriceCents: t.priceCents,
    totalCents: t.projectNumber * t.priceCents,
    discountPercent: baseCents > 0 ? Math.round((1 - t.priceCents / baseCents) * 100) : 0,
    isLast: idx === sorted.length - 1,
  }))
}

const billingStatusLabel: Record<string, { label: string; variant: string }> = {
  OK: { label: 'Em dia', variant: 'success' },
  GRACE_PERIOD: { label: 'Pendente', variant: 'warning' },
  INADIMPLENTE: { label: 'Inadimplente', variant: 'danger' },
  CANCELLED: { label: 'Cancelado', variant: 'danger' },
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <UiPageHeader title="Cobrança por Projeto" description="Gerencie tabelas de preço e assinaturas de cada loteadora.">
      <template #actions>
        <UiButton variant="primary" @click="openPricingTableModal()">+ Nova Tabela de Preço</UiButton>
      </template>
    </UiPageHeader>

    <UiLoadingState v-if="loading" />

    <template v-else>
      <!-- Pricing Tables Section -->
      <section class="space-y-4">
        <h2 class="border-b border-p-border pb-2 text-lg font-semibold text-p-text">Tabelas de Preço (Desconto por Volume)</h2>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));">
          <div v-for="table in pricingTables" :key="table.id" class="rounded-xl border-l-4 border-l-violet-500 border border-p-border bg-p-elevated p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div class="mb-3 flex items-start justify-between">
              <div>
                <h4 class="font-bold text-p-text">{{ table.name }}</h4>
                <UiBadge v-if="table.isDefault" variant="primary">Padrão</UiBadge>
              </div>
              <div class="flex gap-2">
                <UiButton variant="secondary" size="sm" @click="openPricingTableModal(table)">Editar</UiButton>
                <UiButton variant="ghost" size="sm" class="text-p-danger" @click="deletePricingTable(table.id)">Excluir</UiButton>
              </div>
            </div>
            <p v-if="table.description" class="mb-3 text-sm text-p-text-muted">{{ table.description }}</p>

            <!-- Volume pricing table -->
            <div class="overflow-hidden rounded-lg border border-p-border">
              <div class="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-2 bg-violet-500/10 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-p-text-muted">
                <span>Quantidade</span>
                <span class="text-right">Valor/Projeto</span>
                <span class="text-right">Total Mensal</span>
                <span class="text-right">Desconto</span>
              </div>
              <div
                v-for="tier in computeVolumeTiers(table)"
                :key="tier.projectNumber"
                class="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-2 border-t border-p-border px-3.5 py-2.5 text-sm"
              >
                <span class="font-semibold text-p-text">{{ tier.projectNumber }}{{ tier.isLast ? ' ou mais' : '' }}</span>
                <span class="text-right text-p-text-secondary">{{ formatCents(tier.unitPriceCents) }}</span>
                <span class="text-right font-semibold text-p-accent">{{ formatCents(tier.totalCents) }}{{ tier.isLast ? '+' : '' }}</span>
                <span class="text-right" :class="tier.discountPercent > 0 ? 'font-bold text-p-success' : 'text-p-text-muted'">
                  {{ tier.discountPercent > 0 ? `${tier.discountPercent}%` : '—' }}
                </span>
              </div>
            </div>

            <div class="mt-2 text-sm text-p-text-muted">
              {{ (table._count?.tenants || 0) }} loteadora(s) usando
            </div>
          </div>
        </div>
        <div v-if="pricingTables.length === 0" class="py-8 text-center text-sm text-p-text-muted">
          Nenhuma tabela de preço cadastrada. Clique em "+ Nova Tabela de Preço" para começar.
        </div>
      </section>

      <!-- Tenants Billing Table -->
      <section class="space-y-4">
        <h2 class="border-b border-p-border pb-2 text-lg font-semibold text-p-text">Assinaturas por Loteadora</h2>
        <div class="overflow-x-auto rounded-xl border border-p-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-p-border bg-p-raised text-left text-xs font-semibold uppercase tracking-wider text-p-text-muted">
                <th class="px-4 py-3">Loteadora</th>
                <th class="px-4 py-3">Tabela de Preço</th>
                <th class="px-4 py-3">Desc. Adicional / Grátis</th>
                <th class="px-4 py-3">Período de Teste</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Stripe</th>
                <th class="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tenants" :key="t.id" class="border-b border-p-border last:border-b-0">
                <td class="px-4 py-3">
                  <div class="font-semibold text-p-text">{{ t.name }}</div>
                  <div class="text-xs text-p-text-muted">{{ t.slug }}</div>
                </td>
                <td class="px-4 py-3">
                  <UiBadge v-if="t.pricingTableId" variant="primary">{{ getTenantPricingTableName(t) }}</UiBadge>
                  <span v-else class="text-xs text-p-text-muted">Auto (padrão)</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <UiBadge v-if="t.discountPercent > 0" variant="success">-{{ t.discountPercent }}% add.</UiBadge>
                    <UiBadge v-if="t.freeProjects > 0" variant="neutral">{{ t.freeProjects }} grátis</UiBadge>
                    <span v-if="!t.discountPercent && !t.freeProjects" class="text-xs text-p-text-muted">—</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <UiBadge v-if="getTrialMeta(t).active" variant="success">Ativo ({{ t.trialMonths || 1 }}m)</UiBadge>
                    <UiBadge v-else-if="t.trialInterruptedAt" variant="warning">Interrompido</UiBadge>
                    <UiBadge v-else-if="t.trialStartedAt" variant="neutral">Encerrado</UiBadge>
                    <span v-else class="text-xs text-p-text-muted">Não iniciado</span>
                    <div v-if="t.trialStartedAt" class="w-full text-xs text-p-text-muted">
                      Fim previsto: {{ formatTrialEndDate(t) }}
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <UiBadge :variant="(billingStatusLabel[t.billingStatus]?.variant as any) || 'default'">
                    {{ billingStatusLabel[t.billingStatus]?.label || t.billingStatus || 'OK' }}
                  </UiBadge>
                </td>
                <td class="px-4 py-3">
                  <code v-if="t.stripeCustomerId" class="text-xs text-p-text-secondary">{{ t.stripeCustomerId }}</code>
                  <span v-else class="text-xs text-p-text-muted">—</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <UiButton variant="primary" size="sm" @click="openAssignModal(t)" title="Atribuir tabela de preço">Tabela</UiButton>
                    <UiButton variant="secondary" size="sm" @click="openLimitsModal(t)" title="Ver limites de projeto">Limites</UiButton>
                    <UiButton variant="secondary" size="sm" @click="openAnchorModal(t)" title="Definir vencimento">Vencimento</UiButton>
                    <UiButton variant="secondary" size="sm" @click="openTrialModal(t)" title="Definir período de teste">Teste</UiButton>
                    <UiButton
                      v-if="getTrialMeta(t).active"
                      variant="ghost"
                      size="sm"
                      class="text-p-warning"
                      @click="interruptTrial(t)"
                      title="Interromper período de teste imediatamente"
                    >Interromper</UiButton>
                    <UiButton variant="primary" size="sm" @click="syncSubscription(t)" title="Sincronizar assinatura no Stripe">Sync</UiButton>
                    <UiButton variant="ghost" size="sm" @click="fixPaymentMethods(t)" title="Habilitar boleto na assinatura existente">Boleto</UiButton>
                  </div>
                </td>
              </tr>
              <tr v-if="tenants.length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-p-text-muted">
                  Nenhuma loteadora cadastrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ─── Pricing Table Modal (Volume Pricing) ───────── -->
    <UiModal v-model="showPricingTableModal" :title="(pricingTableForm.id ? 'Editar' : 'Nova') + ' Tabela de Preço'" size="lg">
      <template #header>
        <div>
          <h2 class="text-lg font-semibold text-p-text">{{ pricingTableForm.id ? 'Editar' : 'Nova' }} Tabela de Preço</h2>
          <p class="mt-1 text-sm text-p-text-muted">
            Defina o preço base por projeto e os descontos por volume.
          </p>
        </div>
      </template>

      <form @submit.prevent="savePricingTable" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Nome da Tabela</label>
            <input v-model="pricingTableForm.name" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Ex: Tabela Padrão" required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Descrição</label>
            <input v-model="pricingTableForm.description" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none" placeholder="Opcional" />
          </div>
        </div>

        <!-- Base price -->
        <div>
          <label class="mb-1 block text-sm font-medium text-p-text-secondary">Preço base por projeto (1 empreendimento)</label>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-p-text-muted">R$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              v-model="pricingTableForm.basePriceReais"
              class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none"
              placeholder="1200.00"
              required
            />
          </div>
        </div>

        <!-- Volume discount tiers -->
        <div>
          <label class="mb-2 block text-sm font-medium text-p-text-secondary">Descontos por Volume</label>
          <p class="mb-3 text-sm text-p-text-muted">
            Quando o cliente tem mais projetos, todos recebem o mesmo desconto de volume.
            O último nível se repete para quantidades maiores.
          </p>

          <div class="space-y-3">
            <!-- Tier 1 is always 0% (base price) -->
            <div class="flex items-center gap-3 opacity-70">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-p-raised text-sm font-bold text-p-accent">#1</div>
              <div class="flex-1 text-sm italic text-p-text-muted">
                1 empreendimento -- preço cheio (sem desconto)
              </div>
            </div>

            <!-- Volume tiers 2+ -->
            <div v-for="(vt, idx) in pricingTableForm.volumeTiers" :key="idx" class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-p-raised text-sm font-bold text-p-accent">#{{ vt.projectNumber }}</div>
              <div class="flex flex-1 items-end gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-[0.7rem] uppercase tracking-wide text-p-text-muted">Empreendimentos</label>
                  <input
                    type="number"
                    min="2"
                    v-model.number="vt.projectNumber"
                    class="w-20 rounded-lg border border-p-border bg-p-raised px-2 py-1.5 text-sm text-p-text focus:border-p-accent focus:outline-none"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[0.7rem] uppercase tracking-wide text-p-text-muted">Desconto (%)</label>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      v-model.number="vt.discountPercent"
                      class="w-20 rounded-lg border border-p-border bg-p-raised px-2 py-1.5 text-sm text-p-text focus:border-p-accent focus:outline-none"
                      required
                    />
                    <span class="text-sm font-semibold text-p-text-muted">%</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 text-p-danger hover:bg-p-danger/10 transition-colors"
                @click="removeVolumeTier(idx)"
              >X</button>
            </div>
          </div>
          <UiButton variant="secondary" size="sm" class="mt-3" type="button" @click="addVolumeTier">
            + Adicionar Nível de Volume
          </UiButton>
        </div>

        <!-- Preview table -->
        <div v-if="volumePreview.length > 0">
          <label class="mb-2 block text-sm font-medium text-p-text-secondary">Pré-visualização</label>
          <div class="overflow-hidden rounded-lg border border-p-border">
            <div class="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-2 bg-violet-500/10 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-p-text-muted">
              <span>Quantidade</span>
              <span class="text-right">Valor/Empreendimento</span>
              <span class="text-right">Valor Total Mensal</span>
              <span class="text-right">Desconto Aplicado</span>
            </div>
            <div v-for="row in volumePreview" :key="row.projectNumber" class="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-2 border-t border-p-border px-3.5 py-2.5 text-sm">
              <span class="font-semibold text-p-text">
                {{ row.projectNumber }}{{ row.isLast ? ' ou mais' : '' }}
                {{ row.projectNumber === 1 ? 'empreendimento' : 'empreendimentos' }}
              </span>
              <span class="text-right text-p-text-secondary">{{ formatCents(row.unitPriceCents) }}</span>
              <span class="text-right font-semibold text-p-accent">{{ formatCents(row.totalCents) }}{{ row.isLast ? '+' : '' }}</span>
              <span class="text-right" :class="row.discountPercent > 0 ? 'font-bold text-p-success' : 'text-p-text-muted'">
                {{ row.discountPercent > 0 ? `${row.discountPercent}%` : '0%' }}
              </span>
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showPricingTableModal = false">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="saving" @click="savePricingTable">
            {{ saving ? 'Salvando...' : 'Salvar Tabela' }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- ─── Assign Pricing Table Modal ─────────────────── -->
    <UiModal v-model="showAssignModal" size="lg">
      <template #header>
        <div>
          <h2 class="text-lg font-semibold text-p-text">Atribuir Tabela -- {{ selectedTenant?.name }}</h2>
          <p class="mt-1 text-sm text-p-text-muted">
            Selecione a tabela de preços e configurações adicionais opcionais.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Tabela de Preço</label>
            <select v-model="assignForm.pricingTableId" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" required>
              <option value="" disabled>Selecione...</option>
              <option v-for="t in pricingTables" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Desconto Adicional (%)</label>
            <input v-model.number="assignForm.discountPercent" type="number" min="0" max="100" step="0.5" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="0" />
            <span class="mt-1 block text-xs text-p-text-muted">Aplicado sobre o preço da tabela</span>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-p-text-secondary">Projetos Grátis</label>
            <input v-model.number="assignForm.freeProjects" type="number" min="0" max="100" step="1" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" placeholder="0" />
          </div>
        </div>

        <!-- Volume pricing preview for this tenant -->
        <div v-if="assignVolumePreview.length > 0">
          <label class="mb-2 block text-sm font-medium text-p-text-secondary">Simulação para este cliente</label>
          <div class="overflow-hidden rounded-lg border border-p-border">
            <div class="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-2 bg-violet-500/10 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-p-text-muted">
              <span>Qtd</span>
              <span class="text-right">Valor/Projeto</span>
              <span class="text-right">Total</span>
              <span class="text-right">Desc. Volume</span>
            </div>
            <div v-for="tier in assignVolumePreview" :key="tier.projectNumber" class="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-2 border-t border-p-border px-3.5 py-2.5 text-sm">
              <span class="font-semibold text-p-text">{{ tier.projectNumber }}{{ tier.isLast ? '+' : '' }}</span>
              <span v-if="tier.isFree" class="text-right text-xs font-bold text-p-success">Grátis</span>
              <span v-else class="text-right text-p-text-secondary">{{ formatCents(tier.unitPriceCents) }}</span>
              <span class="text-right text-p-text-secondary">{{ tier.isFree ? 'R$ 0' : formatCents(tier.totalCents) }}</span>
              <span class="text-right" :class="tier.volumeDiscount > 0 ? 'font-bold text-p-success' : 'text-p-text-muted'">
                {{ tier.volumeDiscount > 0 ? `${tier.volumeDiscount}%` : '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showAssignModal = false">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="saving || !assignForm.pricingTableId" @click="saveAssign">
            {{ saving ? 'Salvando...' : 'Atribuir Tabela' }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- ─── Limits Modal ───────────────────────────────── -->
    <UiModal v-model="showLimitsModal" :title="'Limites — ' + (selectedTenant?.name || '')" size="sm">
      <UiLoadingState v-if="!tenantLimits" />
      <template v-else>
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-lg border border-p-border bg-p-raised p-4 text-center">
            <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">Projetos Ativos</div>
            <div class="mt-1 text-xl font-bold text-p-text">{{ tenantLimits.activeProjectCount }}</div>
          </div>
          <div class="rounded-lg border border-p-border bg-p-raised p-4 text-center">
            <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">Limite Máximo</div>
            <div class="mt-1 text-xl font-bold text-p-text">{{ tenantLimits.maxProjects }}</div>
          </div>
          <div class="rounded-lg border border-p-border bg-p-raised p-4 text-center">
            <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">Pode Criar</div>
            <div class="mt-1 text-xl font-bold" :class="tenantLimits.canCreateProject ? 'text-p-success' : 'text-p-danger'">
              {{ tenantLimits.canCreateProject ? 'Sim' : 'Não' }}
            </div>
          </div>
          <div class="rounded-lg border border-p-border bg-p-raised p-4 text-center">
            <div class="text-xs font-bold uppercase tracking-wide text-p-text-muted">Próximo Projeto</div>
            <div class="mt-1 text-xl font-bold text-p-text">
              <template v-if="tenantLimits.nextProjectPriceCents === 0">Grátis</template>
              <template v-else-if="tenantLimits.nextProjectPriceCents != null">{{ formatCents(tenantLimits.nextProjectPriceCents) }}/mês</template>
              <template v-else>—</template>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UiButton variant="ghost" @click="showLimitsModal = false">Fechar</UiButton>
        </div>
      </template>
    </UiModal>

    <!-- ─── Anchor Modal ───────────────────────────────── -->
    <UiModal v-model="showAnchorModal" :title="'Data de Vencimento — ' + (selectedTenant?.name || '')" size="sm">
      <div class="space-y-4">
        <p class="text-sm text-p-text-muted">
          Defina o dia do mês para vencimento (1 a 28). A primeira cobrança será sempre no mês seguinte.
          O cliente terá 15 dias de tolerância após o vencimento antes de qualquer restrição.
        </p>
        <div>
          <label class="mb-1 block text-sm font-medium text-p-text-secondary">Dia do Vencimento</label>
          <select v-model.number="billingDay" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text focus:border-p-accent focus:outline-none" required>
            <option :value="null" disabled>Selecione o dia...</option>
            <option v-for="d in 28" :key="d" :value="d">Dia {{ d }}</option>
          </select>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showAnchorModal = false">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="saving || !billingDay" @click="saveAnchor">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- ─── Trial Modal ────────────────────────────────── -->
    <UiModal v-model="showTrialModal" :title="'Período de Teste — ' + (selectedTenant?.name || '')" size="sm">
      <div class="space-y-4">
        <p class="text-sm text-p-text-muted">
          Defina por quantos meses a loteadora ficará em teste. Durante esse período,
          o sistema não deve exibir nem vincular cobranças para esse cliente.
        </p>

        <div>
          <label class="mb-1 block text-sm font-medium text-p-text-secondary">Duração do Teste (meses)</label>
          <input
            v-model.number="trialForm.trialMonths"
            type="number"
            min="1"
            max="24"
            step="1"
            class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text placeholder:text-p-text-muted focus:border-p-accent focus:outline-none"
            placeholder="Ex: 3"
            required
          />
        </div>

        <p class="text-xs text-p-text-muted">
          Esta ação reinicia o período de teste a partir de agora e desativa cobrança enquanto durar.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="showTrialModal = false">Cancelar</UiButton>
          <UiButton variant="primary" :disabled="saving || !trialForm.trialMonths" @click="saveTrial">
            {{ saving ? 'Salvando...' : 'Salvar Período de Teste' }}
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
