<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

definePageMeta({ layout: 'default' })

const { get, post } = useApi()
const toast = useToast()

const loading = ref(true)
const status = ref<any>(null)
const paymentMethods = ref<any[]>([])
const invoices = ref<any[]>([])
const activeTab = ref<'assinatura' | 'faturas' | 'metodos'>('assinatura')

async function fetchAll() {
  loading.value = true
  try {
    const [s, pm, inv] = await Promise.all([
      get('/billing/status').catch(() => null),
      get('/billing/payment-methods').catch(() => []),
      get('/billing/invoices').catch(() => []),
    ])
    status.value = s
    paymentMethods.value = pm || []
    invoices.value = inv || []
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

async function openPortal() {
  try {
    const res = await post('/billing/portal')
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao abrir portal')
  }
}

async function openCheckout() {
  try {
    const res = await post('/billing/checkout')
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao abrir checkout')
  }
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const billingStatusMap: Record<string, { label: string; cls: string; icon: string }> = {
  OK: { label: 'Em dia', cls: 'status-ok', icon: '✅' },
  GRACE_PERIOD: { label: 'Pagamento pendente', cls: 'status-warning', icon: '⚠️' },
  INADIMPLENTE: { label: 'Inadimplente', cls: 'status-danger', icon: '🚫' },
  CANCELLED: { label: 'Cancelado', cls: 'status-danger', icon: '❌' },
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

const activeFeatures = computed(() => {
  return (status.value?.features || []).filter((f: any) => f.isActive)
})

const featureIcons: Record<string, string> = {
  AI_CHAT: '🤖',
  MAP_360: '🌍',
  GOOGLE_API: '📍',
  LEADS: '👥',
  PANORAMA: '🖼️',
  PLANT_MAP: '🗺️',
  SCHEDULING: '📅',
  CAMPAIGNS: '📣',
  NEARBY: '📌',
}

const invoiceStatusMap: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Pago', cls: 'badge-success' },
  open: { label: 'Aberto', cls: 'badge-warning' },
  draft: { label: 'Rascunho', cls: 'badge-outline' },
  void: { label: 'Cancelado', cls: 'badge-error' },
  uncollectible: { label: 'Irrecuperável', cls: 'badge-error' },
}

onMounted(fetchAll)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Minha Assinatura</h1>
        <p class="page-subtitle">Acompanhe seus módulos contratados, faturas e métodos de pagamento.</p>
      </div>
      <button class="btn btn-primary" @click="openPortal">
        💳 Gerenciar Pagamento
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="loader"></div>
    </div>

    <template v-else-if="status">
      <!-- Warning Banners -->
      <div v-if="status.billingStatus === 'GRACE_PERIOD'" class="alert alert-warning mb-6">
        <span>⚠️</span>
        <div>
          <strong>Pagamento pendente</strong>
          <p class="mb-0">Regularize até <strong>{{ formatDate(status.gracePeriodEnd) }}</strong> para evitar o bloqueio dos módulos.</p>
        </div>
        <button class="btn btn-sm btn-warning" @click="openPortal">Resolver agora</button>
      </div>

      <div v-if="status.billingStatus === 'INADIMPLENTE'" class="alert alert-danger mb-6">
        <span>🚫</span>
        <div>
          <strong>Acesso bloqueado por inadimplência</strong>
          <p class="mb-0">Entre em contato com o suporte ou regularize o pagamento.</p>
        </div>
        <button class="btn btn-sm btn-danger" @click="openPortal">Regularizar</button>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid mb-8">
        <div class="summary-card">
          <div class="summary-label">Valor Mensal</div>
          <div class="summary-value primary">{{ totalFormatted }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Próximo Vencimento</div>
          <div class="summary-value">{{ nextDue }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Status</div>
          <div class="summary-value">
            <span :class="['status-badge', statusInfo?.cls]">{{ statusInfo?.icon }} {{ statusInfo?.label }}</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Módulos Ativos</div>
          <div class="summary-value primary">{{ activeFeatures.length }}</div>
        </div>
      </div>

      <!-- Combo Banner -->
      <div v-if="status.combo" class="combo-banner mb-8">
        <div class="combo-banner-icon">📦</div>
        <div class="combo-banner-info">
          <div class="combo-banner-label">Plano Contratado</div>
          <div class="combo-banner-name">{{ status.combo.name }}</div>
          <div v-if="status.combo.description" class="combo-banner-desc">{{ status.combo.description }}</div>
        </div>
        <div v-if="status.combo.discountPercent > 0" class="combo-discount-badge">
          -{{ status.combo.discountPercent }}% desconto
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs mb-6">
        <button :class="['tab', { active: activeTab === 'assinatura' }]" @click="activeTab = 'assinatura'">Módulos</button>
        <button :class="['tab', { active: activeTab === 'faturas' }]" @click="activeTab = 'faturas'">Faturas</button>
        <button :class="['tab', { active: activeTab === 'metodos' }]" @click="activeTab = 'metodos'">Métodos de Pagamento</button>
      </div>

      <!-- Tab: Modules -->
      <div v-if="activeTab === 'assinatura'">
        <div class="features-grid">
          <div v-for="feat in status.features" :key="feat.featureCode" class="feature-card" :class="{ inactive: !feat.isActive }">
            <div class="feature-icon">{{ featureIcons[feat.featureCode] || '📦' }}</div>
            <div class="feature-info">
              <h4>{{ feat.catalogName }}</h4>
              <span class="badge" :class="feat.isActive ? 'badge-success' : 'badge-outline'">
                {{ feat.isActive ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            <div class="feature-price">
              {{ formatCents(feat.priceCents) }}
              <span class="text-sm">/mês</span>
            </div>
          </div>
        </div>
        <div v-if="!status.features?.length" class="empty-state">
          <p>Nenhum módulo contratado. Entre em contato com o suporte.</p>
        </div>
      </div>

      <!-- Tab: Invoices -->
      <div v-if="activeTab === 'faturas'">
        <div class="table-wrapper" v-if="invoices.length > 0">
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Pago em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in invoices" :key="inv.id">
                <td>{{ formatDate(inv.periodStart) }} — {{ formatDate(inv.periodEnd) }}</td>
                <td>{{ formatCents(inv.amountDue) }}</td>
                <td>
                  <span class="badge" :class="invoiceStatusMap[inv.status]?.cls || 'badge-outline'">
                    {{ invoiceStatusMap[inv.status]?.label || inv.status }}
                  </span>
                </td>
                <td>{{ inv.paidAt ? formatDate(inv.paidAt) : '—' }}</td>
                <td>
                  <a v-if="inv.invoiceUrl" :href="inv.invoiceUrl" target="_blank" class="btn btn-sm btn-outline">Ver</a>
                  <a v-if="inv.invoicePdf" :href="inv.invoicePdf" target="_blank" class="btn btn-sm btn-ghost">PDF</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <p>Nenhuma fatura encontrada.</p>
        </div>
      </div>

      <!-- Tab: Payment Methods -->
      <div v-if="activeTab === 'metodos'">
        <div class="payment-methods-grid" v-if="paymentMethods.length > 0">
          <div v-for="pm in paymentMethods" :key="pm.id" class="pm-card">
            <div class="pm-brand">
              <template v-if="pm.type === 'boleto'">📄 BOLETO</template>
              <template v-else>💳 {{ pm.brand?.toUpperCase() || 'CARTÃO' }}</template>
            </div>
            <div class="pm-number" v-if="pm.type === 'card'">•••• •••• •••• {{ pm.last4 }}</div>
            <div class="pm-number" v-else-if="pm.type === 'boleto'">CPF/CNPJ •••{{ pm.last4 }}</div>
            <div class="pm-expiry" v-if="pm.expMonth && pm.expYear">{{ String(pm.expMonth).padStart(2, '0') }}/{{ pm.expYear }}</div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>Nenhum método de pagamento salvo.</p>
          <button class="btn btn-primary mt-4" @click="openCheckout">Adicionar Cartão de Crédito</button>
          <p class="text-sm mt-2" style="color: var(--color-surface-400);">
            Boleto estará disponível como opção de pagamento nas suas faturas.
          </p>
        </div>
      </div>
    </template>

    <!-- No subscription -->
    <div v-else class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4">💳</div>
        <h3 class="fw-bold mb-3">Assinatura não configurada</h3>
        <p class="mb-4 px-4">Sua assinatura ainda não foi configurada pelo administrador. Entre em contato com o suporte.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; color: var(--color-surface-400); margin: 4px 0 0; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.summary-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  text-align: center;
}
.summary-label { font-size: 0.8rem; color: var(--color-surface-400); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.summary-value { font-size: 1.5rem; font-weight: 700; }
.summary-value.primary { color: var(--color-primary-400, #818cf8); }

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 600;
}
.status-ok { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.status-warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--glass-border-subtle);
}
.tab {
  padding: 10px 20px;
  background: none;
  border: none;
  color: var(--color-surface-400);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}
.tab:hover { color: var(--color-surface-200); }
.tab.active {
  color: var(--color-primary-400, #818cf8);
  border-bottom-color: var(--color-primary-400, #818cf8);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.feature-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-left: 4px solid var(--color-primary-500);
  transition: all 0.2s;
}
.feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.feature-card.inactive { opacity: 0.5; border-left-color: var(--color-surface-600); }
.feature-icon { font-size: 1.5rem; }
.feature-info { flex: 1; }
.feature-info h4 { margin: 0 0 4px; font-size: 0.95rem; font-weight: 600; }
.feature-price { font-weight: 700; font-size: 1rem; text-align: right; white-space: nowrap; }
.feature-price .text-sm { font-size: 0.75rem; color: var(--color-surface-400); font-weight: 400; }

.payment-methods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.pm-card {
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-surface-800) 0%, var(--color-surface-700) 100%);
  border: 1px solid var(--glass-border);
}
.pm-brand { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--color-primary-400); margin-bottom: 16px; }
.pm-number { font-size: 1.1rem; font-weight: 600; letter-spacing: 2px; margin-bottom: 8px; }
.pm-expiry { font-size: 0.85rem; color: var(--color-surface-400); }

.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
}
.alert p { margin: 4px 0 0; font-size: 0.85rem; }
.alert-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; }
.alert-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
.btn-warning { background: #f59e0b; color: #1a1a2e; }
.btn-danger { background: #ef4444; color: white; }

.empty-state { text-align: center; padding: 40px; color: var(--color-surface-400); }

.combo-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
}
.combo-banner-icon { font-size: 2rem; }
.combo-banner-info { flex: 1; }
.combo-banner-label { font-size: 0.75rem; text-transform: uppercase; color: var(--color-surface-400); font-weight: 600; letter-spacing: 1px; }
.combo-banner-name { font-size: 1.1rem; font-weight: 700; color: #a78bfa; margin-top: 2px; }
.combo-banner-desc { font-size: 0.85rem; color: var(--color-surface-300); margin-top: 4px; }
.combo-discount-badge {
  background: #10b981;
  color: white;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.badge-success { background: #10b981; color: white; }
.badge-warning { background: #f59e0b; color: #1a1a2e; }
.badge-error { background: #ef4444; color: white; }
.badge-outline { border: 1px solid var(--glass-border); background: transparent; }
.mb-6 { margin-bottom: 24px; }
.mb-8 { margin-bottom: 32px; }
.text-sm { font-size: 0.85rem; }
</style>
