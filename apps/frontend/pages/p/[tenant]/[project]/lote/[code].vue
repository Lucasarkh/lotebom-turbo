<template>
  <div class="pub-page">
    <!-- Loading -->
    <div v-if="loading" class="pub-loading">
      <div class="loading-spinner"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pub-error">
      <div class="pub-error-card card">
        <h2>Lote não encontrado</h2>
        <p>{{ error }}</p>
        <NuxtLink :to="projectUrl" class="btn btn-primary" style="margin-top: var(--space-4);">
          ← Ver Loteamento
        </NuxtLink>
      </div>
    </div>

    <!-- Lot page -->
    <template v-else-if="lot">
      <!-- Top nav -->
      <header class="lot-header">
        <div class="lot-header-inner">
          <NuxtLink :to="projectUrl" class="back-link">← Voltar ao loteamento</NuxtLink>
          <span class="lot-project-name">{{ project?.name }}</span>
        </div>
      </header>

      <!-- Corretor bar -->
      <div v-if="corretor" class="corretor-bar">
        <div class="corretor-bar-inner">
          <img v-if="corretor.photoUrl" :src="corretor.photoUrl" class="corretor-avatar" :alt="corretor.name" />
          <div v-else class="corretor-avatar-placeholder">{{ corretor.name[0] }}</div>
          <div class="corretor-info">
            <span class="corretor-label">Atendimento por</span>
            <strong class="corretor-name">{{ corretor.name }}</strong>
          </div>
          <div class="corretor-contacts">
            <a v-if="corretor.phone" :href="`https://wa.me/${corretor.phone.replace(/\D/g,'')}`" target="_blank" class="corretor-contact-btn corretor-whatsapp">💬 WhatsApp</a>
            <a v-if="corretor.email" :href="`mailto:${corretor.email}`" class="corretor-contact-btn corretor-email">✉ E-mail</a>
          </div>
        </div>
      </div>

      <!-- Lot hero -->
      <section class="lot-hero">
        <div class="lot-hero-inner">
          <div class="lot-hero-info">
            <div class="lot-breadcrumb">{{ project?.tenant?.name }} / {{ project?.name }}</div>
            <h1 class="lot-title">Lote {{ lot.code || lot.name }}</h1>
            <div class="lot-status-row">
              <span class="lot-status-badge" :class="statusClass">{{ statusLabel }}</span>
              <span v-if="details?.areaM2" class="lot-area">{{ details.areaM2 }} m²</span>
            </div>
            <div v-if="details?.price && details.status !== 'SOLD'" class="lot-price-box">
              <span class="lot-price-label">Valor</span>
              <span class="lot-price-value">R$ {{ details.price.toLocaleString('pt-BR') }}</span>
            </div>
          </div>

          <!-- Quick specs -->
          <div class="lot-specs-grid">
            <div v-if="details?.areaM2" class="spec-item">
              <span class="spec-icon">📐</span>
              <div class="spec-body">
                <span class="spec-label">Área Total</span>
                <strong class="spec-value">{{ details.areaM2 }} m²</strong>
              </div>
            </div>
            <div v-if="details?.frontage" class="spec-item">
              <span class="spec-icon">↔</span>
              <div class="spec-body">
                <span class="spec-label">Frente</span>
                <strong class="spec-value">{{ details.frontage }} m</strong>
              </div>
            </div>
            <div v-if="details?.depth" class="spec-item">
              <span class="spec-icon">↕</span>
              <div class="spec-body">
                <span class="spec-label">Fundo</span>
                <strong class="spec-value">{{ details.depth }} m</strong>
              </div>
            </div>
            <div v-if="details?.slope" class="spec-item">
              <span class="spec-icon">⛰</span>
              <div class="spec-body">
                <span class="spec-label">Inclinação</span>
                <strong class="spec-value">{{ slopeLabel(details.slope) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Conditions / notes -->
      <section v-if="details?.notes || details?.conditionsJson?.length" class="pub-section pub-section-alt">
        <div class="pub-container pub-container-narrow">
          <h2 class="pub-section-title">Informações Adicionais</h2>
          <p v-if="details?.notes" class="pub-location-text">{{ details.notes }}</p>
          <div v-if="Array.isArray(details?.conditionsJson) && details.conditionsJson.length" class="conditions-list">
            <div v-for="(c, i) in details.conditionsJson" :key="i" class="condition-item">
              <span class="condition-icon">✓</span>
              <span>{{ c }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Lead capture form -->
      <section class="pub-section" id="contato">
        <div class="pub-container">
          <div class="pub-form-wrapper">
            <div class="pub-form-info">
              <h2 class="pub-section-title">
                {{ details?.status === 'AVAILABLE' ? 'Quero este lote' : 'Tenho Interesse' }}
              </h2>
              <p v-if="details?.status === 'AVAILABLE'">
                Preencha o formulário e nossa equipe entrará em contato para apresentar as condições de pagamento.
              </p>
              <p v-else>
                Este lote pode ser reservado ou ter suas condições alteradas. Entre em contato para mais informações.
              </p>

              <!-- Lot summary card -->
              <div class="lot-summary-card">
                <div class="lot-summary-title">Lote {{ lot.code || lot.name }}</div>
                <div v-if="details?.areaM2" class="lot-summary-row">
                  <span>Área:</span><strong>{{ details.areaM2 }} m²</strong>
                </div>
                <div v-if="details?.price" class="lot-summary-row">
                  <span>Valor:</span><strong>R$ {{ details.price.toLocaleString('pt-BR') }}</strong>
                </div>
                <div class="lot-summary-row">
                  <span>Status:</span><strong>{{ statusLabel }}</strong>
                </div>
              </div>

              <div v-if="corretor" class="corretor-form-badge">
                <strong>{{ corretor.name }}</strong> é seu corretor nesta visita.
              </div>
            </div>

            <form class="pub-lead-form card" @submit.prevent="submitLead">
              <div v-if="leadSuccess" class="alert alert-success">
                Obrigado! Entraremos em contato em breve.
              </div>
              <template v-else>
                <div class="form-group">
                  <label class="form-label">Nome *</label>
                  <input v-model="leadForm.name" class="form-input" required placeholder="Seu nome completo" />
                </div>
                <div class="form-group">
                  <label class="form-label">E-mail *</label>
                  <input v-model="leadForm.email" type="email" class="form-input" required placeholder="seu@email.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">Telefone *</label>
                  <input v-model="leadForm.phone" class="form-input" required placeholder="(00) 00000-0000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Mensagem</label>
                  <textarea v-model="leadForm.message" class="form-textarea" rows="3" :placeholder="`Quero mais informações sobre o lote ${lot.code || lot.name}...`"></textarea>
                </div>
                <div v-if="leadError" class="alert alert-error">{{ leadError }}</div>
                <button type="submit" class="btn btn-primary btn-lg" :disabled="submitting" style="width:100%">
                  {{ submitting ? 'Enviando...' : 'Quero mais informações sobre este lote' }}
                </button>
              </template>
            </form>
          </div>
        </div>
      </section>

      <!-- Other available lots teaser -->
      <section v-if="otherLots.length" class="pub-section pub-section-alt">
        <div class="pub-container">
          <h2 class="pub-section-title">Outros Lotes Disponíveis</h2>
          <div class="lots-grid-sm">
            <NuxtLink v-for="l in otherLots.slice(0,6)" :key="l.id" :to="otherLotUrl(l)" class="lot-card-sm">
              <span class="lot-code-sm">{{ l.code || l.name }}</span>
              <span v-if="l.lotDetails?.areaM2" class="lot-area-sm">{{ l.lotDetails.areaM2 }} m²</span>
              <span v-if="l.lotDetails?.price" class="lot-price-sm">R$ {{ l.lotDetails.price.toLocaleString('pt-BR') }}</span>
            </NuxtLink>
          </div>
          <NuxtLink :to="projectUrl" class="btn btn-outline" style="margin-top: var(--space-5);">Ver todos os lotes →</NuxtLink>
        </div>
      </section>

      <!-- Footer -->
      <footer class="pub-footer">
        <p>{{ project?.tenant?.name }} &middot; Loteamento {{ project?.name }}</p>
        <p v-if="corretor" style="margin-top:4px; font-size:0.8rem;">Atendimento: {{ corretor.name }}{{ corretor.phone ? ` · ${corretor.phone}` : '' }}</p>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'public' })

const route = useRoute()
const { fetchPublic } = usePublicApi()
const { success: toastSuccess } = useToast()

const tenantSlug = route.params.tenant
const projectSlug = route.params.project
const lotCode = decodeURIComponent(route.params.code)
const corretorCode = route.query.c || ''

const loading = ref(true)
const error = ref('')
const project = ref(null)
const corretor = ref(null)

const projectUrl = computed(() => {
  const base = `/p/${tenantSlug}/${projectSlug}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
})

const lot = computed(() => {
  if (!project.value) return null
  return project.value.mapElements?.find(e => e.type === 'LOT' && (e.code === lotCode || e.id === lotCode)) || null
})

const details = computed(() => lot.value?.lotDetails || null)

const statusClass = computed(() => ({
  AVAILABLE: 'status-available',
  RESERVED: 'status-reserved',
  SOLD: 'status-sold',
}[details.value?.status || 'AVAILABLE'] || 'status-available'))

const statusLabel = computed(() => ({
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
}[details.value?.status || 'AVAILABLE'] || 'Disponível'))

const slopeLabel = (s) => ({ FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive' }[s] || s)

const otherLots = computed(() => {
  if (!project.value) return []
  return (project.value.mapElements || [])
    .filter(e => e.type === 'LOT' && e.id !== lot.value?.id && (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE')
})

const otherLotUrl = (l) => {
  const code = l.code || l.id
  const base = `/p/${tenantSlug}/${projectSlug}/lote/${encodeURIComponent(code)}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
}

const leadForm = ref({ name: '', email: '', phone: '', message: '' })
const submitting = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')

onMounted(async () => {
  try {
    const [p, c] = await Promise.allSettled([
      fetchPublic(`/p/${tenantSlug}/${projectSlug}`),
      corretorCode ? fetchPublic(`/p/${tenantSlug}/corretores/${corretorCode}`) : Promise.resolve(null),
    ])
    if (p.status === 'fulfilled') project.value = p.value
    else error.value = p.reason?.message || 'Loteamento não encontrado'
    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e) {
    error.value = e.message || 'Erro ao carregar'
  }
  loading.value = false

  // After load, validate lot exists
  if (!loading.value && project.value && !lot.value) {
    error.value = 'Lote não encontrado neste loteamento.'
  }
})

async function submitLead() {
  submitting.value = true
  leadError.value = ''
  try {
    const body = {
      name: leadForm.value.name,
      email: leadForm.value.email,
      phone: leadForm.value.phone,
      mapElementId: lot.value?.id,
      message: leadForm.value.message || `Quero mais informações sobre o lote ${lotCode}`,
      realtorCode: corretorCode || undefined,
    }
    await fetchPublic(`/p/${tenantSlug}/${projectSlug}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    leadSuccess.value = true
    toastSuccess('Formulário enviado! Entraremos em contato.')
  } catch (e) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}
</script>

<style scoped>
.lot-header {
  background: white;
  border-bottom: 1px solid var(--gray-200);
  padding: var(--space-3) var(--space-6);
  position: sticky; top: 0; z-index: 40;
}
.lot-header-inner { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; gap: var(--space-4); }
.back-link { color: var(--primary); text-decoration: none; font-size: 0.875rem; font-weight: 500; }
.back-link:hover { text-decoration: underline; }
.lot-project-name { color: var(--gray-500); font-size: 0.875rem; }

.corretor-bar { background: #f0fdf4; border-bottom: 2px solid #bbf7d0; padding: var(--space-3) var(--space-6); }
.corretor-bar-inner { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.corretor-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #4ade80; }
.corretor-avatar-placeholder { width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; }
.corretor-info { flex: 1; }
.corretor-label { display: block; font-size: 0.7rem; color: #166534; text-transform: uppercase; letter-spacing: 0.05em; }
.corretor-name { color: #14532d; font-size: 0.9rem; }
.corretor-contacts { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.corretor-contact-btn { padding: 5px 12px; border-radius: 16px; font-size: 0.8rem; font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
.corretor-contact-btn:hover { opacity: 0.85; }
.corretor-whatsapp { background: #22c55e; color: white; }
.corretor-email { background: #3b82f6; color: white; }
.corretor-form-badge { margin-top: var(--space-4); padding: var(--space-3); background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: var(--radius-sm); font-size: 0.875rem; color: #166534; }

.lot-hero { background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%); color: white; padding: var(--space-10) var(--space-6); }
.lot-hero-inner { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto; gap: var(--space-8); align-items: center; }
@media (max-width: 768px) { .lot-hero-inner { grid-template-columns: 1fr; } }
.lot-breadcrumb { font-size: 0.8rem; opacity: 0.8; margin-bottom: var(--space-2); }
.lot-title { font-size: 2rem; font-weight: 700; margin-bottom: var(--space-3); }
.lot-status-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.lot-status-badge { padding: 4px 14px; border-radius: 20px; font-size: 0.875rem; font-weight: 700; }
.status-available { background: #22c55e; color: white; }
.status-reserved { background: #f59e0b; color: white; }
.status-sold { background: #ef4444; color: white; }
.lot-area { opacity: 0.85; font-size: 0.9375rem; }
.lot-price-box { background: rgba(255,255,255,0.15); border-radius: var(--radius-md); padding: var(--space-4); display: inline-block; }
.lot-price-label { display: block; font-size: 0.8rem; opacity: 0.8; margin-bottom: 4px; }
.lot-price-value { font-size: 1.75rem; font-weight: 700; }

.lot-specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.spec-item { background: rgba(255,255,255,0.15); border-radius: var(--radius-md); padding: var(--space-3); display: flex; align-items: center; gap: var(--space-2); }
.spec-icon { font-size: 1.25rem; }
.spec-body { display: flex; flex-direction: column; }
.spec-label { font-size: 0.75rem; opacity: 0.8; }
.spec-value { font-size: 1rem; font-weight: 700; }

.pub-section { padding: var(--space-10) var(--space-6); }
.pub-section-alt { background: white; }
.pub-container { max-width: 1000px; margin: 0 auto; }
.pub-container-narrow { max-width: 720px; }
.pub-section-title { font-size: 1.5rem; font-weight: 700; color: var(--gray-800); margin-bottom: var(--space-4); }
.pub-location-text { font-size: 1.0625rem; line-height: 1.75; color: var(--gray-700); white-space: pre-wrap; }

.conditions-list { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-4); }
.condition-item { display: flex; align-items: flex-start; gap: var(--space-2); font-size: 0.9375rem; color: var(--gray-700); }
.condition-icon { color: #22c55e; font-weight: 700; flex-shrink: 0; }

.pub-form-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); align-items: start; }
@media (max-width: 768px) { .pub-form-wrapper { grid-template-columns: 1fr; } }
.pub-form-info { padding-top: var(--space-4); }
.pub-form-info p { color: var(--gray-600); margin-bottom: var(--space-4); line-height: 1.6; }
.pub-lead-form { padding: var(--space-6); }

.lot-summary-card { background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-4); }
.lot-summary-title { font-weight: 700; color: var(--gray-800); margin-bottom: var(--space-3); font-size: 1.0625rem; }
.lot-summary-row { display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--gray-600); padding: 4px 0; border-bottom: 1px solid var(--gray-200); }
.lot-summary-row:last-child { border-bottom: none; }
.lot-summary-row strong { color: var(--gray-800); }

.lots-grid-sm { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3); margin-top: var(--space-4); }
.lot-card-sm { background: white; border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: var(--space-3); text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px; transition: box-shadow 0.2s; }
.lot-card-sm:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.lot-code-sm { font-weight: 700; color: var(--gray-800); font-size: 0.9375rem; }
.lot-area-sm { font-size: 0.8125rem; color: var(--gray-500); }
.lot-price-sm { font-size: 0.875rem; color: var(--primary); font-weight: 600; }

.pub-footer { text-align: center; padding: var(--space-6); color: var(--gray-400); font-size: 0.8125rem; border-top: 1px solid var(--gray-200); }

.pub-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.pub-error { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: var(--space-6); text-align: center; }
.pub-error-card { padding: var(--space-8); max-width: 400px; }
.pub-error-card h2 { margin-bottom: var(--space-3); color: var(--gray-800); }
.pub-error-card p { color: var(--gray-500); margin-bottom: var(--space-4); }
</style>
