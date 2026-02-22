<template>
  <div class="plant-map-viewer" ref="containerEl">
    <!-- Loading state -->
    <div v-if="!imageLoaded && !imageError" class="plant-map-viewer__loading">
      <div class="loading-spinner"></div>
      <span>Carregando planta...</span>
    </div>

    <!-- Error state -->
    <div v-if="imageError" class="plant-map-viewer__error">
      Não foi possível carregar a imagem da planta.
    </div>

    <!-- Main content — transform wrapper -->
    <div
      ref="contentEl"
      class="plant-map-viewer__content"
      :style="contentStyle"
      :class="{ 'is-ready': imageLoaded }"
    >
      <!-- Plant image (lazy, SSR-safe) -->
      <img
        v-if="plantMap.imageUrl"
        :src="plantMap.imageUrl"
        class="plant-map-viewer__image"
        alt="Planta do loteamento"
        draggable="false"
        loading="lazy"
        @load="onImageLoad"
        @error="imageError = true"
      />

      <!-- SVG overlay (hotspots + sun path) -->
      <svg
        v-if="imageLoaded"
        class="plant-map-viewer__overlay"
        :viewBox="`0 0 ${imgNaturalW} ${imgNaturalH}`"
        :width="imgNaturalW"
        :height="imgNaturalH"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Sun path line -->
        <SunPathLine
          :enabled="plantMap.sunPathEnabled"
          :angle-deg="plantMap.sunPathAngleDeg"
          :show-labels="plantMap.sunPathLabelEnabled"
          :width="imgNaturalW"
          :height="imgNaturalH"
          :scale="transform.scale"
        />

        <!-- Hotspot pins -->
        <template v-if="showBeacons">
          <HotspotPin
            v-for="hs in plantMap.hotspots"
            :key="hs.id"
            :hotspot="hs"
            :container-width="imgNaturalW"
            :container-height="imgNaturalH"
            :selected="selectedHotspot?.id === hs.id"
            :show-label="showLabels"
            :pin-radius="pinRadiusForScale"
            @click="openPopover($event, hs)"
          />
        </template>
      </svg>
    </div>

    <!-- Zoom controls -->
    <div class="plant-map-viewer__controls" v-if="showControls">
      <button 
        class="plant-map-viewer__btn" 
        :style="{ opacity: showBeacons ? 1 : 0.4 }"
        :title="showBeacons ? 'Esconder pontos' : 'Mostrar pontos'"
        @click="showBeacons = !showBeacons"
      >
        📍
      </button>
      <button class="plant-map-viewer__btn" aria-label="Zoom in" @click="zoomIn">＋</button>
      <button class="plant-map-viewer__btn" aria-label="Zoom out" @click="zoomOut">－</button>
      <button class="plant-map-viewer__btn" aria-label="Resetar zoom" title="Resetar" @click="resetTransform">⌂</button>
    </div>

    <!-- Legend -->
    <div v-if="showLegend && showBeacons" class="plant-map-viewer__legend">
      <div class="legend-item">
        <span class="legend-dot" style="background:#22c55e"></span> Disponível
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:#f59e0b"></span> Reservado
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:#ef4444"></span> Vendido
      </div>
    </div>

    <!-- Popover -->
    <HotspotPopover
      :hotspot="selectedHotspot"
      :anchor-x="popoverAnchor.x"
      :anchor-y="popoverAnchor.y"
      @close="selectedHotspot = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { PlantMap, PlantHotspot } from '~/composables/plantMap/types'
import { useZoomPan } from '~/composables/plantMap/useZoomPan'
import HotspotPin from './HotspotPin.vue'
import HotspotPopover from './HotspotPopover.vue'
import SunPathLine from './SunPathLine.vue'

const props = withDefaults(defineProps<{
  plantMap: PlantMap
  showControls?: boolean
  showLegend?: boolean
  /** Hide labels (useful on mobile or when too many hotspots) */
  hideLabels?: boolean
}>(), {
  showControls: true,
  showLegend: true,
  hideLabels: false,
})

