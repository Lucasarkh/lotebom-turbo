<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

definePageMeta({ layout: 'default' })

const { get, post, put, delete: del } = useApi()
const toast = useToast()

// ─── State ────────────────────────────────────────────
const loading = ref(true)
const tenants = ref<any[]>([])
const catalog = ref<any[]>([])
const combos = ref<any[]>([])
const selectedTenant = ref<any>(null)
const showCatalogModal = ref(false)
const showFeaturesModal = ref(false)
const showAnchorModal = ref(false)
const showComboModal = ref(false)
const showApplyComboModal = ref(false)
const saving = ref(false)

// ─── Catalog form ─────────────────────────────────────
const catalogForm = ref({
  code: '',
  name: '',
  description: '',
  defaultPriceCents: 0,
})

const featureCodes = [
  { value: 'AI_CHAT', label: 'Chat IA' },
  { value: 'MAP_360', label: 'Mapa 360' },
  { value: 'GOOGLE_API', label: 'API Google' },
  { value: 'LEADS', label: 'Leads' },
  { value: 'PANORAMA', label: 'Panorama' },
  { value: 'PLANT_MAP', label: 'Planta Interativa' },
  { value: 'SCHEDULING', label: 'Agendamentos' },
  { value: 'CAMPAIGNS', label: 'Campanhas' },
  { value: 'NEARBY', label: 'Pontos Próximos' },
]

// ─── Tenant features form ─────────────────────────────
const tenantFeatures = ref<any[]>([])
const billingDay = ref<number | null>(null)

// ─── Combo form ───────────────────────────────────────
const comboForm = ref({
  id: '' as string | null,
  name: '',
  description: '',
  discountPercent: 0,
  items: [] as { featureCode: string; overridePriceCents: number | null; useOverride: boolean }[],
})
const applyComboId = ref('')

// ─── Fetch Data ───────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const [tenantsRes, catalogRes, combosRes] = await Promise.all([
      get('/tenants').catch(() => []),
      get('/billing/admin/catalog').catch(() => []),
      get('/billing/admin/combos').catch(() => []),
    ])
    tenants.value = Array.isArray(tenantsRes) ? tenantsRes : tenantsRes?.data || []
    catalog.value = catalogRes || []
    combos.value = combosRes || []
  } catch (e: any) {
    toast.error('Erro ao carregar dados: ' + e.message)
  } finally {
    loading.value = false
  }
}

// ─── Catalog CRUD ─────────────────────────────────────
function openCatalogModal(item?: any) {
  if (item) {
    catalogForm.value = {
      code: item.code,
      name: item.name,
      description: item.description || '',
      defaultPriceCents: item.defaultPriceCents,
    }
  } else {
    catalogForm.value = { code: '', name: '', description: '', defaultPriceCents: 0 }
  }
  showCatalogModal.value = true
}

async function saveCatalog() {
  saving.value = true
  try {
    await post('/billing/admin/catalog', catalogForm.value)
    toast.success('Módulo salvo no catálogo')
    showCatalogModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar')
  } finally {
    saving.value = false
  }
}

// ─── Tenant Features ──────────────────────────────────
async function openFeaturesModal(tenant: any) {
  selectedTenant.value = tenant
  try {
    const sub = await get(`/billing/admin/tenants/${tenant.id}/subscription`)
    // Build features list from catalog with existing subs
    tenantFeatures.value = catalog.value.map((cat: any) => {
      const existing = sub?.features?.find((f: any) => f.featureCode === cat.code)
      return {
        featureCode: cat.code,
        name: cat.name,
        defaultPriceCents: cat.defaultPriceCents,
        isActive: existing ? existing.isActive : false,
        customPriceCents: existing?.customPriceCents ?? null,
        useCustomPrice: existing?.customPriceCents != null,
      }
    })
  } catch {
    // No subscription yet — start fresh from catalog
    tenantFeatures.value = catalog.value.map((cat: any) => ({
      featureCode: cat.code,
      name: cat.name,
      defaultPriceCents: cat.defaultPriceCents,
      isActive: false,
      customPriceCents: null,
      useCustomPrice: false,
    }))
  }
  showFeaturesModal.value = true
}

