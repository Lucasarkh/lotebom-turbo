<template>
  <div class="pub-page">
    <!-- Loading -->
    <div v-if="loading" class="pub-loading">
      <div class="loading-spinner"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pub-error">
      <div class="pub-error-card card">
        <h2>Projeto não encontrado</h2>
        <p>{{ error }}</p>
      </div>
    </div>

    <!-- Project -->
    <template v-else-if="project">
      <!-- Hero header -->
      <header class="pub-hero">
        <div class="pub-hero-content">
          <div class="pub-tenant">{{ project.tenant?.name }}</div>
          <h1 class="pub-title">{{ project.name }}</h1>
          <p v-if="project.description" class="pub-desc">{{ project.description }}</p>
          <div class="pub-stats">
            <div class="pub-stat">
              <span class="pub-stat-n">{{ totalLots }}</span>
              <span class="pub-stat-l">Lotes</span>
            </div>
            <div class="pub-stat">
              <span class="pub-stat-n">{{ availableLots }}</span>
              <span class="pub-stat-l">Disponíveis</span>
            </div>
            <div class="pub-stat">
              <span class="pub-stat-n">{{ reservedLots }}</span>
              <span class="pub-stat-l">Reservados</span>
            </div>
            <div class="pub-stat">
              <span class="pub-stat-n">{{ soldLots }}</span>
              <span class="pub-stat-l">Vendidos</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Corretor Card -->
      <div v-if="corretor" class="corretor-bar">
        <div class="corretor-bar-inner">
          <img v-if="corretor.photoUrl" :src="corretor.photoUrl" class="corretor-avatar" :alt="corretor.name" />
          <div v-else class="corretor-avatar-placeholder">{{ corretor.name[0] }}</div>
          <div class="corretor-info">
            <span class="corretor-label">Atendimento por</span>
            <strong class="corretor-name">{{ corretor.name }}</strong>
          </div>
          <div class="corretor-contacts">
            <a v-if="corretor.phone" :href="`https://wa.me/${corretor.phone.replace(/\D/g,'')}`" target="_blank" class="corretor-contact-btn corretor-whatsapp">��� WhatsApp</a>
            <a v-if="corretor.email" :href="`mailto:${corretor.email}`" class="corretor-contact-btn corretor-email">✉ E-mail</a>
            <a href="#contato" class="corretor-contact-btn corretor-cta">Tenho Interesse</a>
          </div>
        </div>
      </div>

      <!-- Highlights -->
      <section v-if="highlights.length" class="pub-section pub-section-highlights" id="info">
        <div class="pub-container">
          <h2 class="pub-section-title">Por que escolher este loteamento?</h2>
          <div class="highlights-grid">
            <div v-for="h in highlights" :key="h.label" class="highlight-card">
              <span class="highlight-icon">{{ h.icon }}</span>
              <div class="highlight-body">
                <strong class="highlight-label">{{ h.label }}</strong>
                <span v-if="h.value" class="highlight-value">{{ h.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Location info -->
      <section v-if="project.locationText" class="pub-section pub-section-alt" id="localizacao">
        <div class="pub-container pub-container-narrow">
          <h2 class="pub-section-title">Localização e Infraestrutura</h2>
          <p class="pub-location-text">{{ project.locationText }}</p>
        </div>
      </section>

      <!-- Map section -->
      <section class="pub-section" id="mapa">
        <div class="pub-container">
          <h2 class="pub-section-title">Mapa Interativo</h2>
          <p class="pub-section-sub">Clique nos lotes para ver detalhes. Arraste para mover o mapa.</p>
          <ClientOnly>
            <div class="pub-map-wrapper">
              <PublicSvgMap
                v-if="project.mapData"
                :mapData="project.mapData"
                @interest="openLeadForm($event)"
              />
              <PublicInteractiveMap
                v-else
                :elements="project.mapElements || []"
                :mapBaseImageUrl="project.mapBaseImageUrl"
                @interest="openLeadForm($event)"
              />
            </div>
            <template #fallback>
              <div class="pub-map-wrapper" style="display:flex; align-items:center; justify-content:center;">
                <div class="loading-spinner"></div>
              </div>
            </template>
          </ClientOnly>
          <div class="pub-legend">
            <div class="legend-item"><span class="legend-dot" style="background: rgba(34,197,94,0.5)"></span> Disponível</div>
            <div class="legend-item"><span class="legend-dot" style="background: rgba(245,158,11,0.5)"></span> Reservado</div>
            <div class="legend-item"><span class="legend-dot" style="background: rgba(239,68,68,0.5)"></span> Vendido</div>
          </div>
        </div>
      </section>

      <!-- Lots catalog -->
      <section v-if="unifiedAvailableLots.length" class="pub-section pub-section-alt" id="lotes">
        <div class="pub-container">
          <h2 class="pub-section-title">Lotes Disponíveis</h2>
          <p class="pub-section-sub">{{ availableLots }} lotes disponíveis<span v-if="priceRange"> · a partir de <strong>R$ {{ priceRange }}</strong></span></p>
          <div class="lots-grid">
            <NuxtLink v-for="lot in unifiedAvailableLots" :key="lot.id" :to="lotPageUrl(lot)" class="lot-card">
              <div class="lot-card-header">
                <span class="lot-code">{{ lot.code || lot.name || 'Lote' }}</span>
                <span class="badge badge-success" style="font-size:0.75rem;">Disponível</span>
              </div>
              <div class="lot-card-details">
                <span v-if="lot.lotDetails?.areaM2">📐 {{ lot.lotDetails.areaM2 }} m²</span>
                <span v-if="lot.lotDetails?.frontage">↔ {{ lot.lotDetails.frontage }} m frente</span>
                <span v-if="lot.lotDetails?.price" class="lot-price">R$ {{ lot.lotDetails.price.toLocaleString('pt-BR') }}</span>
              </div>
              <div class="lot-card-cta">Ver detalhes →</div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Media gallery -->
      <section v-if="project.projectMedias?.length" class="pub-section" id="galeria">
        <div class="pub-container">
          <h2 class="pub-section-title">Galeria</h2>
          <div class="pub-gallery">
            <div v-for="(m, i) in project.projectMedias" :key="m.id" class="gallery-item" @click="openLightbox(Number(i))">
              <img v-if="m.type === 'PHOTO'" :src="m.url" :alt="m.caption || 'Foto'" loading="lazy" />
              <video v-else :src="m.url" />
              <div v-if="m.caption" class="gallery-caption">{{ m.caption }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Lead form -->
      <section class="pub-section pub-section-alt" id="contato">
        <div class="pub-container">
          <div class="pub-form-wrapper">
            <div class="pub-form-info">
              <h2 class="pub-section-title">Tenho Interesse</h2>
              <p>Preencha o formulário e nossa equipe entrará em contato.</p>
              <div v-if="lotElements.length" class="pub-lot-summary">
                <h4>Lotes disponíveis: {{ availableLots }}</h4>
                <p v-if="priceRange">Valores a partir de <strong>R$ {{ priceRange }}</strong></p>
              </div>
              <div v-if="corretor" class="corretor-form-badge">
                <strong>{{ corretor.name }}</strong> é seu corretor nesta visita e será notificado do seu interesse.
              </div>
            </div>
            <form class="pub-lead-form card" @submit.prevent="submitLead" ref="formRef">
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
                <div v-if="unifiedAvailableLots.length" class="form-group">
                  <label class="form-label">Lote de interesse</label>
                  <select v-model="leadForm.mapElementId" class="form-input">
                    <option value="">Nenhum específico</option>
                    <option v-for="lot in unifiedAvailableLots" :key="lot.id" :value="lot.id">
                      {{ lot.code || lot.name || lot.id }} {{ lot.lotDetails?.areaM2 ? `— ${lot.lotDetails.areaM2} m²` : '' }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Mensagem</label>
                  <textarea v-model="leadForm.message" class="form-textarea" rows="3" placeholder="Quero mais informações sobre este loteamento..."></textarea>
                </div>
                <div v-if="leadError" class="alert alert-error">{{ leadError }}</div>
                <button type="submit" class="btn btn-primary btn-lg" :disabled="submitting" style="width:100%">
                  {{ submitting ? 'Enviando...' : 'Quero mais informações' }}
                </button>
              </template>
            </form>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="pub-footer">
        <p>{{ project.tenant?.name }} &middot; Loteamento {{ project.name }}</p>
        <p v-if="corretor" style="margin-top:4px; font-size:0.8rem;">Atendimento: {{ corretor.name }}{{ corretor.phone ? ` · ${corretor.phone}` : '' }}</p>
      </footer>

      <!-- Lightbox -->
      <div v-if="lightboxOpen" class="lightbox" @click.self="lightboxOpen = false">
        <button class="lightbox-close" @click="lightboxOpen = false">&times;</button>
        <button v-if="lightboxIdx > 0" class="lightbox-nav lightbox-prev" @click="lightboxIdx--">&#8249;</button>
        <div class="lightbox-content">
          <img v-if="lightboxMedia?.type === 'PHOTO'" :src="lightboxMedia.url" :alt="lightboxMedia.caption" />
          <video v-else :src="lightboxMedia?.url" controls autoplay />
        </div>
        <button v-if="lightboxIdx < (project.projectMedias?.length || 1) - 1" class="lightbox-nav lightbox-next" @click="lightboxIdx++">&#8250;</button>
      </div>

      <!-- Sticky nav -->
      <nav class="pub-sticky-nav">
        <a v-if="highlights.length || project.locationText" href="#info">Info</a>
        <a href="#mapa">Mapa</a>
        <a v-if="availableLotElements.length" href="#lotes">Lotes</a>
        <a v-if="project.projectMedias?.length" href="#galeria">Galeria</a>
        <a href="#contato" class="btn btn-primary btn-sm">Tenho Interesse</a>
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'public' })

const route = useRoute()
const { fetchPublic } = usePublicApi()

const tenantSlug = route.params.tenant
const projectSlug = route.params.project
const corretorCode = route.query.c || ''
const { success: toastSuccess } = useToast()

const loading = ref(true)
const error = ref('')
const project = ref<any>(null)
const corretor = ref<any>(null)

const leadForm = ref({ name: '', email: '', phone: '', mapElementId: '', message: '' })
const submitting = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')
const formRef = ref(null)

const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const lightboxMedia = computed(() => project.value?.projectMedias?.[lightboxIdx.value] ?? null)

/**
 * Standard Brazilian real estate area: (average width) * (average depth)
 * or weighted scale average for polygons.
 */
function calcContractArea(lot: any): number | null {
  const poly: Array<{x:number,y:number}> = lot.polygon ?? []
  if (poly.length < 2) return null
  
  const lengths = poly.map((p: any, i: number) => {
    const q = poly[(i + 1) % poly.length]!
    return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
  })
  const sm: Array<{meters: number | null}> = lot.sideMetrics ?? []

  // Case: All 4 sides defined (most common and precise)
  const m = sm.map(s => s.meters)
  if (sm.length === 4 && m.every(v => v !== null && v > 0)) {
    return ((m[0]! + m[2]!) / 2) * ((m[1]! + m[3]!) / 2)
  }

  const scales: (number | null)[] = lengths.map((len: number, i: number) => {
    const mv = sm[i]?.meters
    return (mv != null && mv > 0 && len > 0) ? mv / len : null
  })

  const validScales = scales.filter((s): s is number => s !== null)
  const minRequired = Math.max(1, Math.ceil(sm.length * 0.5))
  if (validScales.length < minRequired) return null

  if (sm.length === 4) {
    const s0 = scales[0] ?? null, s1 = scales[1] ?? null, s2 = scales[2] ?? null, s3 = scales[3] ?? null
    const getAvg = (a: number | null, b: number | null) => {
      if (a != null && b != null) return (a + b) / 2
      return a ?? b ?? null
    }
    const sw = getAvg(s0, s2)
    const sd = getAvg(s1, s3)
    if (sw != null && sd != null) return (lot.area ?? 0) * sw * sd
  }

  const product = validScales.reduce((a, b) => a * b, 1)
  const geometricMean = Math.pow(product, 1 / validScales.length)
  return (lot.area ?? 0) * geometricMean * geometricMean
}

const highlights = computed(() => {
  const raw = project.value?.highlightsJson
  return Array.isArray(raw) ? raw : []
})

const lotElements = computed(() => (project.value?.mapElements || []).filter((e: any) => e.type === 'LOT'))
const availableLotElements = computed(() => lotElements.value.filter((e: any) => (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE'))

const mapDataLots = computed(() => {
  const raw = project.value?.mapData
  if (!raw) return []
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    const entries = data.lots
    if (!entries) return []
    return entries.map(([ , l]: [string, any]) => l)
  } catch { return [] }
})

const hasMapData = computed(() => !!project.value?.mapData)

const unifiedAvailableLots = computed(() => {
  if (hasMapData.value) {
    const rawMapData = typeof project.value.mapData === 'string' ? JSON.parse(project.value.mapData) : project.value.mapData
    const PPM = Number(rawMapData.pixelsPerMeter) || 10

    return mapDataLots.value
      .filter((l: any) => l.status === 'available')
      .map((l: any) => {
        // Area priority: Manual > Side metrics (contract) > Drawing (pixel)
        const contractArea = calcContractArea(l)
        let finalAreaM2 = (Number(l.area) > 0 ? (Number(l.area) / (PPM * PPM)) : 0)
        
        if (l.manualAreaM2 != null) {
          finalAreaM2 = Number(l.manualAreaM2)
        } else if (contractArea !== null) {
          finalAreaM2 = contractArea
        }

        // Frontage priority: Manual > Drawing (pixel)
        const finalFrontage = l.manualFrontage != null
          ? Number(l.manualFrontage)
          : (Number(l.frontage) > 0 ? (Number(l.frontage) / PPM) : 0)

        return {
          id: l.id,
          name: l.label,
          code: l.code || l.label || l.id,
          lotDetails: {
            areaM2: parseFloat(finalAreaM2.toFixed(2)),
            frontage: parseFloat(finalFrontage.toFixed(2)),
            price: l.price
          }
        }
      })
  }
  return availableLotElements.value
})

const totalLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.length
  return lotElements.value.length
})
const availableLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.filter((l: any) => l.status === 'available').length
  return availableLotElements.value.length
})
const reservedLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.filter((l: any) => l.status === 'reserved').length
  return lotElements.value.filter((e: any) => e.lotDetails?.status === 'RESERVED').length
})
const soldLots = computed(() => {
  if (hasMapData.value) return mapDataLots.value.filter((l: any) => l.status === 'sold').length
  return lotElements.value.filter((e: any) => e.lotDetails?.status === 'SOLD').length
})