// ── Zoom/pan ─────────────────────────────────────────────
const {
  transform,
  containerEl,
  contentEl,
  resetTransform,
  fitToContainer,
  clampOffset,
  clampScale,
  attach
} = useZoomPan({
  minScale: 0.3,
  maxScale: 8,
})

// Initialize on client only (SSR safe)
onMounted(() => {
  nextTick(() => attach())
})

const zoomIn = () => {
  if (!containerEl.value) return
  const rect = containerEl.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const currentS = transform.value.scale
  const newS = clampScale(currentS * 1.3)
  const ratio = newS / currentS
  const newX = cx - ratio * (cx - transform.value.x)
  const newY = cy - ratio * (cy - transform.value.y)
  
  transform.value = { 
    scale: newS,
    ...clampOffset(newS, newX, newY)
  }
}

const zoomOut = () => {
  if (!containerEl.value) return
  const rect = containerEl.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const currentS = transform.value.scale
  const newS = clampScale(currentS / 1.3)
  const ratio = newS / currentS
  const newX = cx - ratio * (cx - transform.value.x)
  const newY = cy - ratio * (cy - transform.value.y)
  
  transform.value = {
    scale: newS,
    ...clampOffset(newS, newX, newY)
  }
}

const contentStyle = computed(() => ({
  transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.scale})`,
  transformOrigin: '0 0',
}))

// ── Image loading ─────────────────────────────────────────
const imageLoaded = ref(false)
const imageError = ref(false)
const imgNaturalW = ref(props.plantMap.imageWidth ?? 1200)
const imgNaturalH = ref(props.plantMap.imageHeight ?? 800)

const onImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement
  imgNaturalW.value = img.naturalWidth || props.plantMap.imageWidth || 1200
  imgNaturalH.value = img.naturalHeight || props.plantMap.imageHeight || 800
  imageLoaded.value = true
  
  nextTick(() => {
    fitToContainer()
  })
}

// ── Labels ────────────────────────────────────────────────
const showLabels = computed(() => {
  if (props.hideLabels) return false
  // Auto-hide labels when zoomed out too much
  return transform.value.scale >= 0.6
})

// Scale pin radius inversely to keep consistent hit area
const pinRadiusForScale = computed(() =>
  Math.max(8, Math.min(24, 14 / transform.value.scale)),
)

// ── Popover ───────────────────────────────────────────────
const selectedHotspot = ref<PlantHotspot | null>(null)
const showBeacons = ref(true)

watch(showBeacons, (val) => {
  if (!val) selectedHotspot.value = null
})

const popoverAnchor = ref({ x: 0, y: 0 })

const openPopover = (e: MouseEvent | PlantHotspot, hotspot?: PlantHotspot) => {
  // Can be called from @click on HotspotPin (MouseEvent) or directly
  if (e instanceof MouseEvent) {
    popoverAnchor.value = { x: e.clientX, y: e.clientY }
    selectedHotspot.value = hotspot ?? null
  } else {
    // Called via keyboard (PlantHotspot passed directly)
    selectedHotspot.value = e
  }
}

// ── Close popover on outside click ────────────────────────
const handleContainerClick = () => {
  selectedHotspot.value = null
}
</script>

<style scoped>
.plant-map-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  background: #1a1a2e;
  border-radius: 12px;
  user-select: none;
}

.plant-map-viewer__loading,
.plant-map-viewer__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9ca3af;
  font-size: 14px;
  z-index: 2;
}

.plant-map-viewer__content {
  position: relative;
  display: inline-block;
  transition: none;
  will-change: transform;
}

.plant-map-viewer__image {
  display: block;
  max-width: none;
  -webkit-user-drag: none;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: high-quality;
  transform: translateZ(0);
}

.plant-map-viewer__overlay {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: all;
}

/* Controls */
.plant-map-viewer__controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.plant-map-viewer__btn {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: background 0.15s;
}
.plant-map-viewer__btn:hover { background: white; }

/* Legend */
.plant-map-viewer__legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #e5e7eb;
  font-weight: 500;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  border: 1.5px solid rgba(255,255,255,0.5);
}

/* Loading spinner (reuse global if available) */
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.15);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
