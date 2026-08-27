<template>
  <section ref="root" class="lot-terrain-3d">
    <div class="lot-terrain-3d__header">
      <div>
        <p class="lot-terrain-3d__eyebrow">Simulação aproximada do lote</p>
        <h3 class="lot-terrain-3d__title">{{ heading }}</h3>
        <p class="lot-terrain-3d__source">{{ geometryModeLabel }}</p>
      </div>

      <button type="button" class="lot-terrain-3d__reset" @click="resetView">
        Centralizar
      </button>
    </div>

    <!-- Palco: no desktop os controles flutuam sobre o modelo; no mobile eles
         descem para o fluxo, abaixo do canvas, em vez de disputar a mesma área. -->
    <div class="lot-terrain-3d__stage" @pointerdown="dismissHint" @wheel.passive="dismissHint">
      <div class="lot-terrain-3d__viewport">
        <div ref="canvasHost" class="lot-terrain-3d__canvas"></div>

        <div
          v-if="!isSceneReady && !sceneError"
          class="lot-terrain-3d__overlay lot-terrain-3d__overlay--loading"
          role="status"
          aria-live="polite"
        >
          Preparando visualização 3D…
        </div>

        <div
          v-else-if="sceneError"
          class="lot-terrain-3d__overlay lot-terrain-3d__overlay--error"
          role="alert"
        >
          {{ sceneError }}
        </div>

        <Transition name="lot3d-hint">
          <p v-if="showHint" class="lot-terrain-3d__hint">
            {{ hintText }}
          </p>
        </Transition>
      </div>

      <div class="lot-terrain-3d__controls" role="group" aria-label="Camadas do modelo">
        <button
          v-for="control in controlChips"
          :key="control.key"
          type="button"
          :aria-pressed="control.model.value ? 'true' : 'false'"
          class="lot-terrain-3d__control-chip"
          :class="{ 'is-active': control.model.value }"
          @click="control.model.value = !control.model.value"
        >
          {{ control.label }}
        </button>
      </div>

      <div v-if="hasSolarGuide && showSolarOverlay" class="lot-terrain-3d__sun">
        <label class="lot-terrain-3d__sun-label" for="lot-sun-position">Posição do sol</label>
        <div class="lot-terrain-3d__sun-track">
          <span class="lot-terrain-3d__sun-end">Nascente</span>
          <input
            id="lot-sun-position"
            v-model.number="sunSlider"
            class="lot-terrain-3d__sun-range"
            type="range"
            min="0.06"
            max="0.94"
            step="0.02"
            :aria-valuetext="sunPositionLabel"
          />
          <span class="lot-terrain-3d__sun-end">Poente</span>
        </div>
      </div>
    </div>

    <LotTerrainMetrics
      :spec="terrainSpec"
      :display-area="displayArea"
      :slope-text="slopeText"
    />

    <p class="lot-terrain-3d__footnote">
      *Esse modelo é gerado automaticamente com base nos dados disponíveis de medida. Pode não condizer com o formato real do lote e deve ser usado apenas para fins de visualização aproximada. Para informações precisas, consulte a planta oficial ou as medidas fornecidas pela loteadora.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import LotTerrainMetrics from './LotTerrainMetrics.vue'
import { LOT_TERRAIN_COLORS } from './lotTerrainPalette'
import { useLotTerrainData, type LotTerrainPresetProps } from './useLotTerrainData'
import { useLotTerrainScene } from './useLotTerrainScene'

const props = defineProps<LotTerrainPresetProps>()

const root = ref<HTMLElement | null>(null)
const canvasHost = ref<HTMLElement | null>(null)
const showFrontOverlay = ref(true)
const showMeasureOverlay = ref(true)
const showSolarOverlay = ref(true)
const showBuildingOverlay = ref(true)
// Sol a meio caminho do poente: e a posicao que produz a sombra mais legivel.
const sunSlider = ref(0.68)

const {
  normalizedPolygon,
  terrainSpec,
  heading,
  slopeText,
  displayArea,
  geometryModeLabel,
  solarGuideAngleDeg,
  hasSolarGuide,
  buildingParams,
  hasBuildingData,
} = useLotTerrainData(props)