const priceRange = computed(() => {
  let prices: number[] = []
  if (hasMapData.value) {
    prices = mapDataLots.value
      .filter((l: any) => l.status === 'available' && l.price)
      .map((l: any) => Number(l.price))
  } else {
    prices = availableLotElements.value
      .map((e: any) => Number(e.lotDetails?.price))
      .filter(Boolean)
  }
  if (!prices.length) return null
  const min = Math.min(...prices)
  return min.toLocaleString('pt-BR')
})

const lotPageUrl = (lot: any) => {
  const code = lot.code || lot.id || lot.name
  const base = `/p/${tenantSlug}/${projectSlug}/lote/${encodeURIComponent(code)}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
}

onMounted(async () => {
  try {
    const [p, c] = await Promise.allSettled([
      fetchPublic(`/p/${tenantSlug}/${projectSlug}`),
      corretorCode ? fetchPublic(`/p/${tenantSlug}/corretores/${corretorCode}`) : Promise.resolve(null),
    ])
    if (p.status === 'fulfilled') project.value = p.value
    else error.value = (p.reason as any)?.message || 'Projeto não encontrado'
    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e: any) {
    error.value = e.message || 'Projeto não encontrado'
  }
  loading.value = false
})

async function submitLead() {
  submitting.value = true
  leadError.value = ''
  try {
    const body = {
      name: leadForm.value.name,
      email: leadForm.value.email,
      phone: leadForm.value.phone,
      mapElementId: leadForm.value.mapElementId || undefined,
      message: leadForm.value.message || undefined,
      realtorCode: corretorCode || undefined,
    }
    await fetchPublic(`/p/${tenantSlug}/${projectSlug}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    leadSuccess.value = true
    toastSuccess('Formulário enviado com sucesso!')
  } catch (e: any) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}

