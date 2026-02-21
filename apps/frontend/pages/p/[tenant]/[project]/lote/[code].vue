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
            <a href="#hero" class="nav-dot" title="Início">
              <span class="dot"></span>
              <span class="label">Início</span>
            </a>
            <a href="#galeria" class="nav-dot" title="Galeria">
              <span class="dot"></span>
              <span class="label">Galeria</span>
            </a>
            <a href="#ficha" class="nav-dot" title="Ficha Técnica">
              <span class="dot"></span>
              <span class="label">Ficha</span>
            </a>
            <a v-if="details?.paymentConditions" href="#financiamento" class="nav-dot" title="Financiamento">
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
                <div class="q-item">
                  <span class="q-val">{{ details?.areaM2 }}</span>
                  <span class="q-unit">m² totais</span>
                </div>
                <div class="q-item" v-if="details?.frontage">
                  <span class="q-val">{{ details?.frontage }}</span>
                  <span class="q-unit">m frente</span>
                </div>
                <div class="q-item">
                  <span class="q-val">{{ slopeLabel(details?.slope) }}</span>
                  <span class="q-unit">topografia</span>
                </div>
              </div>
            </section>

            <!-- Gallery -->
            <section id="galeria" class="section-v4">
              <div class="section-title-v4">
                <h2>Galeria de Imagens</h2>
                <div class="title-line"></div>
              </div>
              
              <div v-if="details?.medias?.length" class="gallery-v4">
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
              <div v-else class="gallery-placeholder-v4">
                <div class="p-icon">🗺️</div>
                <p>Veja a localização no mapa principal do loteamento.</p>
              </div>
            </section>

            <!-- Specification -->
            <section id="ficha" class="section-v4">
              <div class="section-title-v4">
                <h2>Ficha Técnica Detalhada</h2>
                <div class="title-line"></div>
              </div>
              
              <div class="specs-grid-v4">
                <div class="spec-entry">
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
                <div class="spec-entry">
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
                </form>

                <div v-else class="form-success-v4">
                  <div class="success-icon-v4">✓</div>
                  <h4>Sucesso!</h4>
                  <p>O corretor entrará em contato em breve.</p>
                </div>

                <div class="wa-direct-v4" v-if="corretor?.phone">
                  <div class="wa-divider"><span>ou</span></div>
                  <a :href="`https://wa.me/${corretor.phone.replace(/\D/g,'')}`" target="_blank" class="wa-btn-v4">
                    Conversar via WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Footer / Others -->
        <footer class="footer-v4">
          <div class="page-container-v4">
            <div class="other-assets-v4">
              <div class="assets-header-v4">
                <h3>Outras Oportunidades</h3>
                <NuxtLink :to="projectUrl">Ver todos no mapa</NuxtLink>
              </div>
              <div class="assets-scroll-v4">
                <NuxtLink v-for="l in otherLots.slice(0, 6)" :key="l.id" :to="otherLotUrl(l)" class="asset-card-v4">
                  <div class="a-code">Lote {{ l.code || l.id }}</div>
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
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'public' })

const route = useRoute()
const { fetchPublic } = usePublicApi()
const { success: toastSuccess } = useToast()

const tenantSlug = route.params.tenant as string
const projectSlug = route.params.project as string
const lotCode = decodeURIComponent(route.params.code as string)
const corretorCode = (route.query.c as string) || ''

const loading = ref(true)
const error = ref('')
const project = ref<any>(null)
const corretor = ref<any>(null)

