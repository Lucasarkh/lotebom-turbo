<template>
  <div class="pub-page">
    <!-- Loading -->
    <div v-if="loading" class="pub-loading">
      <div class="loading-spinner"></div>
      <p>Carregando unidades...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pub-error">
      <div class="pub-error-card card">
        <h2>Projeto não encontrado</h2>
        <p>{{ error }}</p>
        <NuxtLink :to="`/${tenantSlug}/${projectSlug}`" class="v4-btn-primary" style="display: inline-block; margin-top: 1rem;">Voltar ao projeto</NuxtLink>
      </div>
    </div>

    <!-- Project -->
    <template v-else-if="project">
      <!-- Minimal Header -->
      <nav class="v4-mini-header">
        <div class="v4-container">
          <div class="v4-mini-header-inner">
            <NuxtLink :to="`/${tenantSlug}/${projectSlug}`" class="v4-back-link">
              ← Voltar para o Projeto
            </NuxtLink>
            <div class="v4-mini-brand">
              <strong>{{ project.name }}</strong>
            </div>
          </div>
        </div>
      </nav>

      <section class="v4-section" style="padding-top: 140px;">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title">Todas as Unidades Disponíveis</h2>
            <p class="v4-section-subtitle">Temos {{ unifiedAvailableLots.length }} unidades esperando por você. Explore as opções abaixo.</p>
          </div>

          <div class="v4-lots-grid">
            <NuxtLink v-for="lot in paginatedAvailableLots" :key="lot.id" :to="lotPageUrl(lot)" class="v4-lot-card">
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

          <div v-if="lotsMeta.totalPages > 1" style="margin-top: 60px; display: flex; justify-content: center;">
            <CommonPagination :meta="lotsMeta" @change="lotsPage = $event" />
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
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const { fetchPublic } = usePublicApi()

const tenantSlug = route.params.tenant as string
const projectSlug = route.params.project as string
const corretorCode = route.query.c || ''

const loading = ref(true)
const error = ref('')
const project = ref<any>(null)
const corretor = ref<any>(null)

const lotsPage = ref(1)
const lotsPerPage = 12

/** Duplicate logic from index.vue for now - ideally move to a composable */
function calcContractArea(lot: any): number | null {
  const poly: Array<{x:number,y:number}> = lot.polygon ?? []
  if (poly.length < 2) return null
  const lengths = poly.map((p: any, i: number) => {
    const q = poly[(i + 1) % poly.length]!
    return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
  })
  const sm: Array<{meters: number | null}> = lot.sideMetrics ?? []
  const m = sm.map(s => s.meters)
  if (sm.length === 4 && m.every(v => v !== null && v > 0)) {
    return ((m[0]! + m[2]!) / 2) * ((m[1]! + m[3]!) / 2)
  }
  const scales: (number | null)[] = lengths.map((len: number, i: number) => {
    const mv = sm[i]?.meters
    return (mv != null && mv > 0 && len > 0) ? mv / len : null
  })
  const validScales = scales.filter((s): s is number => s !== null)
  if (validScales.length < Math.max(1, Math.ceil(sm.length * 0.5))) return null
  const product = validScales.reduce((a, b) => a * b, 1)
  const geometricMean = Math.pow(product, 1 / validScales.length)
  return (lot.area ?? 0) * geometricMean * geometricMean
}

