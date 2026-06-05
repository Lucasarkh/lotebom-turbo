<script setup lang="ts">
definePageMeta({ layout: 'painel' })

const { fetchApi } = useApi()
const { get: getPublic } = usePublicApi()
const { success: toastSuccess, error: toastError } = useToast()
const authStore = useAuthStore()

if (!authStore.isCorretor && !authStore.isImobiliaria) {
  await navigateTo(authStore.getDashboardRoute())
}

// ─── Types ───────────────────────────────────────────────
interface ProjectRef { id: string; name: string; slug: string }
interface LotOption {
  mapElementId: string
  code: string
  block: string | null
  areaM2: number | null
  price: number | null
  tags: string[]
  status: string
}
interface ReservationRules {
  feeType: 'FIXED' | 'PERCENTAGE'
  feeValue: number
  expiryHours: number
  currency: string
}
interface CorretorOption { id: string; code: string; name: string }

// ─── State ────────────────────────────────────────────────
const step = ref<1 | 2 | 3 | 'done'>(1)

// Step 1 data
const projects = ref<ProjectRef[]>([])
const loadingProjects = ref(true)
const selectedProject = ref<ProjectRef | null>(null)
const lots = ref<LotOption[]>([])
const loadingLots = ref(false)
const selectedLot = ref<LotOption | null>(null)
const reservationRules = ref<ReservationRules | null>(null)
const lotSearch = ref('')

// Step 2 data
const form = ref({ name: '', email: '', phone: '', cpf: '' })
const corretores = ref<CorretorOption[]>([])
const selectedCorretor = ref<CorretorOption | null>(null)

// Step 3 / submit
const submitting = ref(false)
const createdLead = ref<any>(null)

// ─── Computed ─────────────────────────────────────────────
const filteredLots = computed(() => {
  const q = lotSearch.value.toLowerCase()
  return lots.value.filter(l => {
    if (!q) return true
    return (
      (l.code || '').toLowerCase().includes(q) ||
      (l.block || '').toLowerCase().includes(q)
    )
  })
})