const projectUrl = computed(() => {
  const base = `/p/${tenantSlug}/${projectSlug}`
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
  const fromElements = (project.value as any).mapElements?.find((e: any) => e.type === 'LOT' && (e.code === lotCode || e.id === lotCode))
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
  const base = `/p/${tenantSlug}/${projectSlug}/lote/${encodeURIComponent(code)}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
}

const leadForm = ref({ name: '', email: '', phone: '', message: '' })
const submitting = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')

const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const lightboxMedia = computed(() => details.value?.medias?.[lightboxIdx.value] ?? null)

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}

onMounted(async () => {
  try {
    const [p, c] = await Promise.allSettled([
      fetchPublic(`/p/${tenantSlug}/${projectSlug}`),
      corretorCode ? fetchPublic(`/p/${tenantSlug}/corretores/${corretorCode}`) : Promise.resolve(null),
    ])
    if (p.status === 'fulfilled') project.value = p.value
    else error.value = (p.reason as any)?.message || 'Loteamento não encontrado'
    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e: any) {
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
    toastSuccess('Formulário enviado! Entraremos em contato.')
  } catch (e: any) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}
</script>

<style scoped>
/* ─── V4 High-Conversion Style ─── */
.pub-page { 
  background: #f8fafc; 
  color: #1e293b; 
  font-family: 'Inter', sans-serif;
  scroll-behavior: smooth;
}

.pub-container-xl {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Header V4 */
.lot-header-v4 {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.back-link-v4 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: color 0.2s;
}
.back-link-v4:hover { color: var(--primary); }

.project-tags { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 500; }
.tag-tenant { color: #94a3b8; }
.tag-pname { color: #475569; padding: 4px 10px; background: #f1f5f9; border-radius: 4px; }

/* Main Layout V4 */
.layout-v4-main {
  position: relative;
  display: flex;
  min-height: calc(100vh - 70px);
  background: #f1f5f9; /* Slightly darker background for depth */
}

.main-content-flow-v4 {
  flex: 1;
  min-width: 0;
}

/* Vertical Nav Guide - Floating Design */
.side-navigation-guide {
  position: sticky;
  top: 120px;
  height: fit-content;
  width: 80px;
  display: flex;
  flex-direction: column;
  padding: 32px 0;
  background: white;
  border-radius: 40px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); /* Stronger shadow for depth */
  border: 1px solid #e2e8f0;
  margin: 40px 20px 40px 30px;
  flex-shrink: 0;
  z-index: 50;
}
@media (max-width: 1250px) { 
  .side-navigation-guide { display: none; } 
}

.nav-stack {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
}

/* The vertical line - shorter and centered */
.nav-stack::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 15px;
  bottom: 15px;
  width: 2px;
  background: #f1f5f9;
  transform: translateX(-50%);
}

.nav-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  width: 100%;
  padding: 16px 0;
  position: relative;
  z-index: 2;
  transition: all 0.3s;
}

.nav-dot .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid white;
  box-shadow: 0 0 0 1px #e2e8f0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-dot .label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #94a3b8;
  margin-top: 10px;
  letter-spacing: 0.5px;
  transition: all 0.3s;
}

.nav-dot:hover .dot {
  background: var(--primary);
  transform: scale(1.4);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.nav-dot:hover .label {
  color: var(--primary);
  transform: translateY(2px);
}

/* Active Highlight (Static for now, improved look) */
.nav-dot .dot.highlight { 
  background: var(--primary); 
  width: 14px;
  height: 14px;
  box-shadow: 0 0 0 4px var(--primary-light);
}
.nav-dot .dot.highlight + .label {
  color: var(--primary);
  font-weight: 900;
}

/* Split View Grid */
.page-container-v4 {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 24px;
}
.split-view {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 40px;
  padding-top: 40px;
  padding-bottom: 80px;
}
@media (max-width: 1150px) { 
  .split-view { grid-template-columns: 1fr; } 
}

/* Hero V4 */
.hero-v4 {
  background: white;
  padding: 60px 40px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.04);
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
  border: 1px solid white;
  scroll-margin-top: 130px; /* Better clearing for sticky header */
}
.lot-code-title { 
  font-size: 3.5rem; 
  font-weight: 900; 
  margin-bottom: 24px; 
  color: #0f172a; 
  line-height: 1;
}
.quick-metrics-v4 { display: flex; gap: 32px; }
.q-item { display: flex; flex-direction: column; }
.q-val { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
.q-unit { font-size: 0.8125rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; }

/* Section Generic V4 */
.section-v4 {
  background: white;
  padding: 48px 40px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.04);
  margin-bottom: 32px;
  border: 1px solid white;
  scroll-margin-top: 130px;
}
.section-title-v4 { margin-bottom: 32px; display: flex; align-items: center; gap: 20px; }
.section-title-v4 h2 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; }
.title-line { flex: 1; height: 1px; background: #e2e8f0; }

/* Gallery V4 */
.gallery-v4 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 150px;
  gap: 12px;
}
.gallery-tile { border-radius: 12px; overflow: hidden; cursor: pointer; position: relative; }
.gallery-tile.main { grid-column: span 2; grid-row: span 2; }
.gallery-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.gallery-tile:hover img { transform: scale(1.05); }

/* Specs Grid V4 - Enhanced for readability */
.specs-grid-v4 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.spec-entry {
  background: #f8fafc;
  padding: 24px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #e2e8f0;
}
.spec-entry .s-label { font-size: 0.8125rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.spec-entry .s-value { font-size: 1.5rem; font-weight: 900; color: #0f172a; }

.notes-box-v4 { margin-top: 32px; background: #ecf3ff; border-radius: 12px; overflow: hidden; }
.box-header { padding: 12px 20px; background: #dbeafe; color: #1e40af; font-weight: 700; font-size: 0.875rem; }
.box-body { padding: 20px; font-size: 1rem; line-height: 1.7; color: #1e293b; }

/* Finance V4 - Enhanced for visibility */
.finance-card-v4 { border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
.finance-header { display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.h-item { flex: 1; padding: 32px; display: flex; flex-direction: column; }
.h-item.primary { background: #1e293b; color: white; }
.h-item .l { font-size: 0.875rem; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; color: #94a3b8; }
.h-item .v { font-size: 2.25rem; font-weight: 900; }

.finance-body { padding: 48px 40px; }
.plan-group { margin-bottom: 56px; }
.plan-group:last-child { margin-bottom: 0; }
.group-label { 
  font-size: 1.25rem; 
  font-weight: 900; 
  color: #0f172a; 
  margin-bottom: 28px; 
  border-left: 6px solid var(--primary); 
  padding: 4px 0 4px 20px;
  line-height: 1;
  text-transform: none;
  letter-spacing: -0.5px;
}
.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.plan-pill {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 24px 28px;
  border-radius: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.plan-pill:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); }
.p-qty { font-weight: 800; font-size: 1.0625rem; color: #475569; }
.p-val { font-weight: 900; color: #0f172a; font-size: 1.25rem; }
.plan-pill.balloon { border-color: #cbd5e1; background: #f1f5f9; }
.p-qty { font-weight: 800; font-size: 1rem; color: #475569; }
.p-val { font-weight: 900; color: #0f172a; font-size: 1.125rem; }

.finance-note { 
  padding: 24px 40px; 
  background: #fffbeb; 
  display: flex; 
  align-items: flex-start; 
  gap: 16px; 
  color: #92400e; 
  font-size: 0.9375rem; 
  font-weight: 600; 
  border-top: 1px solid #fef3c7; 
}
.note-content { flex: 1; }
.note-content p { margin: 0 0 8px 0; line-height: 1.5; }
.note-content p:last-child { margin-bottom: 0; }

/* Sidebar V4 - Senior friendly conversion */
.sidebar-col { position: relative; }
.sticky-conversion-card { position: sticky; top: 100px; z-index: 10; }

.price-display-v4 {
  background: white;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}
.pd-label { font-size: 1rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
.pd-value { font-size: 2.5rem; font-weight: 900; color: var(--primary); margin: 12px 0; letter-spacing: -1px; }

.lead-form-v4 {
  background: white;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  border: 1px solid #e2e8f0;
}
.form-header-v4 h3 { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-bottom: 12px; }
.form-header-v4 p { font-size: 1rem; color: #475569; margin-bottom: 32px; line-height: 1.6; }

.f-field { margin-bottom: 12px; }
.f-field input {
  width: 100%; padding: 18px 20px; border-radius: 12px; border: 1px solid #d1d5db; background: #f8fafc;
  font-family: inherit; font-size: 1.0625rem; font-weight: 500; transition: all 0.2s;
}
.f-field input:focus { border-color: var(--primary); outline: none; background: white; box-shadow: 0 0 0 4px var(--primary-light); }

.cta-submit-v4 {
  width: 100%; padding: 20px; background: var(--primary); color: white; border: none; border-radius: 12px;
  font-weight: 900; font-size: 1.125rem; cursor: pointer; transition: all 0.2s;
  letter-spacing: 0.5px; margin-top: 8px;
}
.cta-submit-v4:hover { background: #1e40af; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); }
.cta-submit-v4:disabled { opacity: 0.6; cursor: not-allowed; }

.wa-btn-v4 {
  display: block; width: 100%; padding: 18px; text-align: center; border: 2px solid #22c55e;
  border-radius: 12px; color: #15803d; text-decoration: none; font-weight: 800; font-size: 1rem;
  transition: all 0.2s;
}
.wa-btn-v4:hover { background: #22c55e; color: white; }

.broker-info-v4 { margin-top: 24px; }
.br-header { font-size: 0.8125rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
.br-card { 
  background: white; padding: 20px; border-radius: 16px; display: flex; align-items: center; gap: 16px; 
  border: 1px solid #e2e8f0;
}
.br-img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
.br-avatar-placeholder { width: 56px; height: 56px; border-radius: 50%; background: #1e293b; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.25rem; }
.br-name { display: block; font-size: 1rem; color: #0f172a; font-weight: 800; }
.br-role { font-size: 0.8125rem; color: #64748b; }

/* Footers */
.footer-v4 { padding: 80px 0; background: white; border-top: 1px solid #e2e8f0; }
.assets-header-v4 { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 32px; }
.assets-header-v4 h3 { font-size: 1.5rem; font-weight: 900; color: #0f172a; }
.assets-header-v4 a { font-size: 1rem; font-weight: 800; color: var(--primary); text-decoration: none; border-bottom: 2px solid transparent; transition: all 0.2s; }
.assets-header-v4 a:hover { border-color: var(--primary); }

.assets-scroll-v4 { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 24px; scrollbar-width: none; }
.assets-scroll-v4::-webkit-scrollbar { display: none; }
.asset-card-v4 {
  min-width: 260px; background: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #e2e8f0;
  text-decoration: none; color: inherit; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.asset-card-v4:hover { border-color: var(--primary); transform: translateY(-8px); background: white; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
.a-code { font-weight: 900; font-size: 1.25rem; color: #0f172a; }
.a-area { font-size: 0.9375rem; color: #64748b; margin: 8px 0; font-weight: 600; }
.a-price { font-weight: 800; color: var(--primary); font-size: 1.125rem; }

.legal-v4 { margin-top: 80px; text-align: center; color: #64748b; font-size: 1rem; border-top: 1px solid #f1f5f9; padding-top: 60px; }
.legal-v4 strong { color: #0f172a; font-weight: 800; }

/* Lightbox V4 Overrides */
.lightbox { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.98); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px); }
.lightbox-close { 
  position: absolute; top: 40px; right: 40px; color: white; border: 2px solid rgba(255,255,255,0.3); 
  width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; 
  background: rgba(0,0,0,0.2); cursor: pointer; transition: all 0.2s; z-index: 2010;
}
.lightbox-close:hover { background: #ef4444; border-color: #ef4444; transform: rotate(90deg); }

.lightbox-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2);
  color: white; width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2010;
}
.lightbox-nav:hover { background: white; color: #0f172a; border-color: white; scale: 1.1; box-shadow: 0 0 30px rgba(255,255,255,0.2); }
.lightbox-prev { left: 40px; }
.lightbox-next { right: 40px; }

.lightbox-content { 
  width: 85vw; height: 80vh; border-radius: 20px; overflow: hidden; 
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 30px 100px rgba(0,0,0,0.5);
  background: black;
}
.lightbox-content img, .lightbox-content video { width: 100%; height: 100%; object-fit: contain; }

@media (max-width: 1024px) {
  .lightbox-nav { width: 56px; height: 56px; }
  .lightbox-prev { left: 16px; }
  .lightbox-next { right: 16px; }
}

/* Mobile Support */
@media (max-width: 768px) {
  .page-container-v4 { padding: 0 16px; }
  .lot-code-title { font-size: 2.25rem; }
  .section-v4 { padding: 24px; }
  .hero-v4 { padding: 32px 24px; }
  .quick-metrics-v4 { flex-wrap: wrap; gap: 20px; }
  .finance-header { flex-direction: column; }
  .h-item { padding: 20px; border-bottom: 2px solid #f1f5f9; }
  .status-ribbon { width: 120px; font-size: 0.625rem; top: 15px; right: -30px; }
}

.form-success-v4 { text-align: center; padding: 20px 0; }
.success-icon-v4 { width: 64px; height: 64px; background: #22c55e; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 16px; }
</style>

