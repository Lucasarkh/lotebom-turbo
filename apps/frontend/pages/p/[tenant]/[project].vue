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

      <!-- Map section -->
      <section class="pub-section" id="mapa">
        <div class="pub-container">
          <h2 class="pub-section-title">Mapa Interativo</h2>
          <p class="pub-section-sub">Clique nos lotes para ver detalhes. Arraste para mover o mapa.</p>
          <ClientOnly>
            <PublicInteractiveMap
              :elements="project.mapElements || []"
              :mapBaseImageUrl="project.mapBaseImageUrl"
              @interest="openLeadForm($event)"
            />
          </ClientOnly>

          <!-- Legend -->
          <div class="pub-legend">
            <div class="legend-item"><span class="legend-dot" style="background: rgba(34,197,94,0.5)"></span> Disponível</div>
            <div class="legend-item"><span class="legend-dot" style="background: rgba(245,158,11,0.5)"></span> Reservado</div>
            <div class="legend-item"><span class="legend-dot" style="background: rgba(239,68,68,0.5)"></span> Vendido</div>
          </div>
        </div>
      </section>

      <!-- Media gallery -->
      <section v-if="project.projectMedias?.length" class="pub-section pub-section-alt" id="galeria">
        <div class="pub-container">
          <h2 class="pub-section-title">Galeria</h2>
          <div class="pub-gallery">
            <div
              v-for="(m, i) in project.projectMedias"
              :key="m.id"
              class="gallery-item"
              @click="openLightbox(i)"
            >
              <img v-if="m.type === 'PHOTO'" :src="m.url" :alt="m.caption || 'Foto'" loading="lazy" />
              <video v-else :src="m.url" />
              <div v-if="m.caption" class="gallery-caption">{{ m.caption }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Lead form -->
      <section class="pub-section" id="contato">
        <div class="pub-container">
          <div class="pub-form-wrapper">
            <div class="pub-form-info">
              <h2 class="pub-section-title">Tenho Interesse</h2>
              <p>Preencha o formulário e nossa equipe entrará em contato.</p>
              <div v-if="lotElements.length" class="pub-lot-summary">
                <h4>Lotes disponíveis: {{ availableLots }}</h4>
                <p v-if="priceRange">Valores a partir de <strong>R$ {{ priceRange }}</strong></p>
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
                <div v-if="lotElements.length" class="form-group">
                  <label class="form-label">Lote de interesse</label>
                  <select v-model="leadForm.mapElementId" class="form-input">
                    <option value="">Nenhum específico</option>
                    <option
                      v-for="lot in availableLotElements"
                      :key="lot.id"
                      :value="lot.id"
                    >{{ lot.code || lot.name || lot.id }} {{ lot.lotDetails?.areaM2 ? `— ${lot.lotDetails.areaM2} m²` : '' }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Mensagem</label>
                  <textarea v-model="leadForm.message" class="form-textarea" rows="3" placeholder="Conte-nos mais sobre o que procura..."></textarea>
                </div>
                <div v-if="leadError" class="alert alert-error">{{ leadError }}</div>
                <button type="submit" class="btn btn-primary btn-lg" :disabled="submitting" style="width:100%">
                  {{ submitting ? 'Enviando...' : 'Enviar' }}
                </button>
              </template>
            </form>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="pub-footer">
        <p>{{ project.tenant?.name }} &middot; Loteamento {{ project.name }}</p>
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
        <a href="#mapa">Mapa</a>
        <a v-if="project.projectMedias?.length" href="#galeria">Galeria</a>
        <a href="#contato" class="btn btn-primary btn-sm">Tenho Interesse</a>
      </nav>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'public' })

const route = useRoute()
const { fetchPublic } = usePublicApi()

const tenantSlug = route.params.tenant
const projectSlug = route.params.project
const { success: toastSuccess } = useToast()

const loading = ref(true)
const error = ref('')
const project = ref(null)

/* ── Lead form state ───── */
const leadForm = ref({ name: '', email: '', phone: '', mapElementId: '', message: '' })
const submitting = ref(false)
const leadSuccess = ref(false)
const leadError = ref('')
const formRef = ref(null)

/* ── Lightbox state ───── */
const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const lightboxMedia = computed(() => project.value?.projectMedias?.[lightboxIdx.value] ?? null)