async function saveFeatures() {
  if (!selectedTenant.value) return
  saving.value = true
  try {
    const features = tenantFeatures.value.map((f: any) => ({
      featureCode: f.featureCode,
      isActive: f.isActive,
      customPriceCents: f.useCustomPrice && f.customPriceCents != null
        ? Number(f.customPriceCents)
        : undefined,
    }))
    await put(`/billing/admin/tenants/${selectedTenant.value.id}/features`, { features })
    toast.success(`Módulos atualizados para ${selectedTenant.value.name}`)
    showFeaturesModal.value = false
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar módulos')
  } finally {
    saving.value = false
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
    await fetchTenants()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar')
  } finally {
    saving.value = false
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

// ─── Combo CRUD ───────────────────────────────────────
function openComboModal(combo?: any) {
  // Only show modules that exist in the catalog
  const catalogItems = catalog.value.map((cat: any) => ({
    value: cat.code,
    label: cat.name,
    defaultPriceCents: cat.defaultPriceCents,
  }))

  if (combo) {
    comboForm.value = {
      id: combo.id,
      name: combo.name,
      description: combo.description || '',
      discountPercent: combo.discountPercent || 0,
      items: catalogItems.map((cat: any) => {
        const existing = combo.items?.find((i: any) => i.featureCode === cat.value)
        return {
          featureCode: cat.value,
          label: cat.label,
          defaultPriceCents: cat.defaultPriceCents,
          overridePriceCents: existing?.overridePriceCents ?? null,
          useOverride: existing?.overridePriceCents != null,
          included: !!existing,
        }
      }),
    }
  } else {
    comboForm.value = {
      id: null,
      name: '',
      description: '',
      discountPercent: 0,
      items: catalogItems.map((cat: any) => ({
        featureCode: cat.value,
        label: cat.label,
        defaultPriceCents: cat.defaultPriceCents,
        overridePriceCents: null,
        useOverride: false,
        included: false,
      })),
    }
  }
  showComboModal.value = true
}

async function saveCombo() {
  saving.value = true
  try {
    const items = comboForm.value.items
      .filter((i: any) => i.included)
      .map((i: any) => ({
        featureCode: i.featureCode,
        overridePriceCents: i.useOverride && i.overridePriceCents != null
          ? Number(i.overridePriceCents)
          : undefined,
      }))

    if (items.length === 0) {
      toast.error('Selecione pelo menos um módulo para o combo.')
      saving.value = false
      return
    }

    await post('/billing/admin/combos', {
      id: comboForm.value.id || undefined,
      name: comboForm.value.name,
      description: comboForm.value.description || undefined,
      discountPercent: Number(comboForm.value.discountPercent) || 0,
      items,
    })
    toast.success('Combo salvo com sucesso')
    showComboModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar combo')
  } finally {
    saving.value = false
  }
}

async function deleteCombo(comboId: string) {
  if (!confirm('Desativar este combo?')) return
  try {
    await del(`/billing/admin/combos/${comboId}`)
    toast.success('Combo desativado')
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao desativar combo')
  }
}

function openApplyComboModal(tenant: any) {
  selectedTenant.value = tenant
  applyComboId.value = ''
  showApplyComboModal.value = true
}

async function applyCombo() {
  if (!selectedTenant.value || !applyComboId.value) return
  saving.value = true
  try {
    await post(`/billing/admin/tenants/${selectedTenant.value.id}/apply-combo`, {
      comboId: applyComboId.value,
    })
    toast.success(`Combo aplicado para ${selectedTenant.value.name}`)
    showApplyComboModal.value = false
  } catch (e: any) {
    toast.error(e.message || 'Erro ao aplicar combo')
  } finally {
    saving.value = false
  }
}

function comboItemCount(combo: any) {
  return combo.items?.length || 0
}

function comboTotalCents(combo: any) {
  if (!combo.items) return 0
  const catalogMap = new Map(catalog.value.map((c: any) => [c.code, c]))
  const total = combo.items.reduce((sum: number, item: any) => {
    const cat = catalogMap.get(item.featureCode)
    const base = item.overridePriceCents ?? cat?.defaultPriceCents ?? 0
    return sum + base
  }, 0)
  // Apply discount
  return combo.discountPercent > 0
    ? Math.round(total * (1 - combo.discountPercent / 100))
    : total
}
function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const totalForTenant = computed(() => {
  return tenantFeatures.value
    .filter((f: any) => f.isActive)
    .reduce((sum: number, f: any) => {
      const price = f.useCustomPrice && f.customPriceCents != null
        ? Number(f.customPriceCents)
        : f.defaultPriceCents
      return sum + price
    }, 0)
})

const billingStatusLabel: Record<string, { label: string; cls: string }> = {
  OK: { label: 'Em dia', cls: 'badge-success' },
  GRACE_PERIOD: { label: 'Pendente', cls: 'badge-warning' },
  INADIMPLENTE: { label: 'Inadimplente', cls: 'badge-error' },
  CANCELLED: { label: 'Cancelado', cls: 'badge-error' },
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Cobrança & Módulos</h1>
        <p class="page-subtitle">Gerencie o catálogo de módulos e as assinaturas de cada loteadora.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="openCatalogModal()">
          + Novo Módulo
        </button>
        <button class="btn btn-accent" @click="openComboModal()">
          📦 Novo Combo
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="loader"></div>
    </div>

    <template v-else>
      <!-- Catalog Section -->
      <section class="mb-8">
        <h2 class="section-title">Catálogo de Módulos</h2>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
          <div v-for="item in catalog" :key="item.id" class="card catalog-card" @click="openCatalogModal(item)">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="fw-bold mb-1">{{ item.name }}</h4>
                <span class="badge badge-outline">{{ item.code }}</span>
              </div>
              <span class="price-tag">{{ formatCents(item.defaultPriceCents) }}/mês</span>
            </div>
            <p v-if="item.description" class="text-sm mt-2" style="color: var(--color-surface-400);">{{ item.description }}</p>
          </div>
        </div>
        <div v-if="catalog.length === 0" class="empty-hint">
          Nenhum módulo cadastrado. Clique em "+ Novo Módulo" para começar.
        </div>
      </section>

      <!-- Combos Section -->
      <section class="mb-8">
        <h2 class="section-title">Combos de Módulos</h2>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
          <div v-for="combo in combos" :key="combo.id" class="card combo-card">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="fw-bold mb-1">📦 {{ combo.name }}</h4>
                <span class="badge badge-outline">{{ comboItemCount(combo) }} módulos</span>
                <span v-if="combo.discountPercent > 0" class="badge badge-success ml-2">
                  -{{ combo.discountPercent }}%
                </span>
              </div>
              <span class="price-tag">{{ formatCents(comboTotalCents(combo)) }}/mês</span>
            </div>
            <p v-if="combo.description" class="text-sm mt-2" style="color: var(--color-surface-400);">{{ combo.description }}</p>
            <div class="combo-features mt-2">
              <span v-for="item in combo.items" :key="item.featureCode" class="badge badge-outline mr-1 mb-1" style="font-size: 0.75rem;">
                {{ catalog.find((c: any) => c.code === item.featureCode)?.name || item.featureCode }}
              </span>
            </div>
            <div class="flex gap-2 mt-3">
              <button class="btn btn-sm btn-outline" @click="openComboModal(combo)">✏️ Editar</button>
              <button class="btn btn-sm btn-ghost" style="color: #ef4444;" @click="deleteCombo(combo.id)">🗑 Excluir</button>
            </div>
          </div>
        </div>
        <div v-if="combos.length === 0" class="empty-hint">
          Nenhum combo criado. Clique em "📦 Novo Combo" para agrupar módulos.
        </div>
      </section>

      <!-- Tenants Billing Table -->
      <section>
        <h2 class="section-title">Assinaturas por Loteadora</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Loteadora</th>
                <th>Status Financeiro</th>
                <th>Stripe Customer</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tenants" :key="t.id">
                <td>
                  <div style="font-weight: 600;">{{ t.name }}</div>
                  <div class="text-sm" style="color: var(--color-surface-400);">{{ t.slug }}</div>
                </td>
                <td>
                  <span class="badge" :class="billingStatusLabel[t.billingStatus]?.cls || 'badge-outline'">
                    {{ billingStatusLabel[t.billingStatus]?.label || t.billingStatus || 'OK' }}
                  </span>
                </td>
                <td>
                  <code v-if="t.stripeCustomerId" class="text-sm">{{ t.stripeCustomerId }}</code>
                  <span v-else class="text-sm" style="color: var(--color-surface-400);">—</span>
                </td>
                <td>
                  <div class="flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-primary" @click="openFeaturesModal(t)" title="Gerenciar módulos">
                      ⚙️ Módulos
                    </button>
                    <button class="btn btn-sm btn-accent" @click="openApplyComboModal(t)" title="Aplicar combo">
                      📦 Combo
                    </button>
                    <button class="btn btn-sm btn-outline" @click="openAnchorModal(t)" title="Definir vencimento">
                      📅 Vencimento
                    </button>
                    <button class="btn btn-sm btn-ghost" @click="fixPaymentMethods(t)" title="Habilitar boleto na assinatura existente">
                      🔧 Fix Boleto
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="tenants.length === 0">
                <td colspan="4" class="text-center py-4" style="color: var(--color-surface-400);">
                  Nenhuma loteadora cadastrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ─── Catalog Modal ──────────────────────────────── -->
    <div v-if="showCatalogModal" class="modal-overlay" @click.self="showCatalogModal = false">
      <div class="modal" style="max-width: 500px;" @click.stop>
        <div class="modal-header">
          <h3>{{ catalogForm.code ? 'Editar' : 'Novo' }} Módulo</h3>
          <button class="modal-close" @click="showCatalogModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveCatalog" class="modal-body">
          <div class="form-group">
            <label class="form-label">Código do Módulo</label>
            <select v-model="catalogForm.code" class="form-input" required>
              <option value="" disabled>Selecione...</option>
              <option v-for="fc in featureCodes" :key="fc.value" :value="fc.value">{{ fc.label }} ({{ fc.value }})</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nome de Exibição</label>
            <input v-model="catalogForm.name" class="form-input" placeholder="Ex: Chat IA" required />
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea v-model="catalogForm.description" class="form-input" rows="2" placeholder="Descrição breve..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Preço Padrão (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              :value="(catalogForm.defaultPriceCents / 100).toFixed(2)"
              @input="catalogForm.defaultPriceCents = Math.round(Number(($event.target as HTMLInputElement).value) * 100)"
              class="form-input"
              placeholder="0.00"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="showCatalogModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Features Modal ──────────────────────────────── -->
    <div v-if="showFeaturesModal" class="modal-overlay" @click.self="showFeaturesModal = false">
      <div class="modal modal-lg" @click.stop>
        <div class="modal-header">
          <div>
            <h3>Módulos — {{ selectedTenant?.name }}</h3>
            <p class="text-sm" style="color: var(--color-surface-400); margin: 0;">
              Ative módulos e defina preços customizados para este cliente.
            </p>
          </div>
          <button class="modal-close" @click="showFeaturesModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="features-list">
            <div v-for="feat in tenantFeatures" :key="feat.featureCode" class="feature-row">
              <div class="flex items-center gap-3" style="flex: 1;">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="feat.isActive" />
                  <span class="toggle-slider"></span>
                </label>
                <div>
                  <div class="fw-bold">{{ feat.name }}</div>
                  <div class="text-sm" style="color: var(--color-surface-400);">
                    Padrão: {{ formatCents(feat.defaultPriceCents) }}/mês
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3" v-if="feat.isActive">
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" v-model="feat.useCustomPrice" />
                  Preço customizado
                </label>
                <input
                  v-if="feat.useCustomPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-input"
                  style="width: 120px;"
                  placeholder="R$"
                  :value="feat.customPriceCents != null ? (feat.customPriceCents / 100).toFixed(2) : ''"
                  @input="feat.customPriceCents = Math.round(Number(($event.target as HTMLInputElement).value) * 100)"
                />
              </div>
            </div>
          </div>

          <div class="total-bar mt-6">
            <span>Total Mensal:</span>
            <strong class="total-value">{{ formatCents(totalForTenant) }}</strong>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showFeaturesModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveFeatures">
            {{ saving ? 'Salvando...' : 'Salvar Módulos' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Anchor Modal ───────────────────────────────── -->
    <div v-if="showAnchorModal" class="modal-overlay" @click.self="showAnchorModal = false">
      <div class="modal" style="max-width: 400px;" @click.stop>
        <div class="modal-header">
          <h3>Data de Vencimento — {{ selectedTenant?.name }}</h3>
          <button class="modal-close" @click="showAnchorModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-sm mb-4" style="color: var(--color-surface-400);">
            Defina o dia do mês para vencimento (1 a 28). A primeira cobrança será sempre no mês seguinte.
            O cliente terá 15 dias de tolerância após o vencimento antes de qualquer restrição.
          </p>
          <div class="form-group">
            <label class="form-label">Dia do Vencimento</label>
            <select v-model.number="billingDay" class="form-input" required>
              <option :value="null" disabled>Selecione o dia...</option>
              <option v-for="d in 28" :key="d" :value="d">Dia {{ d }}</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showAnchorModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving || !billingDay" @click="saveAnchor">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Combo Modal ────────────────────────────────── -->
    <div v-if="showComboModal" class="modal-overlay" @click.self="showComboModal = false">
      <div class="modal modal-lg" @click.stop>
        <div class="modal-header">
          <div>
            <h3>{{ comboForm.id ? 'Editar' : 'Novo' }} Combo</h3>
            <p class="text-sm" style="color: var(--color-surface-400); margin: 0;">
              Agrupe módulos com preços pré-definidos e desconto.
            </p>
          </div>
          <button class="modal-close" @click="showComboModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveCombo" class="modal-body">
          <div class="grid gap-4" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group">
              <label class="form-label">Nome do Combo</label>
              <input v-model="comboForm.name" class="form-input" placeholder="Ex: Plano Premium" required />
            </div>
            <div class="form-group">
              <label class="form-label">Desconto (%)</label>
              <input v-model.number="comboForm.discountPercent" type="number" min="0" max="100" step="1" class="form-input" placeholder="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea v-model="comboForm.description" class="form-input" rows="2" placeholder="Descrição do combo..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label mb-2">Módulos Incluídos</label>
            <div v-if="comboForm.items.length === 0" class="empty-hint">
              Nenhum módulo no catálogo. Cadastre módulos antes de criar um combo.
            </div>
            <div v-else class="features-list">
              <div v-for="item in comboForm.items" :key="item.featureCode" class="feature-row">
                <div class="flex items-center gap-3" style="flex: 1;">
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="(item as any).included" />
                    <span class="toggle-slider"></span>
                  </label>
                  <div>
                    <div class="fw-bold">{{ (item as any).label || item.featureCode }}</div>
                    <div class="text-sm" style="color: var(--color-surface-400);">
                      {{ item.featureCode }} — {{ formatCents((item as any).defaultPriceCents || 0) }}/mês
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3" v-if="(item as any).included">
                  <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" v-model="item.useOverride" />
                    Preço customizado
                  </label>
                  <input
                    v-if="item.useOverride"
                    type="number"
                    step="0.01"
                    min="0"
                    class="form-input"
                    style="width: 120px;"
                    placeholder="R$"
                    :value="item.overridePriceCents != null ? (item.overridePriceCents / 100).toFixed(2) : ''"
                    @input="item.overridePriceCents = Math.round(Number(($event.target as HTMLInputElement).value) * 100)"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="showComboModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar Combo' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Apply Combo Modal ──────────────────────────── -->
    <div v-if="showApplyComboModal" class="modal-overlay" @click.self="showApplyComboModal = false">
      <div class="modal" style="max-width: 450px;" @click.stop>
        <div class="modal-header">
          <h3>Aplicar Combo — {{ selectedTenant?.name }}</h3>
          <button class="modal-close" @click="showApplyComboModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-sm mb-4" style="color: var(--color-surface-400);">
            Selecione um combo para aplicar automaticamente os módulos e preços pré-definidos.
          </p>
          <div class="form-group">
            <label class="form-label">Combo</label>
            <select v-model="applyComboId" class="form-input" required>
              <option value="" disabled>Selecione um combo...</option>
              <option v-for="c in combos" :key="c.id" :value="c.id">
                {{ c.name }} ({{ comboItemCount(c) }} módulos — {{ formatCents(comboTotalCents(c)) }}/mês)
              </option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showApplyComboModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving || !applyComboId" @click="applyCombo">
            {{ saving ? 'Aplicando...' : 'Aplicar Combo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; color: var(--color-surface-400); margin: 4px 0 0; }
.section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--glass-border-subtle); }

.catalog-card {
  cursor: pointer;
  padding: 16px;
  border-left: 4px solid var(--color-primary-500);
  transition: all 0.2s;
}
.catalog-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.combo-card {
  padding: 16px;
  border-left: 4px solid #8b5cf6;
}
.combo-features {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.combo-card .badge-success {
  font-size: 0.75rem;
}
.ml-2 { margin-left: 8px; }
.mr-1 { margin-right: 4px; }
.mb-1 { margin-bottom: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mb-2 { margin-bottom: 8px; }
.price-tag {
  background: var(--color-primary-900, #1a1a2e);
  color: var(--color-primary-300, #a5b4fc);
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}
.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--color-surface-400);
  font-size: 0.9rem;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.feature-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  display: inline-block;
}
.toggle-switch input { display: none; }
.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--color-surface-600);
  border-radius: 24px;
  transition: 0.3s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  left: 3px;
  top: 3px;
  transition: 0.3s;
}
.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary-500);
}
.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: var(--color-primary-900, #1a1a2e);
  font-size: 1rem;
}
.total-value {
  font-size: 1.25rem;
  color: var(--color-primary-300, #a5b4fc);
}

.badge-success { background: #10b981; color: white; }
.badge-warning { background: #f59e0b; color: #1a1a2e; }
.badge-error { background: #ef4444; color: white; }
.badge-outline { border: 1px solid var(--glass-border); background: transparent; }
.mb-8 { margin-bottom: 32px; }
.text-sm { font-size: 0.85rem; }
.fw-bold { font-weight: 600; }
</style>