// O arco corre do poente (t = 0) ao nascente (t = 1); o controle vai ao contrario,
// com o nascente à esquerda. Sem hora: o modelo mostra o percurso, não o relógio —
// a hora real depende de latitude e época do ano, que o simulador não conhece.
const sunPathT = computed(() => 1 - sunSlider.value)

// A dica de interação é instrução de primeira vez, não elemento fixo: some ao
// primeiro toque no modelo (ou sozinha, em alguns segundos). Enquanto ficava
// permanente, cobria o controle de sol no mobile.
const showHint = ref(true)
const isCoarsePointer = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | null = null

const hintText = computed(() =>
  isCoarsePointer.value
    ? 'Arraste para girar · pinça para aproximar'
    : 'Arraste para orbitar · role para aproximar',
)

const dismissHint = () => {
  if (hintTimer) {
    clearTimeout(hintTimer)
    hintTimer = null
  }
  showHint.value = false
}

const sunPositionLabel = computed(() => {
  if (sunSlider.value < 0.34) return 'Próximo ao nascente'
  if (sunSlider.value > 0.66) return 'Próximo ao poente'
  return 'Sol a pino'
})

const {
  isSceneReady,
  sceneError,
  initScene,
  destroyScene,
  setActive,
  resetView,
  remountTerrain,
  updateSunPosition,
  applyOverlayVisibility,
} = useLotTerrainScene({
  canvasHost,
  colors: () => LOT_TERRAIN_COLORS,
  normalizedPolygon: () => normalizedPolygon.value,
  terrainSpec: () => terrainSpec.value,
  buildingParams: () => buildingParams.value,
  hasBuildingData: () => hasBuildingData.value,
  hasSolarGuide: () => hasSolarGuide.value,
  solarGuideAngleDeg: () => solarGuideAngleDeg.value,
  showFrontOverlay,
  showMeasureOverlay,
  showSolarOverlay,
  showBuildingOverlay,
  sunPathT,
})

watch(sunSlider, () => {
  updateSunPosition()
})

const controlChips = computed(() => [
  { key: 'front', label: 'Frente', model: showFrontOverlay, visible: true },
  { key: 'measure', label: 'Medidas', model: showMeasureOverlay, visible: true },
  { key: 'solar', label: 'Sol', model: showSolarOverlay, visible: hasSolarGuide.value },
  { key: 'building', label: 'Construção', model: showBuildingOverlay, visible: hasBuildingData.value },
].filter((control) => control.visible))

// Só o que muda a geometria remonta a cena. O toggle de construção entra aqui
// porque a piscina escava o próprio terreno.
watch([terrainSpec, normalizedPolygon, solarGuideAngleDeg, showBuildingOverlay], () => {
  remountTerrain()
})

watch([showFrontOverlay, showMeasureOverlay, showSolarOverlay], () => {
  applyOverlayVisibility()
})

// A cena só nasce quando o bloco entra em tela, e o laço de render dorme quando
// ele sai: numa página longa de lote, o WebGL não gasta quadro enquanto o
// visitante lê o restante do conteúdo.
let visibilityObserver: IntersectionObserver | null = null
let hasInitialized = false

onMounted(() => {
  isCoarsePointer.value = window.matchMedia('(hover: none)').matches
  hintTimer = setTimeout(dismissHint, 7000)

  if (!root.value || typeof IntersectionObserver === 'undefined') {
    hasInitialized = true
    initScene()
    return
  }

  visibilityObserver = new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting)
    if (visible && !hasInitialized) {
      hasInitialized = true
      initScene()
      return
    }
    setActive(visible)
  }, { rootMargin: '200px 0px' })

  visibilityObserver.observe(root.value)
})

onUnmounted(() => {
  if (hintTimer) clearTimeout(hintTimer)
  visibilityObserver?.disconnect()
  destroyScene()
})
</script>