/* ── Computed lot stats ───── */
const lotElements = computed(() => (project.value?.mapElements || []).filter(e => e.type === 'LOT'))
const availableLotElements = computed(() => lotElements.value.filter(e => (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE'))
const totalLots = computed(() => lotElements.value.length)
const availableLots = computed(() => lotElements.value.filter(e => (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE').length)
const reservedLots = computed(() => lotElements.value.filter(e => e.lotDetails?.status === 'RESERVED').length)
const soldLots = computed(() => lotElements.value.filter(e => e.lotDetails?.status === 'SOLD').length)

const priceRange = computed(() => {
  const prices = availableLotElements.value
    .map(e => e.lotDetails?.price)
    .filter(Boolean)
    .sort((a, b) => a - b)
  if (!prices.length) return null
  return prices[0].toLocaleString('pt-BR')
})

/* ── Load ───── */
onMounted(async () => {
  try {
    project.value = await fetchPublic(`/p/${tenantSlug}/${projectSlug}`)
  } catch (e) {
    error.value = e.message || 'Projeto não encontrado'
  }
  loading.value = false
})

/* ── Lead submit ───── */
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
    }
    await fetchPublic(`/p/${tenantSlug}/${projectSlug}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    leadSuccess.value = true
    toastSuccess('Formulário enviado com sucesso!')
  } catch (e) {
    leadError.value = e.message || 'Erro ao enviar'
  }
  submitting.value = false
}

/* ── Helpers ───── */
function openLeadForm(el) {
  leadForm.value.mapElementId = el?.id || ''
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })
}

function openLightbox(idx) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}
</script>

<style scoped>
/* ── Hero ──────────────────── */
.pub-hero {
  background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%);
  color: white;
  padding: var(--space-12) var(--space-6);
  text-align: center;
}
.pub-hero-content { max-width: 700px; margin: 0 auto; }
.pub-tenant { font-size: 0.875rem; opacity: 0.8; margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: 0.05em; }
.pub-title { font-size: 2.5rem; font-weight: 700; margin-bottom: var(--space-3); line-height: 1.15; }
.pub-desc { font-size: 1.125rem; opacity: 0.9; margin-bottom: var(--space-6); line-height: 1.6; }

.pub-stats {
  display: flex;
  justify-content: center;
  gap: var(--space-6);
  flex-wrap: wrap;
}
.pub-stat { text-align: center; }
.pub-stat-n { display: block; font-size: 2rem; font-weight: 700; }
.pub-stat-l { font-size: 0.8125rem; opacity: 0.8; }

/* ── Sections ─────────────── */
.pub-section { padding: var(--space-12) var(--space-6); }
.pub-section-alt { background: white; }
.pub-container { max-width: 1000px; margin: 0 auto; }
.pub-section-title { font-size: 1.75rem; font-weight: 700; color: var(--gray-800); margin-bottom: var(--space-2); }
.pub-section-sub { color: var(--gray-500); margin-bottom: var(--space-5); }

/* ── Legend ─────────────────── */
.pub-legend {
  display: flex;
  gap: var(--space-5);
  justify-content: center;
  margin-top: var(--space-4);
  flex-wrap: wrap;
}
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--gray-600); }
.legend-dot { width: 16px; height: 16px; border-radius: 3px; }

/* ── Gallery ───────────────── */
.pub-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}
.gallery-item {
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  position: relative;
  aspect-ratio: 4/3;
  background: var(--gray-200);
}
.gallery-item img, .gallery-item video {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform 0.3s;
}
.gallery-item:hover img, .gallery-item:hover video { transform: scale(1.05); }
.gallery-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-3);
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  color: white;
  font-size: 0.8125rem;
}

/* ── Lead form ─────────────── */
.pub-form-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-8);
  align-items: start;
}
@media (max-width: 768px) {
  .pub-form-wrapper { grid-template-columns: 1fr; }
}
.pub-form-info { padding-top: var(--space-4); }
.pub-form-info p { color: var(--gray-600); margin-top: var(--space-3); line-height: 1.6; }
.pub-lot-summary { margin-top: var(--space-5); padding: var(--space-4); background: var(--primary-light); border-radius: var(--radius-md); }
.pub-lot-summary h4 { color: var(--primary); margin-bottom: var(--space-1); }
.pub-lot-summary p { color: var(--gray-600); font-size: 0.875rem; margin: 0; }

.pub-lead-form { padding: var(--space-6); }

/* ── Footer ────────────────── */
.pub-footer {
  text-align: center;
  padding: var(--space-6);
  color: var(--gray-400);
  font-size: 0.8125rem;
  border-top: 1px solid var(--gray-200);
}

/* ── Sticky nav ────────────── */
.pub-sticky-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--gray-200);
  z-index: 50;
}
.pub-sticky-nav a {
  color: var(--gray-600);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}
.pub-sticky-nav a:hover { color: var(--primary); }

/* ── Lightbox ──────────────── */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: transparent;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  z-index: 2;
}
.lightbox-content img, .lightbox-content video {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: var(--radius-md);
}
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.15);
  border: none;
  color: white;
  font-size: 3rem;
  padding: 0 16px;
  cursor: pointer;
  border-radius: var(--radius-md);
  height: 60px;
  display: flex;
  align-items: center;
}
.lightbox-nav:hover { background: rgba(255,255,255,0.25); }
.lightbox-prev { left: 16px; }
.lightbox-next { right: 16px; }

/* ── Loading / Error ───────── */
.pub-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.pub-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-6);
}
.pub-error-card {
  text-align: center;
  padding: var(--space-8);
  max-width: 400px;
}
.pub-error-card h2 { margin-bottom: var(--space-3); color: var(--gray-800); }
.pub-error-card p { color: var(--gray-500); }
</style>