const lotElements = computed(() => (project.value?.mapElements || []).filter((e: any) => e.type === 'LOT'))
const availableLotElements = computed(() => lotElements.value.filter((e: any) => (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE'))

const mapDataLots = computed(() => {
  const raw = project.value?.mapData
  if (!raw) return []
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data.lots) return []
    if (Array.isArray(data.lots)) return data.lots.map(([, l]: [any, any]) => l)
    return Object.values(data.lots)
  } catch { return [] }
})

const hasMapData = computed(() => !!project.value?.mapData)

const unifiedAvailableLots = computed(() => {
  let list = []
  if (hasMapData.value) {
    const rawMapData = typeof project.value.mapData === 'string' ? JSON.parse(project.value.mapData) : project.value.mapData
    const PPM = Number(rawMapData.pixelsPerMeter) || 10
    list = mapDataLots.value
      .filter((l: any) => l.status === 'available')
      .map((l: any) => {
        const contractArea = calcContractArea(l)
        let finalAreaM2 = (Number(l.area) > 0 ? (Number(l.area) / (PPM * PPM)) : 0)
        if (l.manualAreaM2 != null) finalAreaM2 = Number(l.manualAreaM2)
        else if (contractArea !== null) finalAreaM2 = contractArea
        const finalFrontage = l.manualFrontage != null ? Number(l.manualFrontage) : (Number(l.frontage) > 0 ? (Number(l.frontage) / PPM) : 0)
        return { id: l.id, name: l.label, code: l.code || l.label || l.id, lotDetails: { areaM2: parseFloat(finalAreaM2.toFixed(2)), frontage: parseFloat(finalFrontage.toFixed(2)), price: l.price } }
      })
  } else {
    list = availableLotElements.value
  }
  return list
})

const paginatedAvailableLots = computed(() => {
  const start = (lotsPage.value - 1) * lotsPerPage
  const end = start + lotsPerPage
  return unifiedAvailableLots.value.slice(start, end)
})

const lotsMeta = computed(() => ({
  totalItems: unifiedAvailableLots.value.length,
  itemCount: paginatedAvailableLots.value.length,
  itemsPerPage: lotsPerPage,
  totalPages: Math.ceil(unifiedAvailableLots.value.length / lotsPerPage),
  currentPage: lotsPage.value
}))

const lotPageUrl = (lot: any) => {
  const code = lot.code || lot.id || lot.name
  const base = `/${tenantSlug}/${projectSlug}/lote/${encodeURIComponent(code)}`
  return corretorCode ? `${base}?c=${corretorCode}` : base
}

onMounted(async () => {
  try {
    const p = await fetchPublic(`/p/${tenantSlug}/${projectSlug}`)
    if (p) {
      project.value = p
      useHead({ title: `Unidades Disponíveis — ${p.name}` })
    } else error.value = 'Projeto não encontrado'
  } catch (e: any) {
    error.value = e.message || 'Projeto não encontrado'
  }
  loading.value = false
})
</script>

<style scoped>
/* Replicating V4 styles from index.vue - ideally these would be in a common CSS */
.pub-page { --v4-primary: #0071e3; --v4-primary-hover: #0077ed; --v4-text: #1d1d1f; --v4-text-muted: #86868b; --v4-bg: #ffffff; --v4-bg-alt: #f5f5f7; --v4-border: #d2d2d7; --v4-radius-lg: 18px; --v4-shadow-soft: 0 10px 30px rgba(0,0,0,0.05); --v4-shadow-elevated: 0 20px 40px rgba(0,0,0,0.1); }

.v4-container { width: 90%; max-width: 1200px; margin: 0 auto; }
.v4-section { padding: 100px 0; }
.v4-section-header { margin-bottom: 60px; text-align: center; }
.v4-section-title { font-size: 48px; font-weight: 600; color: var(--v4-text); letter-spacing: -0.015em; margin-bottom: 16px; }
.v4-section-subtitle { font-size: 21px; color: var(--v4-text-muted); line-height: 1.4; max-width: 700px; margin: 0 auto; }

.v4-mini-header { position: fixed; top: 0; left: 0; right: 0; background: rgba(255,255,255,0.8); backdrop-filter: saturate(180%) blur(20px); z-index: 1000; border-bottom: 1px solid var(--v4-border); padding: 20px 0; }
.v4-mini-header-inner { display: flex; justify-content: space-between; align-items: center; }
.v4-back-link { color: var(--v4-primary); text-decoration: none; font-weight: 600; font-size: 15px; }
.v4-mini-brand { font-size: 17px; }

.v4-lots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
.v4-lot-card { background: white; border-radius: var(--v4-radius-lg); padding: 32px; text-decoration: none; color: inherit; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #f2f2f2; display: flex; flex-direction: column; gap: 12px; }
.v4-lot-card:hover { box-shadow: var(--v4-shadow-elevated); transform: translateY(-4px); border-color: var(--v4-primary); }
.v4-lot-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.v4-lot-id { display: flex; flex-direction: column; gap: 4px; }
.v4-lot-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--v4-text-muted); letter-spacing: 0.1em; }
.v4-lot-code { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: var(--v4-text); }
.v4-lot-status { font-size: 11px; font-weight: 700; color: #32d74b; background: rgba(50, 215, 75, 0.1); padding: 6px 14px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.05em; }
.v4-lot-info-row { display: flex; gap: 20px; margin-bottom: 20px; color: var(--v4-text-muted); font-size: 15px; align-items: center; }
.v4-lot-price { margin-top: auto; border-top: 1px solid #f5f5f7; padding-top: 20px; }
.v4-price-label { display: block; font-size: 12px; color: var(--v4-text-muted); margin-bottom: 4px; }
.v4-price-value { font-size: 20px; font-weight: 600; color: var(--v4-text); }
.v4-lot-card-footer { margin-top: 20px; font-size: 15px; color: var(--v4-primary); font-weight: 600; display: flex; align-items: center; justify-content: space-between; }

.v4-btn-primary { background: var(--v4-primary); color: white; padding: 16px 32px; border-radius: 12px; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; }
.v4-btn-primary:hover { background: var(--v4-primary-hover); }

.v4-footer { padding: 80px 0; border-top: 1px solid var(--v4-border); background: var(--v4-bg-alt); }
.v4-footer-tenant { font-weight: 600; font-size: 17px; margin-bottom: 4px; display: block; }
.v4-footer-copyright { font-size: 12px; color: var(--v4-text-muted); }

.pub-loading, .pub-error { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
@keyframes spinner { to { transform: rotate(360deg); } }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 113, 227, 0.1); border-top-color: var(--v4-primary); border-radius: 50%; animation: spinner 1s linear infinite; }

@media (max-width: 768px) {
  .v4-section-title { font-size: 32px; }
  .v4-section { padding: 60px 0; }
}
</style>