const feeDisplay = computed(() => {
  if (!reservationRules.value) return '—'
  const { feeType, feeValue } = reservationRules.value
  if (feeType === 'PERCENTAGE') return `${feeValue}% do valor do lote`
  return `R$ ${Number(feeValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
})

const feeAmount = computed(() => {
  if (!reservationRules.value || !selectedLot.value) return null
  const { feeType, feeValue } = reservationRules.value
  if (feeType === 'FIXED') return feeValue
  if (selectedLot.value.price && feeType === 'PERCENTAGE') {
    return selectedLot.value.price * (feeValue / 100)
  }
  return null
})

const expiryDisplay = computed(() => {
  if (!reservationRules.value) return '—'
  const h = reservationRules.value.expiryHours
  return h >= 24 ? `${h / 24} dia(s)` : `${h} hora(s)`
})

// ─── Data loading ──────────────────────────────────────────
async function loadProjects() {
  loadingProjects.value = true
  try {
    if (authStore.isCorretor) {
      const link = await fetchApi('/realtor-links/me')
      projects.value = link?.projects || []
    } else {
      // IMOBILIARIA — get all links → unique projects
      const links = await fetchApi('/realtor-links')
      const projectMap = new Map<string, ProjectRef>()
      for (const link of links || []) {
        for (const p of link.projects || []) {
          if (!projectMap.has(p.id)) projectMap.set(p.id, p)
        }
      }
      projects.value = Array.from(projectMap.values())

      // Also load corretor list
      corretores.value = (links || []).map((l: any) => ({
        id: l.id,
        code: l.code,
        name: l.name || l.user?.name || l.code
      }))
    }
  } catch {
    toastError('Erro ao carregar seus projetos.')
  } finally {
    loadingProjects.value = false
  }
}

async function selectProject(project: ProjectRef) {
  selectedProject.value = project
  selectedLot.value = null
  lots.value = []
  loadingLots.value = true
  try {
    const [data, lotsData] = await Promise.all([
      getPublic(`/p/${project.slug}`),
      getPublic(`/p/${project.slug}/lots?limit=50&page=1`),
    ])

    const parseLots = (items: any[]) => {
      for (const el of items) {
        const ld = el.lotDetails
        if (!ld) continue
        available.push({
          mapElementId: el.id,
          code: el.code || el.name || el.id,
          block: ld.block || null,
          areaM2: ld.areaM2 || null,
          price: ld.price ? Number(ld.price) : null,
          tags: ld.tags || [],
          status: ld.status || 'AVAILABLE'
        })
      }
    }

    const available: LotOption[] = []
    parseLots(lotsData.data || [])

    let page = lotsData.page || 1
    const totalPages = lotsData.totalPages || 1
    while (page < totalPages) {
      page++
      const next = await getPublic(`/p/${project.slug}/lots?limit=50&page=${page}`)
      parseLots(next.data || [])
    }

    lots.value = available

    const hasPaymentGateway = Array.isArray(data.paymentGateways) && data.paymentGateways.some((g: any) => g.isActive)

    if (hasPaymentGateway) {
      reservationRules.value = {
        feeType: data.reservationFeeType || 'FIXED',
        feeValue: Number(data.reservationFeeValue) || 500,
        expiryHours: data.reservationExpiryHours || 24,
        currency: 'BRL'
      }
    } else {
      reservationRules.value = null
    }
  } catch {
    toastError('Erro ao carregar lotes do projeto.')
  } finally {
    loadingLots.value = false
  }
}

// ─── Navigation ────────────────────────────────────────────
function goStep2() {
  if (!selectedProject.value || !selectedLot.value) return
  step.value = 2
}

function goStep3() {
  if (!form.value.name || !form.value.email || !form.value.phone) {
    toastError('Preencha nome, e-mail e WhatsApp.')
    return
  }
  step.value = 3
}

async function submitReservation() {
  if (!selectedProject.value || !selectedLot.value) return
  submitting.value = true
  try {
    const payload: any = {
      projectId: selectedProject.value.id,
      mapElementId: selectedLot.value.mapElementId,
      status: 'RESERVATION',
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
      ...(form.value.cpf ? { cpf: form.value.cpf } : {}),
    }
    if (authStore.isImobiliaria && selectedCorretor.value) {
      payload.realtorCode = selectedCorretor.value.code
    }
    const lead = await fetchApi('/leads', { method: 'POST', body: payload })
    createdLead.value = lead
    step.value = 'done'
    toastSuccess('Lote reservado com sucesso!')
  } catch (err: any) {
    toastError(err?.message || 'Erro ao realizar a reserva. O lote pode já ter sido reservado.')
  } finally {
    submitting.value = false
  }
}

function formatPrice(v: number | null) {
  if (!v) return 'Sob consulta'
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

onMounted(loadProjects)
</script>

<template>
  <div class="space-y-6 max-w-[980px]">
    <!-- Header -->
    <UiPageHeader title="Reservar Lote" description="Reserve um lote para um cliente seguindo as regras definidas pela loteadora." />

    <!-- Step indicator -->
    <div v-if="step !== 'done'" class="flex items-center rounded-2xl border border-p-border bg-p-elevated px-5 py-4 shadow-sm overflow-x-auto">
      <div class="flex items-center gap-2.5 text-[13px] font-bold tracking-wide whitespace-nowrap" :class="[step >= 1 ? 'text-p-text' : 'text-p-text-muted', step > 1 ? 'text-p-accent' : '']">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 border-[1.5px]" :class="step >= 1 ? (step > 1 ? 'bg-p-accent/10 border-p-accent/30 text-p-accent' : 'bg-p-accent border-p-accent text-white') : 'bg-p-overlay border-p-border text-p-text-muted'">{{ step > 1 ? '\u2713' : '1' }}</div>
        <span>Selecionar Lote</span>
      </div>
      <div class="flex-1 h-0.5 min-w-4 bg-p-border mx-1"></div>
      <div class="flex items-center gap-2.5 text-[13px] font-bold tracking-wide whitespace-nowrap" :class="[step >= 2 ? 'text-p-text' : 'text-p-text-muted', step > 2 ? 'text-p-accent' : '']">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 border-[1.5px]" :class="step >= 2 ? (step > 2 ? 'bg-p-accent/10 border-p-accent/30 text-p-accent' : 'bg-p-accent border-p-accent text-white') : 'bg-p-overlay border-p-border text-p-text-muted'">{{ step > 2 ? '\u2713' : '2' }}</div>
        <span>Dados do Cliente</span>
      </div>
      <div class="flex-1 h-0.5 min-w-4 bg-p-border mx-1"></div>
      <div class="flex items-center gap-2.5 text-[13px] font-bold tracking-wide whitespace-nowrap" :class="step >= 3 ? 'text-p-text' : 'text-p-text-muted'">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 border-[1.5px]" :class="step >= 3 ? 'bg-p-accent border-p-accent text-white' : 'bg-p-overlay border-p-border text-p-text-muted'">3</div>
        <span>Confirmar</span>
      </div>
    </div>

    <!-- STEP 1: Select Lot -->
    <UiCard v-if="step === 1" padding="lg">
      <UiLoadingState v-if="loadingProjects" text="Carregando seus projetos..." />

      <UiEmptyState
        v-else-if="projects.length === 0"
        title="Nenhum projeto vinculado"
        description="Você ainda não está vinculado a nenhum loteamento. Entre em contato com seu gestor."
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28" class="text-p-text-muted"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
        </template>
      </UiEmptyState>

      <template v-else>
        <!-- Project picker -->
        <div class="text-xs font-bold text-p-text-muted uppercase tracking-widest mb-3.5">Escolha o loteamento</div>
        <div class="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <button
            v-for="p in projects"
            :key="p.id"
            class="flex items-center gap-3 px-4 py-4 rounded-2xl border cursor-pointer text-[15px] font-semibold text-p-text text-left w-full sm:w-auto sm:min-w-[180px] transition-all"
            :class="selectedProject?.id === p.id ? 'border-p-accent bg-p-accent/10 text-p-accent' : 'border-p-border bg-p-raised hover:border-p-accent/30 hover:-translate-y-px hover:shadow-md'"
            @click="selectProject(p)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" class="shrink-0 text-p-text-muted"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>{{ p.name }}</span>
            <svg v-if="selectedProject?.id === p.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" class="ml-auto text-p-accent"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>

        <!-- Lots for selected project -->
        <template v-if="selectedProject">
          <div class="text-xs font-bold text-p-text-muted uppercase tracking-widest mb-3.5 mt-6">
            Lotes disponíveis em <strong class="text-p-text-secondary">{{ selectedProject.name }}</strong>
          </div>

          <!-- Reservation rules info -->
          <UiAlert v-if="reservationRules" variant="info" class="mb-4">
            Taxa de reserva: <strong>{{ feeDisplay }}</strong> -- Validade: <strong>{{ expiryDisplay }}</strong> após confirmar a reserva. Esta reserva esta sujeita a analise de credito da loteadora.
          </UiAlert>

          <UiLoadingState v-if="loadingLots" />

          <div v-else-if="lots.length === 0" class="text-center py-8 text-sm text-p-text-muted">
            Nenhum lote disponível neste projeto no momento.
          </div>

          <template v-else>
            <input
              v-model="lotSearch"
              class="w-full px-4 py-3.5 rounded-xl border border-p-border bg-p-raised text-p-text text-base mb-4 transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent placeholder:text-p-text-muted"
              placeholder="Buscar por código ou quadra..."
            />

            <div class="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              <button
                v-for="lot in filteredLots"
                :key="lot.mapElementId"
                class="relative rounded-2xl border p-4 cursor-pointer text-left transition-all"
                :class="selectedLot?.mapElementId === lot.mapElementId ? 'border-p-accent bg-p-accent/10' : 'border-p-border bg-p-raised hover:border-p-accent/30 hover:-translate-y-px hover:shadow-md'"
                @click="selectedLot = lot"
              >
                <div class="text-lg font-bold text-p-text mb-1 tracking-tight">{{ lot.code }}</div>
                <div v-if="lot.block" class="text-xs text-p-text-muted mb-2 uppercase tracking-widest font-bold">Quadra {{ lot.block }}</div>
                <div class="text-[15px] text-p-text-muted" v-if="lot.areaM2">{{ lot.areaM2 }}m²</div>
                <div class="text-base font-bold text-p-accent mt-2">{{ formatPrice(lot.price) }}</div>
                <div v-if="lot.tags?.length" class="flex flex-wrap gap-1.5 mt-2.5">
                  <span v-for="tag in lot.tags.slice(0, 2)" :key="tag" class="text-[11px] bg-p-accent/10 text-p-accent px-2 py-1 rounded-full font-bold tracking-wide uppercase">{{ tag }}</span>
                </div>
                <div v-if="selectedLot?.mapElementId === lot.mapElementId" class="absolute top-2.5 right-2.5 w-[22px] h-[22px] rounded-full bg-p-accent text-white flex items-center justify-center text-xs font-bold">&check;</div>
              </button>
            </div>
          </template>
        </template>

        <div class="flex items-center justify-end gap-3 mt-7 flex-wrap">
          <UiButton variant="primary" :disabled="!selectedLot" @click="goStep2">
            Continuar &rarr;
          </UiButton>
        </div>
      </template>
    </UiCard>

    <!-- STEP 2: Client Data -->
    <UiCard v-if="step === 2" padding="lg">
      <div class="flex items-center flex-wrap gap-1.5 rounded-2xl border border-p-info/20 bg-p-info/[0.06] px-4 py-3.5 text-[15px] text-p-text-muted mb-5 leading-relaxed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="text-p-accent shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
        Lote <strong class="text-p-text">{{ selectedLot?.code }}</strong>
        <span v-if="selectedLot?.block"> -- Quadra {{ selectedLot.block }}</span>
        <span v-if="selectedLot?.areaM2"> -- {{ selectedLot.areaM2 }}m²</span>
        em <strong class="text-p-text">{{ selectedProject?.name }}</strong>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
        <div class="sm:col-span-2">
          <UiInput v-model="form.name" label="Nome completo do cliente *" placeholder="Nome completo" />
        </div>
        <UiInput v-model="form.email" label="E-mail *" type="email" placeholder="email@exemplo.com" />
        <UiInput v-model="form.phone" label="WhatsApp *" type="tel" placeholder="(11) 99999-9999" />
        <UiInput v-model="form.cpf" label="CPF" placeholder="000.000.000-00" />

        <!-- IMOBILIARIA: assign corretor -->
        <div v-if="authStore.isImobiliaria">
          <label class="mb-1.5 block text-sm font-medium text-p-text-secondary">Corretor responsável</label>
          <select v-model="selectedCorretor" class="w-full rounded-lg border border-p-border bg-p-raised px-3.5 py-2.5 text-sm text-p-text transition-colors focus:outline-none focus:ring-2 focus:ring-p-accent/30 focus:border-p-accent">
            <option :value="null">— Nenhum (minha equipe em geral) —</option>
            <option v-for="c in corretores" :key="c.id" :value="c">{{ c.name }} ({{ c.code }})</option>
          </select>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 flex-wrap">
        <UiButton variant="ghost" @click="step = 1">
          <i class="pi pi-arrow-left mr-1"></i> Voltar
        </UiButton>
        <UiButton variant="primary" @click="goStep3">Revisar Reserva &rarr;</UiButton>
      </div>
    </UiCard>

    <!-- STEP 3: Confirm -->
    <UiCard v-if="step === 3" padding="lg">
      <h2 class="text-2xl font-semibold text-p-text mb-6 tracking-tight">Confirmar Reserva</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="rounded-2xl border border-p-border bg-p-raised p-5">
          <div class="text-xs font-bold uppercase tracking-widest text-p-text-muted mb-3.5">Lote</div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">Loteamento</span><strong class="text-p-text">{{ selectedProject?.name }}</strong></div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">Código</span><strong class="text-p-text">{{ selectedLot?.code }}</strong></div>
          <div v-if="selectedLot?.block" class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">Quadra</span><strong class="text-p-text">{{ selectedLot.block }}</strong></div>
          <div v-if="selectedLot?.areaM2" class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">Área</span><strong class="text-p-text">{{ selectedLot.areaM2 }}m²</strong></div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px]"><span class="text-p-text-muted">Valor do lote</span><strong class="text-p-text">{{ formatPrice(selectedLot?.price ?? null) }}</strong></div>
        </div>

        <div class="rounded-2xl border border-p-border bg-p-raised p-5">
          <div class="text-xs font-bold uppercase tracking-widest text-p-text-muted mb-3.5">Cliente</div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">Nome</span><strong class="text-p-text">{{ form.name }}</strong></div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">E-mail</span><strong class="text-p-text">{{ form.email }}</strong></div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">WhatsApp</span><strong class="text-p-text">{{ form.phone }}</strong></div>
          <div v-if="form.cpf" class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">CPF</span><strong class="text-p-text">{{ form.cpf }}</strong></div>
          <div v-if="selectedCorretor" class="flex justify-between items-center gap-3 py-2.5 text-[15px]"><span class="text-p-text-muted">Corretor</span><strong class="text-p-text">{{ selectedCorretor.name }}</strong></div>
        </div>

        <div v-if="reservationRules" class="sm:col-span-2 rounded-2xl border border-p-info/20 bg-p-info/[0.06] p-5">
          <div class="text-xs font-bold uppercase tracking-widest text-p-text-muted mb-3.5">Condições de Reserva</div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">Taxa de reserva</span><strong class="text-p-text">{{ feeDisplay }}</strong></div>
          <div v-if="feeAmount" class="flex justify-between items-center gap-3 py-2.5 text-[15px] border-b border-p-border/50"><span class="text-p-text-muted">Valor estimado</span><strong class="text-p-text">{{ formatPrice(feeAmount) }}</strong></div>
          <div class="flex justify-between items-center gap-3 py-2.5 text-[15px]"><span class="text-p-text-muted">Validade</span><strong class="text-p-text">{{ expiryDisplay }}</strong></div>
          <p class="text-sm text-p-text-muted mt-3.5 leading-relaxed">O lote será bloqueado imediatamente para outros compradores. A reserva expirará automaticamente após o prazo se não for confirmada. A efetivacao da venda esta sujeita a analise de credito da loteadora, que e a responsavel exclusiva por essa etapa.</p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 flex-wrap">
        <UiButton variant="ghost" @click="step = 2">
          <i class="pi pi-arrow-left mr-1"></i> Voltar
        </UiButton>
        <UiButton variant="primary" size="lg" :disabled="submitting" :loading="submitting" @click="submitReservation">
          <svg v-if="!submitting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          {{ submitting ? 'Reservando...' : 'Confirmar Reserva' }}
        </UiButton>
      </div>
    </UiCard>

    <!-- DONE: Success -->
    <UiCard v-if="step === 'done'" padding="lg">
      <div class="flex flex-col items-center text-center py-8 gap-4">
        <div class="text-p-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2 class="text-2xl font-semibold text-p-text tracking-tight">Reserva realizada!</h2>
        <p class="text-base text-p-text-muted max-w-[44ch] leading-relaxed">O lote <strong class="text-p-text">{{ selectedLot?.code }}</strong> de <strong class="text-p-text">{{ selectedProject?.name }}</strong> foi reservado para <strong class="text-p-text">{{ form.name }}</strong>.</p>
        <p class="text-[15px] text-p-text-muted">A reserva expira em <strong class="text-p-text">{{ expiryDisplay }}</strong>.</p>
        <div class="flex gap-3 flex-wrap justify-center mt-2">
          <UiButton variant="primary" to="/painel/leads">Ver nos Meus Leads</UiButton>
          <UiButton variant="ghost" @click="() => { step = 1; selectedProject = null; selectedLot = null; form = { name: '', email: '', phone: '', cpf: '' } }">
            Nova Reserva
          </UiButton>
        </div>
      </div>
    </UiCard>
  </div>
</template>