function openLeadForm(el: any) {
  leadForm.value.mapElementId = el?.id || ''
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })
}

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}
</script>

<style scoped>
.pub-hero {
  background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%);
  color: white; padding: var(--space-12) var(--space-6); text-align: center;
}
.pub-hero-content { max-width: 700px; margin: 0 auto; }
.pub-tenant { font-size: 0.875rem; opacity: 0.8; margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: 0.05em; }
.pub-title { font-size: 2.5rem; font-weight: 700; margin-bottom: var(--space-3); line-height: 1.15; }
.pub-desc { font-size: 1.125rem; opacity: 0.9; margin-bottom: var(--space-6); line-height: 1.6; }
.pub-stats { display: flex; justify-content: center; gap: var(--space-6); flex-wrap: wrap; }
.pub-stat { text-align: center; }
.pub-stat-n { display: block; font-size: 2rem; font-weight: 700; }
.pub-stat-l { font-size: 0.8125rem; opacity: 0.8; }

.corretor-bar { background: #f0fdf4; border-bottom: 2px solid #bbf7d0; padding: var(--space-3) var(--space-6); }
.corretor-bar-inner { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.corretor-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #4ade80; }
.corretor-avatar-placeholder { width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.25rem; }
.corretor-info { flex: 1; }
.corretor-label { display: block; font-size: 0.7rem; color: #166534; text-transform: uppercase; letter-spacing: 0.05em; }
.corretor-name { color: #14532d; font-size: 1rem; }
.corretor-contacts { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.corretor-contact-btn { padding: 6px 14px; border-radius: 20px; font-size: 0.8125rem; font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
.corretor-contact-btn:hover { opacity: 0.85; }
.corretor-whatsapp { background: #22c55e; color: white; }
.corretor-email { background: #3b82f6; color: white; }
.corretor-cta { background: var(--primary); color: white; }
.corretor-form-badge { margin-top: var(--space-4); padding: var(--space-3); background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: var(--radius-sm); font-size: 0.875rem; color: #166534; }

.pub-section-highlights { background: #f8fafc; }
.highlights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); margin-top: var(--space-5); }
.highlight-card { background: white; border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; align-items: flex-start; gap: var(--space-3); box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.highlight-icon { font-size: 1.75rem; flex-shrink: 0; }
.highlight-body { display: flex; flex-direction: column; gap: 4px; }
.highlight-label { font-weight: 600; color: var(--gray-800); font-size: 0.9375rem; }
.highlight-value { color: var(--gray-500); font-size: 0.875rem; }

.pub-container-narrow { max-width: 720px; }
.pub-location-text { font-size: 1.0625rem; line-height: 1.75; color: var(--gray-700); white-space: pre-wrap; }

.lots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4); margin-top: var(--space-5); }
.lot-card { background: white; border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: var(--space-4); text-decoration: none; color: inherit; transition: box-shadow 0.2s, transform 0.2s; display: flex; flex-direction: column; gap: var(--space-2); }
.lot-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }
.lot-card-header { display: flex; justify-content: space-between; align-items: center; }
.lot-code { font-weight: 700; color: var(--gray-800); font-size: 1rem; }
.lot-card-details { display: flex; flex-direction: column; gap: 4px; font-size: 0.875rem; color: var(--gray-600); }
.lot-price { color: var(--primary); font-weight: 700; font-size: 1rem; margin-top: 4px; }
.lot-card-cta { font-size: 0.8125rem; color: var(--primary); font-weight: 600; margin-top: auto; padding-top: var(--space-2); }

.pub-section { padding: var(--space-12) var(--space-6); }
.pub-section-alt { background: white; }
.pub-container { max-width: 1000px; margin: 0 auto; }
.pub-section-title { font-size: 1.75rem; font-weight: 700; color: var(--gray-800); margin-bottom: var(--space-2); }
.pub-section-sub { color: var(--gray-500); margin-bottom: var(--space-5); }

.pub-legend { display: flex; gap: var(--space-5); justify-content: center; margin-top: var(--space-4); flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--gray-600); }
.legend-dot { width: 16px; height: 16px; border-radius: 3px; }

.pub-map-wrapper {
  position: relative;
  width: 100%;
  min-height: 500px;
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin: var(--space-4) 0;
}

.pub-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-4); }
.gallery-item { border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; position: relative; aspect-ratio: 4/3; background: var(--gray-200); }
.gallery-item img, .gallery-item video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
.gallery-item:hover img, .gallery-item:hover video { transform: scale(1.05); }
.gallery-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: var(--space-3); background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: white; font-size: 0.8125rem; }

.pub-form-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); align-items: start; }
@media (max-width: 768px) { .pub-form-wrapper { grid-template-columns: 1fr; } }
.pub-form-info { padding-top: var(--space-4); }
.pub-form-info p { color: var(--gray-600); margin-top: var(--space-3); line-height: 1.6; }
.pub-lot-summary { margin-top: var(--space-5); padding: var(--space-4); background: var(--primary-light); border-radius: var(--radius-md); }
.pub-lot-summary h4 { color: var(--primary); margin-bottom: var(--space-1); }
.pub-lot-summary p { color: var(--gray-600); font-size: 0.875rem; margin: 0; }
.pub-lead-form { padding: var(--space-6); }