<style scoped>
.lot-terrain-3d {
  --lot3d-bg: linear-gradient(145deg, #fff7e6 0%, #f0d19b 62%, #e6c185 100%);
  --lot3d-border: rgba(102, 63, 29, 0.14);
  --lot3d-text: #4b2d18;
  --lot3d-muted: #6f4d2c;
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid var(--lot3d-border);
  background: var(--lot3d-bg);
  box-shadow: 0 28px 70px rgba(111, 73, 35, 0.12);
  overflow: hidden;
}

.lot-terrain-3d__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.lot-terrain-3d__eyebrow {
  margin: 0 0 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--lot3d-muted);
}

.lot-terrain-3d__title {
  margin: 0;
  font-size: clamp(1.15rem, 2vw, 1.5rem);
  color: var(--lot3d-text);
}

.lot-terrain-3d__source {
  margin: 4px 0 0;
  font-size: 0.76rem;
  color: var(--lot3d-muted);
}

.lot-terrain-3d__reset {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--lot3d-text);
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
}

/* O palco guarda o canvas e os controles. No desktop os controles flutuam
   sobre o modelo; no mobile viram linhas no fluxo, logo abaixo dele. */
.lot-terrain-3d__stage {
  position: relative;
}

.lot-terrain-3d__viewport {
  position: relative;
  height: clamp(340px, 54vw, 560px);
  border-radius: 24px;
  background:
    radial-gradient(circle at 50% 22%, rgba(255, 250, 236, 0.92), rgba(255, 248, 228, 0) 58%),
    linear-gradient(180deg, rgba(255, 252, 244, 0.74), rgba(228, 193, 133, 0.52));
  border: 1px solid rgba(112, 70, 33, 0.1);
  overflow: hidden;
}

/* Controle segmentado unico: os toggles pertencem ao mesmo grupo, entao ficam
   em uma so peca em vez de botoes soltos espalhados sobre o modelo. */
.lot-terrain-3d__controls {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  display: inline-flex;
  gap: 2px;
  padding: 4px;
  max-width: calc(100% - 28px);
  border-radius: 999px;
  border: 1px solid rgba(112, 70, 33, 0.12);
  background: rgba(255, 252, 245, 0.86);
  box-shadow: 0 10px 24px rgba(96, 64, 30, 0.14);
  backdrop-filter: blur(10px);
  overflow-x: auto;
  scrollbar-width: none;
}

.lot-terrain-3d__controls::-webkit-scrollbar {
  display: none;
}

.lot-terrain-3d__control-chip {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--lot3d-muted);
  padding: 6px 13px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.lot-terrain-3d__control-chip:hover {
  color: var(--lot3d-text);
  background: rgba(173, 100, 39, 0.1);
}

.lot-terrain-3d__control-chip.is-active {
  background: rgba(173, 100, 39, 0.95);
  color: #fff7ed;
}

.lot-terrain-3d__control-chip:focus-visible {
  outline: 2px solid rgba(173, 100, 39, 0.9);
  outline-offset: 2px;
}

.lot-terrain-3d__canvas {
  position: absolute;
  inset: 0;
}

.lot-terrain-3d__canvas :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* Camada de etiquetas HTML do CSS2DRenderer, criada fora do template. */
.lot-terrain-3d__canvas :deep(.lot-terrain-3d__labels) {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
}

.lot-terrain-3d__canvas :deep(.lot3d-label) {
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(102, 63, 29, 0.16);
  background: rgba(255, 252, 245, 0.92);
  color: #4b2d18;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 6px 16px rgba(76, 45, 20, 0.18);
  backdrop-filter: blur(6px);
}

.lot-terrain-3d__canvas :deep(.lot3d-label--front) {
  background: #c2410c;
  border-color: #9a3412;
  color: #fff7ed;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.lot-terrain-3d__canvas :deep(.lot3d-label--setback) {
  padding: 2px 7px;
  font-size: 0.64rem;
  font-weight: 600;
  color: #7c5410;
  background: rgba(254, 243, 199, 0.9);
  border-color: rgba(180, 130, 20, 0.28);
  box-shadow: none;
}

.lot-terrain-3d__canvas :deep(.lot3d-label--sun) {
  color: #7c5410;
  background: rgba(254, 243, 199, 0.94);
  border-color: rgba(180, 130, 20, 0.34);
}

