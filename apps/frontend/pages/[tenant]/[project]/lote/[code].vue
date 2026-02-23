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
      <header class="lot-header-v4">
        <div class="header-inner">
          <NuxtLink :to="projectUrl" class="back-link-v4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Voltar ao Masterplan</span>
          </NuxtLink>
          <div class="project-tags">
            <span class="tag-tenant">{{ project?.tenant?.name }}</span>
            <span class="tag-pname">{{ project?.name }}</span>
          </div>
        </div>
      </header>

      <div class="layout-v4-main">
        <!-- Persistent Side Navigation Guide -->
        <aside class="side-navigation-guide">
          <div class="nav-stack">
            <a href="#hero" class="nav-dot" :class="{ 'is-active': activeSection === 'hero' }" title="Início">
              <span class="dot"></span>
              <span class="label">Início</span>
            </a>
            <a v-if="details?.medias?.length" href="#galeria" class="nav-dot" :class="{ 'is-active': activeSection === 'galeria' }" title="Galeria">
              <span class="dot"></span>
              <span class="label">Galeria</span>
            </a>
            <a v-if="lotPanorama" href="#vista-360" class="nav-dot" :class="{ 'is-active': activeSection === 'vista-360' }" title="Vista 360°">
              <span class="dot"></span>
              <span class="label">360°</span>
            </a>
            <a v-if="details?.areaM2 || details?.frontage || details?.depth || details?.sideLeft || details?.sideRight || details?.slope || details?.notes" href="#ficha" class="nav-dot" :class="{ 'is-active': activeSection === 'ficha' }" title="Ficha Técnica">
              <span class="dot"></span>
              <span class="label">Ficha</span>
            </a>
            <a v-if="details?.paymentConditions" href="#financiamento" class="nav-dot" :class="{ 'is-active': activeSection === 'financiamento' }" title="Financiamento">
              <span class="dot"></span>
              <span class="label">Tabela</span>
            </a>
          </div>
        </aside>

        <div class="main-content-flow-v4">
          <div class="page-container-v4 split-view">
            <!-- Main Content Area -->
            <main class="content-col">
              <!-- Hero / Title -->
              <section id="hero" class="hero-v4">
                <div class="status-ribbon" :class="details?.status">
                  {{ statusLabel }}
                </div>
                <h1 class="lot-code-title">{{ lot.name || lot.code }}</h1>
                <div class="quick-metrics-v4">
                <div class="q-item" v-if="details?.paymentConditions?.setor">
                  <span class="q-val">{{ details.paymentConditions.setor }}</span>
                  <span class="q-unit">Setor / Quadra</span>
                </div>
                <div class="q-item" v-if="details?.areaM2">
                  <span class="q-val">{{ details?.areaM2 }}</span>
                  <span class="q-unit">m² totais</span>
                </div>
                <div class="q-item" v-if="details?.frontage">
                  <span class="q-val">{{ details?.frontage }}</span>
                  <span class="q-unit">m frente</span>
                </div>
                <div class="q-item" v-if="details?.slope">
                  <span class="q-val">{{ slopeLabel(details?.slope) }}</span>
                  <span class="q-unit">topografia</span>
                </div>
              </div>
            </section>

            <!-- Gallery -->
            <section v-if="details?.medias?.length" id="galeria" class="section-v4">
              <div class="section-title-v4">
                <h2>Galeria de Imagens</h2>
                <div class="title-line"></div>
              </div>
              
              <div class="gallery-v4">
                <div v-for="(m, i) in details.medias" :key="i" 
                  class="gallery-tile" 
                  :class="{ 'main': i === 0 }"
                  @click="openLightbox(Number(i))">
                  <img v-if="m.type === 'PHOTO'" :src="m.url" loading="lazy" />
                  <div v-else class="video-preview-v4">
                    <video :src="m.url"></video>
                    <div class="play-btn">▶</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 360 View -->
            <section v-if="lotPanorama" id="vista-360" class="section-v4">
              <div class="section-title-v4">
                <h2>Vista 360° do Lote</h2>
                <div class="title-line"></div>
              </div>
              <div class="panorama-container-v4" style="height: 600px; border-radius: 16px; overflow: hidden; border: 1px solid var(--v4-border);">
                <PanoramaViewer :panorama="lotPanorama" />
              </div>
            </section>

            <!-- Specification -->
            <section v-if="details?.areaM2 || details?.frontage || details?.depth || details?.sideLeft || details?.sideRight || details?.slope || details?.notes" id="ficha" class="section-v4">
              <div class="section-title-v4">
                <h2>Ficha Técnica Detalhada</h2>
                <div class="title-line"></div>
              </div>
              
              <div class="specs-grid-v4">
                <div class="spec-entry" v-if="details?.areaM2">
                  <span class="s-label">Área Escriturada</span>
                  <span class="s-value">{{ details?.areaM2 }} m²</span>
                </div>
                <div class="spec-entry" v-if="details?.frontage">
                  <span class="s-label">Testada (Frente)</span>
                  <span class="s-value">{{ details.frontage }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.depth">
                  <span class="s-label">Profundidade</span>
                  <span class="s-value">{{ details.depth }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.sideLeft">
                  <span class="s-label">Lateral Esquerda</span>
                  <span class="s-value">{{ details.sideLeft }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.sideRight">
                  <span class="s-label">Lateral Direita</span>
                  <span class="s-value">{{ details.sideRight }} m</span>
                </div>
                <div class="spec-entry" v-if="details?.slope">
                  <span class="s-label">Perfil do Terreno</span>
                  <span class="s-value">{{ slopeLabel(details?.slope) }}</span>
                </div>
              </div>

              <div v-if="details?.notes" class="notes-box-v4">
                <div class="box-header">Notas e Descrição</div>
                <div class="box-body">{{ details.notes }}</div>
              </div>
            </section>

            <!-- Finance -->
            <section v-if="details?.paymentConditions" id="financiamento" class="section-v4">
              <div class="section-title-v4">
                <h2>Condições de Aquisição</h2>
                <div class="title-line"></div>
              </div>

              <div class="finance-card-v4">
                <div class="finance-header">
                  <div class="h-item">
                    <span class="l">Valor do Lote</span>
                    <span class="v">R$ {{ (details.price || details.paymentConditions?.price)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                  </div>
                </div>

                <div class="finance-body">
                  <!-- Ato (Single) -->
                  <div v-if="details.paymentConditions.ato" class="plan-group">
                    <div class="group-label">Ato</div>
                    <div class="plans-grid">
                      <div class="plan-pill">
                        <span class="p-qty">Pagamento à vista</span>
                        <span class="p-val">R$ {{ details.paymentConditions.ato.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Atos / Sinal (List - compatibility) -->
                  <div v-if="details.paymentConditions.atos && !details.paymentConditions.ato" class="plan-group">
                    <div class="group-label">Ato</div>
                    <div class="plans-grid">
                      <template v-if="Array.isArray(details.paymentConditions.atos)">
                        <div v-for="(p, idx) in details.paymentConditions.atos" :key="'ato'+idx" class="plan-pill">
                          <span class="p-qty">{{ p.count }}x ato</span>
                          <span class="p-val">R$ {{ (p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                        </div>
                      </template>
                      <div v-else-if="details.paymentConditions.atos.count > 0" class="plan-pill">
                        <span class="p-qty">{{ details.paymentConditions.atos.count }}x ato</span>
                        <span class="p-val">R$ {{ ((details.paymentConditions.atos.total || 0) / (details.paymentConditions.atos.count || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Entradas -->
                  <div v-if="details.paymentConditions.entrada || details.paymentConditions.entradas" class="plan-group">
                    <div class="group-label">Entrada</div>
                    <div class="plans-grid">
                      <template v-if="Array.isArray(details.paymentConditions.entradas)">
                        <div v-for="(p, idx) in details.paymentConditions.entradas" :key="'ent'+idx" class="plan-pill">
                          <span class="p-qty">{{ p.count }}x entrada</span>
                          <span class="p-val">R$ {{ (p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                        </div>
                      </template>
                      <div v-else-if="details.paymentConditions.entrada?.count > 0" class="plan-pill">
                        <span class="p-qty">{{ details.paymentConditions.entrada.count }}x entrada</span>
                        <span class="p-val">R$ {{ ((details.paymentConditions.entrada.total || 0) / (details.paymentConditions.entrada.count || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Parcelas -->
                  <div v-if="(details.paymentConditions.parcelas || details.paymentConditions.installments)?.length" class="plan-group">
                    <div class="group-label">Parcelas Mensais</div>
                    <div class="plans-grid">
                      <div v-for="(plan, idx) in (details.paymentConditions.parcelas || details.paymentConditions.installments)" :key="'par'+idx" class="plan-pill">
                        <span class="p-qty">{{ plan.months || plan.count || plan.qty }}x mensais</span>
                        <span class="p-val">R$ {{ (plan.amount || plan.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Saldo do Saldo -->
                  <div v-if="details.paymentConditions.saldo" class="plan-group">
                    <div class="group-label">Saldo Final (Financiado)</div>
                    <div class="plans-grid">
                      <div class="plan-pill">
                        <span class="p-qty">Saldo residual</span>
                        <span class="p-val">R$ {{ details.paymentConditions.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Reforços / Balões -->
                  <div v-if="details.paymentConditions.intermediarias || details.paymentConditions.balloons" class="plan-group">
                    <div class="group-label">Reforços / Balões</div>
                    <div class="plans-grid">
                      <template v-if="Array.isArray(details.paymentConditions.intermediarias || details.paymentConditions.balloons)">
                        <div v-for="(b, idx) in (details.paymentConditions.intermediarias || details.paymentConditions.balloons)" :key="'bal'+idx" class="plan-pill balloon">
                          <span class="p-qty">{{ b.count }}x reforços</span>
                          <span class="p-val">R$ {{ (b.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                        </div>
                      </template>
                      <div v-else-if="details.paymentConditions.intermediarias?.count > 0" class="plan-pill balloon">
                        <span class="p-qty">{{ details.paymentConditions.intermediarias.count }}x reforços</span>
                        <span class="p-val">R$ {{ ((details.paymentConditions.intermediarias.total || 0) / (details.paymentConditions.intermediarias.count || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="details.paymentConditions.observacoes?.length || (details.paymentConditions.notes && details.paymentConditions.notes !== '')" class="finance-note">
                  <svg width="18" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <div class="note-content">
                    <template v-if="Array.isArray(details.paymentConditions.observacoes)">
                      <p v-for="(obs, i) in details.paymentConditions.observacoes" :key="i">{{ obs }}</p>
                    </template>
                    <p v-else>{{ details.paymentConditions.notes || details.paymentConditions.observacoes }}</p>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <!-- Sidebar (Sticky Conversion) -->
          <aside class="sidebar-col">
            <div class="sticky-conversion-card">
              <div v-if="(details?.price || details?.paymentConditions?.price) && details.status !== 'SOLD'" class="price-display-v4">
                <div class="pd-label">Preço de Tabela</div>
                <div class="pd-value">R$ {{ (details.price || details.paymentConditions?.price)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</div>
                <div class="pd-badges">
                  <span class="badge-v4">Oportunidade</span>
                  <span class="badge-v4">Negociação Direta</span>
                </div>
              </div>

              <div class="broker-info-v4" v-if="corretor">
                <div class="br-header">Falar com Consultor</div>
                <div class="br-card">
                  <img v-if="corretor.photoUrl" :src="corretor.photoUrl" class="br-img" />
                  <div v-else class="br-avatar-placeholder">{{ corretor.name[0] }}</div>
                  <div class="br-details">
                    <strong class="br-name">{{ corretor.name }}</strong>
                    <span class="br-role">Especialista local</span>
                  </div>
                </div>
              </div>

              <div id="contato" class="lead-form-v4">
                <div class="form-header-v4">
                  <h3>Tenho Interesse</h3>
                  <p>Tire toda as suas dúvidas ou agende uma visita no local.</p>
                </div>

                <form v-if="!leadSuccess" @submit.prevent="submitLead" class="form-v4">
                  <div class="f-field">
                    <input v-model="leadForm.name" type="text" placeholder="Nome" required />
                  </div>
                  <div class="f-field">
                    <input v-model="leadForm.phone" type="tel" placeholder="WhatsApp" required />
                  </div>
                  <div class="f-field">
                    <input v-model="leadForm.email" type="email" placeholder="E-mail (opcional)" />
                  </div>
                  <button type="submit" class="cta-submit-v4" :disabled="submitting">
                    {{ submitting ? 'Enviando...' : 'Quero Detalhes' }}
                  </button>
                  
                  <template v-if="corretor">
                    <div class="form-divider-v4">ou</div>
                    <a :href="`https://wa.me/${corretor.phone?.replace(/\D/g, '') || project?.contactPhone?.replace(/\D/g, '')}`" 
                       target="_blank" class="wa-btn-v4">
                      Conversar via WhatsApp
                    </a>
                  </template>
                </form>

                <div v-else class="form-success-v4">
                  <div class="success-animation-v4">
                    <div class="success-circle-v4">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <h4>Solicitação Enviada!</h4>
                  <p>O corretor entrará em contato em breve via WhatsApp ou e-mail.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Footer / Others -->
        <footer class="footer-v4">
          <div class="page-container-v4">
            <div v-if="otherLots.length" class="other-assets-v4">
              <div class="assets-header-v4">
                <h3>Outras Oportunidades</h3>
                <NuxtLink :to="projectUrl">Ver todos no mapa</NuxtLink>
              </div>
              <div class="assets-grid-v4">
                <NuxtLink v-for="l in otherLots.slice(0, 8)" :key="l.id" :to="otherLotUrl(l)" class="asset-card-v4">
                  <div class="a-code">{{ (l.code || l.name || l.id).toString().toLowerCase().includes('lote') ? '' : 'Lote ' }}{{ l.code || l.name || l.id }}</div>
                  <div class="a-area">{{ l.lotDetails?.areaM2 }} m²</div>
                  <div class="a-price" v-if="l.lotDetails?.price">R$ {{ (l.lotDetails.price / 1000).toFixed(0) }}k</div>
                </NuxtLink>
              </div>
            </div>
            <div class="legal-v4">
              <p><strong>{{ project?.tenant?.name }}</strong> &middot; {{ project?.name }}</p>
              <span>© 2026 LotSaaS &middot; O sistema oficial de gestão do loteamento</span>
            </div>
          </div>
        </footer>
      </div>
    </div>

      <!-- Lightbox (Keep original logic) -->
      <div v-if="lightboxOpen" class="lightbox" @click.self="lightboxOpen = false">
        <button class="lightbox-close" @click="lightboxOpen = false">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        
        <button v-if="lightboxIdx > 0" class="lightbox-nav lightbox-prev" @click="lightboxIdx--">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <div class="lightbox-content">
          <img v-if="lightboxMedia?.type === 'PHOTO'" :src="lightboxMedia.url" :alt="lightboxMedia.caption" />
          <video v-else :src="lightboxMedia?.url" controls autoplay />
        </div>

        <button v-if="lightboxIdx < (details.medias?.length || 1) - 1" class="lightbox-nav lightbox-next" @click="lightboxIdx++">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PanoramaViewer from '~/components/panorama/PanoramaViewer.vue'
import type { Panorama } from '~/composables/panorama/types'

definePageMeta({ layout: 'public' })

const route = useRoute()
const { fetchPublic } = usePublicApi()
const { success: toastSuccess } = useToast()
const tracking = useTracking()
const trackingStore = useTrackingStore()

const tenantSlug = route.params.tenant as string
const projectSlug = route.params.project as string
const lotCode = decodeURIComponent(route.params.code as string)
const corretorCode = (route.query.c as string) || ''

const loading = ref(true)
const error = ref('')
const project = ref<any>(null)
const corretor = ref<any>(null)

const lotPanorama = computed(() => {
  if (!details.value?.panoramaUrl) return null
  return {
    id: 'lot-panorama',
    tenantId: project.value?.tenantId || '',
    projectId: project.value?.id || '',
    title: 'Vista do Lote',
    projection: 'EQUIRECTANGULAR',
    published: true,
    sunPathAngleDeg: 0,
    sunPathLabelEnabled: false,
    showImplantation: false,
    snapshots: [{
      id: 'lot-snap',
      panoramaId: 'lot-panorama',
      imageUrl: details.value.panoramaUrl,
      label: 'Vista 360°',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }],
    beacons: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Panorama
})

const projectUrl = computed(() => {
  const base = `/${tenantSlug}/${projectSlug}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
})

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

const lot = computed(() => {
  if (!project.value) return null
  
  const mapData = (project.value as any).mapData 
    ? (typeof (project.value as any).mapData === 'string' ? JSON.parse((project.value as any).mapData) : (project.value as any).mapData)
    : null
  const PPM = mapData?.pixelsPerMeter || (project.value as any).pixelsPerMeter || 10

  // 1. Try relational mapElements (standard way)
  // Match by code or ID, and allow any type that has pages (standardized for Hotspots)
  const fromElements = (project.value as any).mapElements?.find((e: any) => (e.code === lotCode || e.id === lotCode))
  if (fromElements) return fromElements

  // 2. Try JSON mapData (flexible way)
  if (mapData) {
    try {
      const data = mapData
      const lotsArr: any[] = Array.isArray(data.lots)
        ? data.lots.map(([, l]: [string, any]) => l)
        : (data.lots ? Object.values(data.lots) : [])
      const found = lotsArr.find((l: any) => l.code === lotCode || l.id === lotCode || l.label === lotCode)
      
      if (found) {
        // Area priority: Manual > Side metrics (contract) > Drawing (pixel)
        const contractArea = calcContractArea(found)
        let finalAreaM2 = (Number(found.area) > 0 ? (Number(found.area) / (PPM * PPM)) : 0)
        
        if (found.manualAreaM2 != null) {
          finalAreaM2 = Number(found.manualAreaM2)
        } else if (contractArea !== null) {
          finalAreaM2 = contractArea
        }

        // Frontage priority: Manual > Drawing (pixel)
        const finalFrontage = found.manualFrontage != null
          ? Number(found.manualFrontage)
          : (Number(found.frontage) > 0 ? (Number(found.frontage) / PPM) : 0)

        // Synthesize a structure similar to MapElement + LotDetails
        return {
          id: found.id,
          code: found.code || found.label || found.id,
          name: found.label || found.code || 'Lote',
          lotDetails: {
            status: (found.status || 'available').toUpperCase(),
            price: found.price || null,
            areaM2: parseFloat(finalAreaM2.toFixed(2)),
            frontage: parseFloat(finalFrontage.toFixed(2)),
            depth: found.manualBack || found.depth || null,
            sideLeft: found.sideLeft ?? null,
            sideRight: found.sideRight ?? null,
            sideMetricsJson: found.sideMetrics ?? [],
            slope: found.slope || 'FLAT',
            notes: found.notes || '',
            conditionsJson: found.conditionsJson || [],
            paymentConditions: (typeof found.paymentConditions === 'string' ? JSON.parse(found.paymentConditions) : found.paymentConditions) || null,
            medias: []
          }
        }
      }
    } catch (e) { console.error('Error parsing mapData in lot page', e) }
  }
  return null
})

const details = computed(() => lot.value?.lotDetails || null)

const lotSideMetrics = computed(() => {
  const raw = details.value?.sideMetricsJson
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw
})

const statusClass = computed(() => {
  const map: Record<string, string> = {
    AVAILABLE: 'status-available',
    RESERVED: 'status-reserved',
    SOLD: 'status-sold',
  }
  return map[details.value?.status || 'AVAILABLE'] || 'status-available'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    AVAILABLE: 'Disponível',
    RESERVED: 'Reservado',
    SOLD: 'Vendido',
  }
  return map[details.value?.status || 'AVAILABLE'] || 'Disponível'
})

const slopeLabel = (s: string) => {
  const map: Record<string, string> = { 
    FLAT: 'Plano', 
    UPHILL: 'Aclive', 
    DOWNHILL: 'Declive',
    UP: 'Aclive',
    DOWN: 'Declive'
  }
  return map[s] || s
}

const otherLots = computed(() => {
  if (!project.value) return []
  return (project.value.mapElements || [])
    .filter((e: any) => e.type === 'LOT' && e.id !== lot.value?.id && (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE')
})

const otherLotUrl = (l: any) => {
  const code = l.code || l.id
  const base = `/${tenantSlug}/${projectSlug}/lote/${encodeURIComponent(code)}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
}

const leadForm = ref({ name: '', email: '', phone: '', message: '' })
const gateLeadForm = ref({ name: '', phone: '' })
const submitting = ref(false)
const submittingGate = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')
const financeUnlocked = ref(false)

const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const lightboxMedia = computed(() => details.value?.medias?.[lightboxIdx.value] ?? null)

const activeSection = ref('hero')

const handleScroll = () => {
  const sections = ['hero', 'galeria', 'vista-360', 'ficha', 'financiamento']
  for (const sectionId of [...sections].reverse()) {
    const el = document.getElementById(sectionId)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 150) {
        activeSection.value = sectionId
        break
      }
    }
  }
}

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
  
  try {
    const [p, c] = await Promise.allSettled([
      fetchPublic(`/p/${tenantSlug}/${projectSlug}`),
      corretorCode ? fetchPublic(`/p/${tenantSlug}/corretores/${corretorCode}`) : Promise.resolve(null),
    ])
    if (p.status === 'fulfilled') {
      project.value = p.value
      // Initialize tracking
      await tracking.initTracking({ 
        tenantId: p.value.tenantId, 
        projectId: p.value.id 
      })
      // Specific page view for the lot
      tracking.trackPageView({ 
        category: 'LOT', 
        label: lotCode 
      })
    } else error.value = (p.reason as any)?.message || 'Loteamento não encontrado'
    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e: any) {
    error.value = e.message || 'Erro ao carregar'
  }
  loading.value = false

  // After load, validate lot exists
  if (!loading.value && project.value && !lot.value) {
    error.value = 'Lote encontrado neste loteamento.'
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

async function submitLead() {
  submitting.value = true
  leadError.value = ''
  try {
    const body: any = {
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
    financeUnlocked.value = true
    toastSuccess('Formulário enviado! Entraremos em contato.')
  } catch (e: any) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}

async function submitGateLead() {
  submittingGate.value = true
  try {
    const body: any = {
      name: gateLeadForm.value.name,
      phone: gateLeadForm.value.phone,
      mapElementId: lot.value?.id,
      message: `Liberou a tabela de preços do lote ${lotCode}`,
      realtorCode: corretorCode || undefined,
    }
    await fetchPublic(`/p/${tenantSlug}/${projectSlug}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    financeUnlocked.value = true
    toastSuccess('Tabela liberada com sucesso!')
  } catch (e: any) {
    toastSuccess('Tabela liberada!') // Fallback success to not block user
    financeUnlocked.value = true
  }
  submittingGate.value = false
}
</script>

<style scoped>
/* ─── V4 Apple-Inspired Style ─── */
:global(:root) {
  --v4-primary: #0071e3;
  --v4-primary-hover: #0077ed;
  --v4-bg: #ffffff;
  --v4-bg-alt: #f5f5f7;
  --v4-text: #1d1d1f;
  --v4-text-muted: #86868b;
  --v4-border: #d2d2d7;
  --v4-radius-lg: 18px;
  --v4-radius-md: 12px;
}

.pub-page { 
  background: var(--v4-bg-alt); 
  color: var(--v4-text); 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
}

/* Header V4 */
.lot-header-v4 {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--v4-border);
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.back-link-v4 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--v4-text-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  transition: color 0.2s;
}
.back-link-v4:hover { color: var(--v4-primary); }

.project-tags { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; }
.tag-tenant { color: var(--v4-text-muted); }
.tag-pname { color: var(--v4-text); padding: 4px 10px; background: rgba(0,0,0,0.05); border-radius: 6px; }

/* Main Layout V4 */
.layout-v4-main {
  position: relative;
  display: flex;
  min-height: calc(100vh - 60px);
}

.main-content-flow-v4 {
  flex: 1;
  min-width: 0;
}

/* Vertical Nav Guide */
.side-navigation-guide {
  position: fixed; 
  top: 50%;
  transform: translateY(-50%);
  left: 30px;
  width: 70px; 
  display: flex; 
  flex-direction: column; 
  padding: 24px 0;
  background: white; 
  border-radius: 50px; 
  border: 1px solid var(--v4-border); 
  z-index: 150; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
@media (max-width: 1400px) { .side-navigation-guide { display: none; } }

.nav-stack { display: flex; flex-direction: column; position: relative; width: 100%; align-items: center; }
.nav-dot { display: flex; flex-direction: column; align-items: center; text-decoration: none; width: 100%; padding: 12px 0; transition: all 0.3s; }
.nav-dot .dot { width: 8px; height: 8px; border-radius: 50%; background: #d2d2d7; transition: all 0.3s; }
.nav-dot .label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #86868b; margin-top: 8px; }
.nav-dot:hover .dot, .nav-dot.is-active .dot { background: var(--v4-primary); transform: scale(1.2); }
.nav-dot:hover .label, .nav-dot.is-active .label { color: var(--v4-primary); }

/* Split View Grid */
.page-container-v4 { max-width: 1300px; margin: 0 auto; padding: 0 22px; }
.split-view { display: grid; grid-template-columns: 1fr 380px; gap: 40px; padding-top: 40px; padding-bottom: 80px; }
@media (max-width: 1150px) { .split-view { grid-template-columns: 1fr; } }

/* Hero V4 */
.hero-v4 {
  background: white; padding: 60px; border-radius: var(--v4-radius-lg); margin-bottom: 32px; border: 1px solid var(--v4-border); box-shadow: 0 4px 24px rgba(0,0,0,0.02);
}
.lot-code-title { font-size: 64px; font-weight: 600; margin-bottom: 24px; color: var(--v4-text); line-height: 1.1; letter-spacing: -0.02em; }
.quick-metrics-v4 { display: flex; gap: 48px; }
.q-item { display: flex; flex-direction: column; }
.q-val { font-size: 28px; font-weight: 600; color: var(--v4-text); }
.q-unit { font-size: 12px; font-weight: 600; color: var(--v4-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

/* Status Ribbon */
.status-ribbon {
  position: absolute; top: 30px; right: 30px; padding: 6px 16px; border-radius: 100px; font-size: 13px; font-weight: 600;
  background: #32d74b; color: white;
}
.status-ribbon.RESERVED { background: #ff9f0a; }
.status-ribbon.SOLD { background: #ff453a; }

/* Section Generic V4 */
.section-v4 {
  background: white; padding: 60px; border-radius: var(--v4-radius-lg); margin-bottom: 32px; border: 1px solid var(--v4-border);
}
.section-title-v4 { margin-bottom: 40px; display: flex; align-items: center; gap: 24px; }
.section-title-v4 h2 { font-size: 28px; font-weight: 600; color: var(--v4-text); margin: 0; letter-spacing: -0.01em; }
.title-line { flex: 1; height: 1px; background: var(--v4-border); }

/* Gallery V4 */
.gallery-v4 { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 160px; gap: 12px; }
.gallery-tile { border-radius: 12px; overflow: hidden; cursor: pointer; position: relative; background: #f5f5f7; }
.gallery-tile.main { grid-column: span 2; grid-row: span 2; }
.gallery-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.gallery-tile:hover img { transform: scale(1.05); }

/* Specs Grid V4 */
.specs-grid-v4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.spec-entry { background: #f5f5f7; padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px; }
.spec-entry .s-label { font-size: 11px; font-weight: 600; color: var(--v4-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.spec-entry .s-value { font-size: 20px; font-weight: 600; color: var(--v4-text); }

.notes-box-v4 { margin-top: 32px; background: #f5f5f7; border-radius: 16px; overflow: hidden; border: 1px solid var(--v4-border); }
.box-header { padding: 12px 24px; background: white; border-bottom: 1px solid var(--v4-border); color: var(--v4-text); font-weight: 600; font-size: 14px; }
.box-body { padding: 24px; font-size: 16px; line-height: 1.5; color: var(--v4-text); }

/* Finance V4 */
.finance-card-v4 { border: 1px solid var(--v4-border); border-radius: 20px; overflow: hidden; background: white; shadow: none; }
.h-item { padding: 40px; display: flex; flex-direction: column; }
.h-item .l { font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; color: var(--v4-text-muted); }
.h-item .v { font-size: 40px; font-weight: 600; color: var(--v4-text); }

.finance-body { padding: 0 40px 40px; }
.plan-group { margin-bottom: 48px; border-top: 1px solid var(--v4-border); padding-top: 32px; }
.group-label { font-size: 19px; font-weight: 600; color: var(--v4-text); margin-bottom: 24px; }
.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.plan-pill {
  background: #f5f5f7; padding: 20px 24px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;
}
.plan-pill:hover { background: #e8e8ed; }
.p-qty { font-weight: 500; font-size: 16px; color: var(--v4-text); }
.p-val { font-weight: 600; color: var(--v4-text); font-size: 17px; }

.finance-note { padding: 24px 40px; background: #fafafa; display: flex; align-items: flex-start; gap: 16px; color: var(--v4-text-muted); font-size: 14px; border-top: 1px solid var(--v4-border); }

/* Sidebar V4 */
.sticky-conversion-card { position: sticky; top: 100px; z-index: 10; }
.price-display-v4 { background: white; padding: 32px; border-radius: 18px; border: 1px solid var(--v4-border); margin-bottom: 20px; }
.pd-label { font-size: 12px; color: var(--v4-text-muted); font-weight: 600; text-transform: uppercase; }
.pd-value { font-size: 32px; font-weight: 600; color: var(--v4-primary); margin: 8px 0; }
.pd-badges { display: flex; gap: 8px; margin-top: 12px; }
.badge-v4 { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 100px; background: #f5f5f7; color: var(--v4-text-muted); }

.lead-form-v4 { background: white; padding: 32px; border-radius: 20px; border: 1px solid var(--v4-border); box-shadow: 0 20px 40px rgba(0,0,0,0.06); }
.form-header-v4 h3 { font-size: 24px; font-weight: 600; color: var(--v4-text); margin-bottom: 12px; }

/* Success Page V4 */
.form-success-v4 {
  text-align: center;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.success-circle-v4 {
  width: 72px;
  height: 72px;
  background: #32d74b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  animation: scale-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
.success-circle-v4 svg { width: 36px; height: 36px; stroke-dasharray: 40; stroke-dashoffset: 40; animation: checkmark 0.3s 0.3s ease-in-out forwards; }
.form-success-v4 h4 { font-size: 22px; font-weight: 700; color: var(--v4-text); margin-bottom: 12px; letter-spacing: -0.01em; }
.form-success-v4 p { font-size: 15px; color: var(--v4-text-muted); line-height: 1.5; margin-bottom: 40px; }
.btn-success-reset-v4 { background: #f5f5f7; border: 1px solid var(--v4-border); color: var(--v4-text); padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.btn-success-reset-v4:hover { background: #e8e8ed; }

@keyframes scale-up { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
@keyframes checkmark { 0% { stroke-dashoffset: 40; } 100% { stroke-dashoffset: 0; } }

.form-header-v4 p { font-size: 15px; color: var(--v4-text-muted); margin-bottom: 24px; }
.f-field { margin-bottom: 12px; }
.f-field input { width: 100%; padding: 14px 16px; border-radius: 10px; border: 1px solid var(--v4-border); background: #f5f5f7; font-size: 16px; transition: all 0.2s; }
.f-field input:focus { border-color: var(--v4-primary); outline: none; background: white; }
.cta-submit-v4 { width: 100%; padding: 16px; background: var(--v4-primary); color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 17px; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
.cta-submit-v4:hover { background: var(--v4-primary-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 113, 227, 0.2); }

.broker-info-v4 { margin-bottom: 20px; }
.br-card { background: white; padding: 16px; border-radius: 18px; display: flex; align-items: center; gap: 16px; border: 1px solid var(--v4-border); }
.br-img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.br-avatar-placeholder { 
  width: 56px; 
  height: 56px; 
  border-radius: 50%; 
  background: #f5f5f7; 
  color: var(--v4-primary); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-weight: 700; 
  font-size: 20px; 
  flex-shrink: 0;
  border: 1px solid var(--v4-border);
}
.br-details { display: flex; flex-direction: column; gap: 2px; }
.br-name { font-size: 16px; font-weight: 600; color: var(--v4-text); line-height: 1.2; }
.br-role { font-size: 13px; color: var(--v4-text-muted); }

.form-divider-v4 { text-align: center; font-size: 13px; color: var(--v4-text-muted); margin: 8px 0; }
.wa-btn-v4 { 
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #25d366;
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.2s;
}
.wa-btn-v4:hover { background: #20b858; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2); }
.footer-v4 { padding: 80px 0; background: white; border-top: 1px solid var(--v4-border); }
.other-assets-v4 { width: 100%; position: relative; }
.assets-header-v4 { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 32px; }
.assets-header-v4 h3 { font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
.assets-header-v4 a { font-size: 14px; font-weight: 600; color: var(--v4-primary); text-decoration: none; }

.assets-grid-v4 { 
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.asset-card-v4 { 
  background: #f5f5f7; 
  padding: 24px; 
  border-radius: 20px; 
  border: 1px solid var(--v4-border); 
  text-decoration: none; 
  color: inherit; 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}

.asset-card-v4:hover { 
  background: white; 
  transform: translateY(-4px); 
  box-shadow: 0 12px 24px rgba(0,0,0,0.06); 
  border-color: var(--v4-primary); 
}

.a-code { font-size: 17px; font-weight: 700; color: var(--v4-text); }
.a-area { font-size: 14px; color: var(--v4-text-muted); font-weight: 500; }
.a-price { font-size: 18px; font-weight: 700; color: var(--v4-primary); margin-top: 8px; }

.legal-v4 { margin-top: 80px; text-align: center; color: var(--v4-text-muted); font-size: 14px; padding-top: 40px; border-top: 1px solid var(--v4-border); opacity: 0.8; }

/* Lightbox V4 */
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.lightbox-close { position: absolute; top: 20px; right: 20px; color: white; background: none; border: none; font-size: 32px; cursor: pointer; }

@media (max-width: 768px) {
  .hero-v4, .section-v4 { padding: 32px 24px; }
  .lot-code-title { font-size: 40px; }
  .quick-metrics-v4 { gap: 24px; flex-wrap: wrap; }
  .split-view { padding-bottom: 40px; }
  .pd-value { font-size: 28px; }
}
</style>

