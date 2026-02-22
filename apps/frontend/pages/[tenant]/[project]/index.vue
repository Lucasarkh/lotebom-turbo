<template>
  <div class="pub-page">
    <!-- Loading -->
    <div v-if="loading" class="pub-loading">
      <div class="loading-spinner"></div>
      <p>Carregando projeto...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pub-error">
      <div class="pub-error-card card">
        <h2>Projeto não encontrado</h2>
        <p>{{ error }}</p>
        <NuxtLink to="/" class="v4-btn-primary" style="display: inline-block; margin-top: 1rem;">Voltar ao início</NuxtLink>
      </div>
    </div>

    <!-- Project -->
    <template v-else-if="project">
      <!-- Hero section -->
      <section class="v4-hero" :class="{ 'has-banner': !!project.bannerImageUrl }">
        <div v-if="project.bannerImageUrl" class="v4-hero-bg" :style="{ backgroundImage: `url(${project.bannerImageUrl})` }"></div>
        <div class="v4-hero-overlay"></div>
        
        <div class="v4-container">
          <div class="v4-hero-content">
            <span class="v4-hero-tag">{{ project.tenant?.name || 'Vendas Iniciadas' }}</span>
            <h1 class="v4-hero-title text-balance">{{ project.name }}</h1>
            <p v-if="project.description" class="v4-hero-desc text-balance">{{ project.description }}</p>
            
            <div class="v4-hero-stats">
              <div class="v4-stat-card">
                <span class="v4-stat-label">Terrenos Totais</span>
                <span class="v4-stat-value">{{ totalLots }}</span>
              </div>
              <div class="v4-stat-card">
                <span class="v4-stat-label">Unidades Disponíveis</span>
                <span class="v4-stat-value">{{ availableLots }}</span>
              </div>
              <div v-if="priceRange" class="v4-stat-card">
                <span class="v4-stat-label">Investimento inicial</span>
                <span class="v4-stat-value">R$ {{ priceRange }}</span>
              </div>
            </div>

            <div class="v4-hero-actions">
              <a href="#mapa" class="v4-btn-primary">Ver Mapa Interativo</a>
              <a href="#contato" class="v4-btn-white">Solicitar informações</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Trust bar -->
      <div v-if="corretor" class="v4-trust-bar">
        <div class="v4-container">
          <div class="v4-trust-inner">
            <div class="v4-trust-person">
              <div class="v4-trust-avatar">
                <img v-if="corretor.profileImageUrl" :src="corretor.profileImageUrl" :alt="corretor.name" />
                <span v-else class="v4-avatar-placeholder">{{ corretor.name[0] }}</span>
              </div>
              <div class="v4-trust-info">
                <span class="v4-trust-label">Atendimento Exclusivo</span>
                <strong class="v4-trust-name">{{ corretor.name }}</strong>
              </div>
            </div>
            <div class="v4-trust-actions">
              <a v-if="corretor.phone" :href="`https://wa.me/${corretor.phone.replace(/\D/g,'')}`" target="_blank" class="v4-trust-btn v4-trust-btn--whatsapp">
                <span>WhatsApp</span>
              </a>
              <a href="#contato" class="v4-trust-btn v4-trust-btn--primary">
                <span>Tenho Interesse</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Highlights & Info -->
      <section v-if="highlights.length || project.locationText" class="v4-section" id="info">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Diferenciais do Projeto</h2>
            <p v-if="project.locationText" class="v4-section-subtitle">{{ project.locationText }}</p>
          </div>

          <div v-if="highlights.length" class="v4-highlights-grid">
            <div v-for="h in highlights" :key="h.label" class="v4-highlight-card">
              <div class="v4-highlight-icon-wrapper">
                <span class="v4-highlight-icon">{{ h.icon }}</span>
              </div>
              <div class="v4-highlight-content">
                <h4 class="v4-highlight-label">{{ h.label }}</h4>
                <p v-if="h.value" class="v4-highlight-value">{{ h.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Interactive Map -->
      <section class="v4-section v4-section-alt" id="mapa">
        <div class="v4-container">
          <div class="v4-section-header center">
            <h2 class="v4-section-title">Escolha sua unidade no mapa</h2>
            <p class="v4-section-subtitle">Mapa atualizado em tempo real. Clique no lote para ver mais informações.</p>
          </div>

          <div class="v4-map-container">
            <div class="v4-map-legend">
              <div class="v4-legend-item"><span class="dot available"></span> Disponível</div>
              <div class="v4-legend-item"><span class="dot reserved"></span> Reservado</div>
              <div class="v4-legend-item"><span class="dot sold"></span> Vendido</div>
            </div>
            
            <ClientOnly>
              <div class="v4-map-viewport">
                <PublicSvgMap
                  v-if="project.mapData"
                  :mapData="project.mapData"
                  @interest="openLeadForm($event)"
                />
                <PublicInteractiveMap
                  v-else
                  :elements="project.mapElements || []"
                  @interest="openLeadForm($event)"
                />
              </div>
              <template #fallback>
                <div class="v4-map-loading">
                  <div class="loading-spinner"></div>
                  <p>Carregando mapa interativo...</p>
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Available Lots Grid -->
      <section v-if="unifiedAvailableLots.length" class="v4-section" id="lotes">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Unidades Disponíveis</h2>
            <p class="v4-section-subtitle">Selecione uma opção abaixo para ver metragens e condições.</p>
          </div>

          <div class="v4-lots-grid">
            <NuxtLink v-for="lot in unifiedAvailableLots" :key="lot.id" :to="lotPageUrl(lot)" class="v4-lot-card">
              <div class="v4-lot-card-header">
                <div class="v4-lot-id">
                  <span class="v4-lot-label">Unidade</span>
                  <span class="v4-lot-code">{{ lot.code || lot.name || lot.id }}</span>
                </div>
                <div class="v4-lot-status">Disponível</div>
              </div>
              
              <div class="v4-lot-card-body">
                <div class="v4-lot-info-row">
                  <span class="v4-info-item">📐 {{ lot.lotDetails?.areaM2 || '---' }} m²</span>
                  <span v-if="lot.lotDetails?.frontage" class="v4-info-item">↔ {{ lot.lotDetails.frontage }}m frente</span>
                </div>
                <div v-if="lot.lotDetails?.price" class="v4-lot-price">
                  <span class="v4-price-label">Valor do investimento</span>
                  <span class="v4-price-value">R$ {{ lot.lotDetails.price.toLocaleString('pt-BR') }}</span>
                </div>
              </div>
              
              <div class="v4-lot-card-footer">
                <span>Ver detalhes do lote</span>
                <span class="v4-icon">→</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Media gallery -->
      <section v-if="project.projectMedias?.length" class="v4-section" id="galeria">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Galeria de Fotos</h2>
            <p class="v4-section-subtitle">Conheça os detalhes e a infraestrutura do empreendimento.</p>
          </div>

          <div class="v4-gallery-grid">
            <div 
              v-for="(m, i) in project.projectMedias" 
              :key="m.id" 
              class="v4-gallery-item"
              :class="{'v4-gallery-item--large': i === 0}"
              @click="openLightbox(Number(i))"
            >
              <img v-if="m.type === 'PHOTO'" :src="m.url" :alt="m.caption || 'Foto'" loading="lazy" />
              <video v-else :src="m.url" />
              <div class="v4-gallery-overlay">
                <span v-if="m.caption" class="v4-gallery-caption">{{ m.caption }}</span>
                <span class="v4-gallery-expand">↗</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Lead form -->
      <section class="v4-section v4-section-alt" id="contato">
        <div class="v4-container">
          <div class="v4-conversion-card">
            <div class="v4-conversion-info">
              <div class="v4-conversion-badge">
                <span class="v4-pulse"></span>
                Oportunidade única
              </div>
              <h2 class="v4-conversion-title">Garanta sua unidade agora</h2>
              <p class="v4-conversion-desc">Restam poucas unidades disponíveis. Preencha o formulário e nossa equipe entrará em contato para tirar suas dúvidas e agendar uma visita.</p>
              
              <div v-if="lotElements.length" class="v4-available-badge">
                <span style="font-size: 1.25rem;">✨</span> {{ availableLots }} lotes disponíveis no momento
              </div>

              <div v-if="corretor" class="v4-active-realtor">
                <div class="v4-realtor-avatar">
                  <img v-if="corretor.profileImageUrl" :src="corretor.profileImageUrl" :alt="corretor.name" />
                  <span v-else class="v4-avatar-placeholder">{{ corretor.name[0] }}</span>
                </div>
                <div class="v4-realtor-details">
                  <span class="v4-realtor-label">Consultor Atendimento</span>
                  <span class="v4-realtor-name">{{ corretor.name }}</span>
                </div>
              </div>
            </div>

            <div class="v4-conversion-form-wrapper">
              <div v-if="leadSuccess" class="v4-form-success">
                <div class="v4-success-icon">✓</div>
                <h3>Mensagem enviada!</h3>
                <p>Nossa equipe entrará em contato em breve através do telefone informado.</p>
              </div>
              <form v-else class="v4-form" @submit.prevent="submitLead" ref="formRef">
                <h3 class="v4-form-title">Preencha seus dados</h3>
                
                <div class="v4-form-grid">
                  <div class="v4-form-group">
                    <label>Seu nome completo *</label>
                    <input v-model="leadForm.name" required placeholder="Ex: João Silva" />
                  </div>
                  <div class="v4-form-group">
                    <label>Telefone / WhatsApp *</label>
                    <input v-model="leadForm.phone" required placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div class="v4-form-group">
                  <label>E-mail *</label>
                  <input v-model="leadForm.email" type="email" required placeholder="seu@email.com" />
                </div>

                <div v-if="unifiedAvailableLots.length" class="v4-form-group">
                  <label>Tenho interesse no lote</label>
                  <select v-model="leadForm.mapElementId">
                    <option value="">Não tenho preferência</option>
                    <option v-for="lot in unifiedAvailableLots" :key="lot.id" :value="lot.id">
                      {{ lot.code || lot.name || lot.id }} {{ lot.lotDetails?.areaM2 ? `— ${lot.lotDetails.areaM2} m²` : '' }}
                    </option>
                  </select>
                </div>

                <div class="v4-form-group">
                  <label>Mensagem (opcional)</label>
                  <textarea v-model="leadForm.message" rows="3" placeholder="Em que podemos te ajudar?"></textarea>
                </div>

                <div v-if="leadError" class="v4-form-error">{{ leadError }}</div>
                
                <button type="submit" class="v4-btn-submit" :disabled="submitting">
                  {{ submitting ? 'Enviando...' : 'Falar com um consultor' }}
                </button>
                <p class="v4-form-privacy">Seus dados estão seguros conosco.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="v4-footer">
        <div class="v4-container">
          <div class="v4-footer-inner">
            <div class="v4-footer-brand">
              <span class="v4-footer-tenant">{{ project.tenant?.name }}</span>
              <span class="v4-footer-project">Loteamento {{ project.name }}</span>
            </div>
            <div class="v4-footer-copyright">
              © {{ new Date().getFullYear() }} — Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      <!-- Lightbox -->
      <div v-if="lightboxOpen" class="v4-lightbox" @click.self="lightboxOpen = false">
        <button class="v4-lightbox-close" @click="lightboxOpen = false">&times;</button>
        <button v-if="lightboxIdx > 0" class="v4-lightbox-btn v4-prev" @click="lightboxIdx--">&#10094;</button>
        <div class="v4-lightbox-content">
          <img v-if="lightboxMedia?.type === 'PHOTO'" :src="lightboxMedia.url" :alt="lightboxMedia.caption" />
          <video v-else :src="lightboxMedia?.url" controls autoplay />
          <div v-if="lightboxMedia?.caption" class="v4-lightbox-caption">{{ lightboxMedia.caption }}</div>
        </div>
        <button v-if="lightboxIdx < (project.projectMedias?.length || 1) - 1" class="v4-lightbox-btn v4-next" @click="lightboxIdx++">&#10095;</button>
      </div>

      <!-- Sticky mobile CTA -->
      <nav class="v4-sticky-nav">
        <a href="#mapa" class="v4-nav-item">Mapa</a>
        <a v-if="unifiedAvailableLots.length" href="#lotes" class="v4-nav-item">Unidades</a>
        <a href="#contato" class="v4-nav-item v4-nav-cta">TENHO INTERESSE</a>
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
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
    if (!data.lots) return []
    if (Array.isArray(data.lots)) {
      return data.lots.map(([, l]: [any, any]) => l)
    }
    return Object.values(data.lots)
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
  const base = `/${tenantSlug}/${projectSlug}/lote/${encodeURIComponent(code)}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
}

onMounted(async () => {
  try {
    const [p, c] = await Promise.allSettled([
      fetchPublic(`/p/${tenantSlug}/${projectSlug}`),
      corretorCode ? fetchPublic(`/p/${tenantSlug}/corretores/${corretorCode}`) : Promise.resolve(null),
    ])
    if (p.status === 'fulfilled') {
      project.value = p.value
      useHead({
        title: `Loteamento ${p.value.name} — ${p.value.tenant?.name}`,
        meta: [
          { name: 'description', content: p.value.description || '' },
          { name: 'theme-color', content: '#ffffff' }
        ]
      })
    }
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
  
  if (el?.label || el?.code) {
    leadForm.value.message = `Tenho interesse no lote ${el.label || el.code}`
  }
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })
}

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}
</script>

<style scoped>
/* V4 Design System Tokens - Apple/Samsung Inspired */
:global(:root) {
  --v4-primary: #0071e3; /* Apple Blue */
  --v4-primary-hover: #0077ed;
  --v4-bg: #ffffff;
  --v4-bg-alt: #f5f5f7; /* Apple secondary bg */
  --v4-text: #1d1d1f; /* Apple Text */
  --v4-text-muted: #86868b;
  --v4-border: #d2d2d7;
  --v4-radius-lg: 18px; /* Refined, not bubbly */
  --v4-radius-md: 12px;
  --v4-radius-sm: 8px;
  --v4-shadow-soft: 0 4px 24px rgba(0,0,0,0.04);
  --v4-shadow-elevated: 0 20px 40px rgba(0,0,0,0.08);
}

/* Base Layout */
.pub-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--v4-text);
  background: var(--v4-bg);
  line-height: 1.47059;
  font-weight: 400;
  letter-spacing: -0.022em;
  -webkit-font-smoothing: antialiased;
}

.v4-container {
  max-width: 1040px; /* More focused container like Apple */
  margin: 0 auto;
  padding: 0 22px;
}

.v4-section {
  padding: 80px 0; /* Consistent, balanced spacing */
  position: relative;
}

.v4-section-alt {
  background: var(--v4-bg-alt);
}

.v4-section-header {
  margin-bottom: 44px;
  max-width: 800px;
}

.v4-section-header.center {
  margin-inline: auto;
  text-align: center;
}

.v4-section-title {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.003em;
  line-height: 1.1;
  margin-bottom: 12px;
}

.v4-section-subtitle {
  font-size: 21px;
  line-height: 1.38105;
  color: var(--v4-text-muted);
  font-weight: 400;
}

.v4-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--v4-primary);
  border-radius: 50%;
  margin-right: 8px;
  box-shadow: 0 0 0 rgba(0, 113, 227, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 113, 227, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 113, 227, 0); }
}

/* Navigation & Hero */
.v4-hero {
  position: relative;
  background: #000;
  color: white;
  overflow: hidden;
  min-height: 85vh; /* Premium height */
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 0;
}

.v4-hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: 1;
  opacity: 1;
  transition: all 0.5s ease;
}

.v4-hero.has-banner .v4-hero-bg {
  filter: brightness(0.85); /* Maintain clarity, just tone down highlights */
  transform: none;
}

.v4-hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.2);
  z-index: 2;
}

.v4-hero.has-banner .v4-hero-overlay {
  /* Subtle vignette that doesn't hide info, but grounds the text */
  background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%);
}

.v4-hero-content {
  position: relative;
  z-index: 3;
  padding: 40px 24px;
  max-width: 900px;
  margin: 0 auto;
  /* Glassmorphic content plate for extreme legibility over busy images without blurring the BG */
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 32px;
}

.v4-hero-tag {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 24px;
  background: var(--v4-primary); /* Use primary color to pop against image */
  padding: 6px 16px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
}

.v4-hero-title {
  font-size: clamp(38px, 8vw, 72px); /* Slightly more balanced */
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.v4-hero-desc {
  font-size: clamp(17px, 3vw, 20px);
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 32px;
  max-width: 640px;
  margin-inline: auto;
  line-height: 1.5;
}

/* Hero Stats Card */
.v4-hero-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.v4-stat-card {
  text-align: center;
  min-width: 120px;
}

.v4-stat-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
  font-weight: 700;
}

.v4-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.v4-hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* Buttons */
.v4-btn-primary {
  background: var(--v4-primary);
  color: white;
  padding: 12px 28px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 17px;
  text-decoration: none;
  transition: background 0.3s;
}

.v4-btn-white {
  background: white;
  color: #1d1d1f;
  padding: 12px 28px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 17px;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}

.v4-btn-primary:hover { background: var(--v4-primary-hover); transform: translateY(-1px); }
.v4-btn-white:hover { background: #f5f5f7; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }

/* Trust Bar */
.v4-trust-bar {
  background: rgba(255, 255, 255, 0.85); /* Slightly more transparent */
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.05); /* Softer border */
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 30px rgba(0,0,0,0.03);
}

.v4-trust-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.v4-trust-person {
  display: flex;
  align-items: center;
  gap: 16px;
}

.v4-trust-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f7;
  border: 1px solid var(--v4-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.v4-trust-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.v4-avatar-placeholder {
  line-height: 1;
  font-size: 18px;
  font-weight: 700;
  color: var(--v4-primary);
  text-transform: uppercase;
}

.v4-trust-info {
  display: flex;
  flex-direction: column;
}

.v4-trust-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.v4-trust-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--v4-text);
}

.v4-trust-actions {
  display: flex;
  gap: 8px;
}

.v4-trust-btn {
  padding: 10px 20px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.v4-trust-btn--whatsapp { background: #25d366; color: white; }
.v4-trust-btn--primary { background: var(--v4-primary); color: white; }

/* Highlights Grid */
.v4-highlights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.v4-highlight-card {
  background: var(--v4-bg);
  padding: 40px;
  border-radius: var(--v4-radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.3s;
  border: 1px solid #f2f2f2;
}

.v4-highlight-card:hover { transform: scale(1.02); }

.v4-highlight-icon-wrapper {
  width: 56px;
  height: 56px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.v4-highlight-icon { font-size: 40px; }
.v4-highlight-label { font-size: 19px; font-weight: 600; margin-bottom: 8px; }
.v4-highlight-value { font-size: 17px; color: var(--v4-text-muted); line-height: 1.47059; }

/* Map Container */
.v4-map-container {
  background: white;
  border-radius: var(--v4-radius-lg);
  overflow: hidden;
  box-shadow: var(--v4-shadow-soft);
  border: 1px solid var(--v4-border);
}

.v4-map-legend {
  padding: 24px;
  border-bottom: 1px solid var(--v4-border);
  display: flex;
  justify-content: center;
  gap: 32px;
}

.v4-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--v4-text-muted);
}

.v4-legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }
.v4-legend-item .dot.available { background: #32d74b; } /* Apple Green */
.v4-legend-item .dot.reserved { background: #ff9f0a; } /* Apple Orange */
.v4-legend-item .dot.sold { background: #ff453a; } /* Apple Red */

.v4-map-viewport {
  background: #fafafa;
  min-height: 500px;
}

/* Lots Grid */
.v4-lots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.v4-lot-card {
  background: white;
  border-radius: var(--v4-radius-lg);
  padding: 32px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f2f2f2;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.v4-lot-card:hover { 
  box-shadow: var(--v4-shadow-elevated);
  transform: translateY(-4px);
  border-color: var(--v4-primary);
}

.v4-lot-card-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start;
  margin-bottom: 20px; 
}

.v4-lot-id {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.v4-lot-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  letter-spacing: 0.1em;
}

.v4-lot-code { 
  font-size: 26px; 
  font-weight: 700; 
  letter-spacing: -0.02em; 
  color: var(--v4-text); 
}

.v4-lot-status { 
  font-size: 11px; 
  font-weight: 700; 
  color: #32d74b;
  background: rgba(50, 215, 75, 0.1);
  padding: 6px 14px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.v4-lot-info-row { 
  display: flex; 
  gap: 20px; 
  margin-bottom: 20px; 
  color: var(--v4-text-muted); 
  font-size: 15px;
  align-items: center;
}

.v4-lot-price { 
  margin-top: auto;
  border-top: 1px solid #f5f5f7;
  padding-top: 20px;
}

.v4-price-value { font-size: 20px; font-weight: 600; color: var(--v4-text); }

.v4-lot-card-footer { 
  margin-top: 20px;
  font-size: 15px;
  color: var(--v4-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Conversion Card */
.v4-conversion-card {
  background: #f5f5f7;
  border-radius: 30px;
  padding: 100px 60px;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 60px;
  align-items: center;
}

@media (max-width: 900px) {
  .v4-conversion-card { grid-template-columns: 1fr; padding: 40px 20px; }
}

.v4-conversion-badge {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--v4-primary);
  margin-bottom: 16px;
  display: block;
}

.v4-conversion-title { font-size: 48px; font-weight: 600; line-height: 1.1; margin-bottom: 20px; color: #1d1d1f; letter-spacing: -0.01em; }
.v4-conversion-desc { font-size: 21px; color: #86868b; margin-bottom: 40px; line-height: 1.4; }

.v4-active-realtor {
  margin-top: 48px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding-top: 40px;
  border-top: 1px solid var(--v4-border);
}

.v4-realtor-avatar { 
  width: 64px; 
  height: 64px; 
  border-radius: 50%; 
  overflow: hidden; 
  background: #f5f5f7; 
  border: 1px solid var(--v4-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.v4-realtor-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.v4-realtor-details {
  display: flex;
  flex-direction: column;
}

.v4-realtor-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--v4-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.v4-realtor-name { font-size: 21px; font-weight: 600; color: var(--v4-text); }

/* Gallery */
.v4-gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 240px;
  gap: 20px;
}

.v4-gallery-item {
  position: relative;
  border-radius: var(--v4-radius-lg);
  overflow: hidden;
  cursor: pointer;
  background: var(--v4-bg-alt);
  border: 1px solid var(--v4-border);
}

.v4-gallery-item--large {
  grid-column: span 2;
  grid-row: span 2;
}

@media (max-width: 768px) {
  .v4-gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 180px;
  }
}

.v4-gallery-item img, .v4-gallery-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.v4-gallery-item:hover img, .v4-gallery-item:hover video {
  transform: scale(1.05);
}

.v4-gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 60%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  opacity: 0;
  transition: opacity 0.3s;
}

.v4-gallery-item:hover .v4-gallery-overlay {
  opacity: 1;
}

.v4-gallery-caption {
  color: white;
  font-size: 15px;
  font-weight: 500;
}

.v4-gallery-expand {
  color: white;
  font-size: 20px;
}

/* Form Styles */
.v4-conversion-form-wrapper { 
  background: white; 
  border-radius: 18px; 
  padding: 40px; 
  border: 1px solid #d2d2d7;
  box-shadow: var(--v4-shadow-elevated);
}

.v4-form-title { font-size: 24px; font-weight: 600; margin-bottom: 32px; text-align: center; }

.v4-form-group { margin-bottom: 24px; }
.v4-form-group label { display: block; font-size: 12px; font-weight: 600; color: #86868b; margin-bottom: 8px; }
.v4-form-group input, .v4-form-group select, .v4-form-group textarea {
  width: 100%; padding: 14px 16px; border: 1px solid #d2d2d7; border-radius: 12px; font-family: inherit; font-size: 17px; color: #1d1d1f; background: #fafafa;
}
.v4-form-group input:focus { outline: none; border-color: var(--v4-primary); background: white; }

.v4-btn-submit {
  width: 100%; background: var(--v4-primary); color: white; border: none; padding: 16px; border-radius: 12px; font-size: 17px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s;
}
.v4-btn-submit:hover { background: var(--v4-primary-hover); }

/* Footer */
.v4-footer { padding: 80px 0; border-top: 1px solid var(--v4-border); background: var(--v4-bg-alt); }
.v4-footer-tenant { font-weight: 600; font-size: 17px; margin-bottom: 4px; display: block; }
.v4-footer-copyright { font-size: 12px; color: var(--v4-text-muted); }

/* Sticky mobile CTA */
.v4-sticky-nav {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(29, 29, 31, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  padding: 8px;
  border-radius: 100px;
  display: none;
  align-items: center;
  gap: 4px;
  width: 90%;
  max-width: 340px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

@media (max-width: 768px) { .v4-sticky-nav { display: flex; } }

.v4-nav-item {
  color: white; text-decoration: none; font-size: 12px; font-weight: 600; padding: 10px 16px; border-radius: 100px;
}
.v4-nav-cta { background: var(--v4-primary); flex: 1; text-align: center; }

/* Lightbox V4 */
.v4-lightbox { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; }
.v4-lightbox-btn { position: absolute; background: none; border: none; color: white; font-size: 40px; cursor: pointer; padding: 20px; opacity: 0.5; transition: 0.2s; }
.v4-lightbox-btn:hover { opacity: 1; }
.v4-prev { left: 20px; }
.v4-next { right: 20px; }
.v4-lightbox-close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 32px; cursor: pointer; z-index: 2100; }
.v4-lightbox-content { max-width: 90%; max-height: 80%; }
.v4-lightbox-content img, .v4-lightbox-content video { max-width: 100%; max-height: 100%; border-radius: 12px; }

@keyframes spinner { to { transform: rotate(360deg); } }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 113, 227, 0.1); border-top-color: var(--v4-primary); border-radius: 50%; animation: spinner 1s linear infinite; }

/* Responsive tweaks */
@media (max-width: 640px) {
  .v4-hero-content { padding-top: 60px; text-align: center; }
  .v4-hero-stats { gap: 24px; }
  .v4-stat-card { min-width: 100px; }
  .v4-stat-value { font-size: 24px; }
  .v4-btn-primary, .v4-btn-white { width: 100%; text-align: center; }
}
</style>