.lot-terrain-3d__canvas :deep(.lot3d-label--viela) {
  color: #6b5b4b;
  font-weight: 600;
}

.lot-terrain-3d__overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
  color: var(--lot3d-text);
  background: rgba(255, 250, 240, 0.52);
  backdrop-filter: blur(6px);
}

.lot-terrain-3d__overlay--loading {
  font-weight: 600;
}

.lot-terrain-3d__overlay--error {
  font-weight: 700;
}

.lot-terrain-3d__sun {
  position: absolute;
  right: 18px;
  bottom: 16px;
  z-index: 3;
  display: grid;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 16px;
  border: 1px solid rgba(112, 70, 33, 0.14);
  background: rgba(255, 252, 245, 0.9);
  box-shadow: 0 8px 18px rgba(96, 64, 30, 0.14);
  backdrop-filter: blur(8px);
}

.lot-terrain-3d__sun-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--lot3d-text);
}

.lot-terrain-3d__sun-track {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lot-terrain-3d__sun-end {
  font-size: 0.64rem;
  font-weight: 600;
  color: var(--lot3d-muted);
}

.lot-terrain-3d__sun-range {
  width: 132px;
  accent-color: #d4880e;
  cursor: pointer;
}

.lot-terrain-3d__hint {
  position: absolute;
  left: 18px;
  bottom: 16px;
  z-index: 3;
  margin: 0;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(75, 45, 24, 0.78);
  color: #fff7ed;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  pointer-events: none;
}

.lot3d-hint-enter-active,
.lot3d-hint-leave-active {
  transition: opacity 260ms ease;
}

.lot3d-hint-enter-from,
.lot3d-hint-leave-to {
  opacity: 0;
}

.lot-terrain-3d__footnote {
  margin: 0;
  color: var(--lot3d-muted);
  font-size: 0.75rem;
}

@media (max-width: 900px) {
  .lot-terrain-3d__controls {
    right: 12px;
    top: 12px;
    max-width: calc(100% - 24px);
  }

  .lot-terrain-3d__control-chip {
    padding: 6px 10px;
    font-size: 0.73rem;
  }

  .lot-terrain-3d__viewport {
    height: clamp(300px, 64vw, 440px);
  }
}

/* Mobile: uma moldura só. O card continua sendo o card, mas o canvas encosta
   nas bordas dele e os controles saem de cima do modelo — em vez de padding
   dentro de padding espremendo a visualização. */
@media (max-width: 768px) {
  .lot-terrain-3d {
    padding: 16px;
    border-radius: 22px;
    gap: 14px;
  }

  .lot-terrain-3d__header {
    align-items: center;
    gap: 12px;
  }

  .lot-terrain-3d__reset {
    flex: 0 0 auto;
    padding: 9px 14px;
    font-size: 0.8rem;
  }

  .lot-terrain-3d__stage {
    display: grid;
    gap: 12px;
  }

  .lot-terrain-3d__viewport {
    margin-inline: -16px;
    height: min(62vh, 420px);
    min-height: 300px;
    border-radius: 0;
    border-inline: 0;
  }

  .lot-terrain-3d__controls {
    position: static;
    max-width: none;
    flex-wrap: wrap;
    gap: 4px;
    overflow-x: visible;
    /* Empilhado em duas linhas, o raio de pilula deixa de fazer sentido. */
    border-radius: 18px;
    box-shadow: none;
    background: rgba(255, 252, 245, 0.7);
  }

  .lot-terrain-3d__control-chip {
    flex: 1 1 auto;
    padding: 9px 12px;
    font-size: 0.78rem;
    text-align: center;
  }

  .lot-terrain-3d__sun {
    position: static;
    gap: 8px;
    padding: 12px 14px;
    box-shadow: none;
  }

  .lot-terrain-3d__sun-track {
    gap: 10px;
  }

  .lot-terrain-3d__sun-range {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
    height: 26px;
  }

  .lot-terrain-3d__hint {
    left: 12px;
    right: 12px;
    bottom: 12px;
    font-size: 0.74rem;
    text-align: center;
  }

  .lot-terrain-3d__footnote {
    font-size: 0.7rem;
  }
}
</style>