.pub-footer { text-align: center; padding: var(--space-6); color: var(--gray-400); font-size: 0.8125rem; border-top: 1px solid var(--gray-200); }

.pub-sticky-nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: var(--space-4); padding: var(--space-3) var(--space-4); background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-top: 1px solid var(--gray-200); z-index: 50; flex-wrap: wrap; }
.pub-sticky-nav a { color: var(--gray-600); text-decoration: none; font-size: 0.875rem; font-weight: 500; }
.pub-sticky-nav a:hover { color: var(--primary); }

.lightbox { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; }
.lightbox-close { position: absolute; top: 16px; right: 20px; background: transparent; border: none; color: white; font-size: 2rem; cursor: pointer; z-index: 2; }
.lightbox-content img, .lightbox-content video { max-width: 90vw; max-height: 85vh; border-radius: var(--radius-md); }
.lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; font-size: 3rem; padding: 0 16px; cursor: pointer; border-radius: var(--radius-md); height: 60px; display: flex; align-items: center; }
.lightbox-nav:hover { background: rgba(255,255,255,0.25); }
.lightbox-prev { left: 16px; }
.lightbox-next { right: 16px; }

.pub-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.pub-error { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: var(--space-6); }
.pub-error-card { text-align: center; padding: var(--space-8); max-width: 400px; }
.pub-error-card h2 { margin-bottom: var(--space-3); color: var(--gray-800); }
.pub-error-card p { color: var(--gray-500); }
</style>
