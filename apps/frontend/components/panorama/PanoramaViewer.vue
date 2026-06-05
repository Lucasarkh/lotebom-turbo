<template>
  <div class="panorama-viewer" ref="containerRef">
    <!-- 360 Viewer (EQUIRECTANGULAR) -->
    <div
      v-if="effectiveProjection === 'EQUIRECTANGULAR'"
      class="panorama-360-container"
      ref="panorama360Ref"
    >
      <div :id="pannellumElementId" style="width: 100%; height: 100%;"></div>
    </div>

    <!-- Image container with zoom/pan (FLAT projection) -->
    <div
      v-else
      class="panorama-content"
      ref="contentRef"
      :style="contentStyle"
      @mousedown.prevent="onPanStart"
      @touchstart.prevent="onTouchStart"
    >
      <img
        v-if="currentImageUrl"
        :src="currentImageUrl"
        class="panorama-image"
        draggable="false"
        @load="onImageLoad"
        decoding="async"
      />
      <div v-if="showBeacons" class="panorama-beacons-layer">
        <PanoramaBeaconPin
          v-for="b in currentBeacons"
          :key="b.id"
          :beacon="b"
          :container-width="imgW"
          :container-height="imgH"
          @click="handleBeaconClick"
        />
      </div>
    </div>

    <!-- UI Overlay -->
    <div class="panorama-ui-overlay">
      <!-- Top left: back button + title -->
      <div class="panorama-top-left">
        <button
          v-if="navStack.length > 0"
          class="panorama-back-btn"
          @click="navigateBack"
        >
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          <span>{{ navStack[navStack.length - 1]?.label || 'Voltar' }}</span>
        </button>
        <div class="panorama-title-box">
          <span class="panorama-view-label">{{ currentTitle }}</span>
          <span v-if="!isNavigating && activeSnapshot" class="panorama-date-label">{{ activeSnapshot.label }}</span>
        </div>
      </div>

      <!-- Top right: buttons -->
      <div class="panorama-top-right">
        <button
          class="panorama-ui-btn"
          title="Alternar Tela Cheia"
          @click="toggleFullscreen"
        >
          <i class="bi bi-fullscreen" aria-hidden="true"></i>
          <span>{{ isFullscreen ? 'Sair' : 'Tela Cheia' }}</span>
        </button>
      </div>

      <!-- Bottom center: timeline (only for main panorama) -->
      <div v-if="!isNavigating && panorama.snapshots.length > 1" class="panorama-bottom-center">
        <PanoramaTimeline
          :snapshots="panorama.snapshots"
          :active-snapshot-id="activeSnapshot?.id"
          @select="activeSnapshot = $event"
        />
      </div>

      <!-- Bottom right: CTA when viewing a lot 360 -->
      <div v-if="isNavigating && currentNavEntry?.type === 'lot'" class="panorama-bottom-right">
        <button class="panorama-cta-btn" @click="handleLotCta">
          <i class="bi bi-info-circle-fill" aria-hidden="true"></i>
          Ver mais informações
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useHead } from '#imports'
import type { Panorama, PanoramaSnapshot, PanoramaBeacon } from '~/composables/panorama/types'
import PanoramaBeaconPin from './PanoramaBeaconPin.vue'
import PanoramaTimeline from './PanoramaTimeline.vue'

const props = withDefaults(defineProps<{
  panorama: Panorama
  editable?: boolean
  activeSnapshotId?: string | null
  showBeaconInfo?: boolean
  /** Override auto-rotate speed (degrees/sec). Default -2. Set 0 to disable. */
  autoRotate?: number
}>(), {
  editable: false,
  activeSnapshotId: null,
  showBeaconInfo: true,
  autoRotate: -2,
})

const emit = defineEmits<{
  beaconClick: [beacon: PanoramaBeacon]
  viewClick: [pos: { x: number; y: number }]
  navigateBeacon: [beacon: PanoramaBeacon]
  /** Emitted when user clicks CTA on a lot 360 view */
  lotCta: [lotId: string, lotCode: string | null]
}>()

// ── Navigation Stack (Street View style) ──────────────

interface NavEntry {
  sceneId: string
  label: string
  type: 'lot' | 'panorama'
  /** Linked lot ID (for CTA on lot 360 view) */
  lotId?: string
  lotCode?: string | null
}

const navStack = ref<NavEntry[]>([])
const isNavigating = computed(() => navStack.value.length > 0)
const currentNavEntry = computed(() =>
  navStack.value.length > 0 ? navStack.value[navStack.value.length - 1] : null
)
const currentSceneId = computed(() =>
  currentNavEntry.value?.sceneId ?? MAIN_SCENE_ID
)

const currentTitle = computed(() => {
  if (currentNavEntry.value) return currentNavEntry.value.label
  return props.panorama.title
})

// ── State ────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const panorama360Ref = ref<HTMLElement | null>(null)
let pviewer: any = null
let pviewerReady = ref(false)
let resizeObserver: ResizeObserver | null = null
let resizeRaf: number | null = null

const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const imgW = ref(1200)
const imgH = ref(800)
const showBeacons = ref(true)
const isFullscreen = ref(false)
const activeSnapshot = ref<PanoramaSnapshot | null>(null)

const MAIN_SCENE_ID = '__main__'
const pannellumElementId = computed(() => `pano-360-${props.panorama.id}`)

// Dynamic scene registry: maps sceneId → { url, title }
const sceneRegistry = ref<Record<string, { url: string; title: string; lotId?: string; lotCode?: string | null }>>({})

// ── Computed ─────────────────────────────────────────

const currentImageUrl = computed(() => {
  if (currentNavEntry.value) {
    return sceneRegistry.value[currentNavEntry.value.sceneId]?.url ?? ''
  }
  return activeSnapshotDisplayUrl.value
})

const effectiveProjection = computed(() => props.panorama.projection)

const currentBeacons = computed(() => {
  // When navigating, scenes manage their own hotspots via Pannellum
  return props.panorama.beacons
})

const contentStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  width: `${imgW.value}px`,
  height: `${imgH.value}px`,
}))

// ── URL helpers ──────────────────────────────────────

function buildPanoramaProxyUrl(url?: string | null) {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) return trimmed
  if (!/^https?:\/\//i.test(trimmed)) return trimmed
  return `/panorama-image?url=${encodeURIComponent(trimmed)}`
}

const activeSnapshotDisplayUrl = computed(() => {
  const imageUrl = activeSnapshot.value?.imageUrl || ''
  if (!imageUrl) return ''
  if (props.panorama.projection === 'EQUIRECTANGULAR') {
    return buildPanoramaProxyUrl(imageUrl)
  }
  return imageUrl
})

// ── Pannellum ───────────────────────────────────────

useHead({
  link: [{ rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css' }],
  script: [{ src: 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js' }]
})

function buildTourConfig(): any {
  const url = activeSnapshotDisplayUrl.value
  if (!url) return null

  const rect = containerRef.value?.getBoundingClientRect()
  const aspectRatio = rect?.height ? rect.width / rect.height : 16 / 9
  const hfov = aspectRatio < 1 ? 112 : aspectRatio < 1.4 ? 104 : 98
  const autoRotate = props.autoRotate

  // Pre-register navigable target scenes for loadScene
  const scenes: Record<string, any> = {}
  for (const b of props.panorama.beacons) {
    if (b.visible === false) continue

    // Lot 360 scenes
    if (b.linkType === 'LOT' && b.linkLot?.panoramaUrl) {
      const sceneId = `lot-${b.linkLotId}`
      const lotUrl = buildPanoramaProxyUrl(b.linkLot.panoramaUrl)
      const lotTitle = [b.linkLot.block ? `Qd. ${b.linkLot.block}` : '', b.linkLot.lotNumber ? `Lote ${b.linkLot.lotNumber}` : ''].filter(Boolean).join(' ') || b.title
      const lotCode = b.linkLot?.mapElement?.code ?? null
      sceneRegistry.value[sceneId] = { url: lotUrl, title: lotTitle, lotId: b.linkLotId!, lotCode }
      scenes[sceneId] = {
        type: 'equirectangular',
        panorama: lotUrl + (lotUrl.includes('?') ? '&' : '?') + 'nc=' + Date.now(),
        hfov: 100, minHfov: 50, maxHfov: 120,
        autoLoad: true, showControls: false, compass: false,
        autoRotate: 0,
        hotSpots: [],
      }
    }

    // Linked panorama scenes (recursively include their beacons as info hotspots)
    if (b.linkType === 'PANORAMA' && b.linkPanoramaId) {
      const pano = b.linkPanorama as any
      const snaps = pano?.snapshots
      const panoUrl = snaps?.length ? buildPanoramaProxyUrl(snaps[snaps.length - 1].imageUrl) : null
      if (!panoUrl) continue
      const sceneId = `pano-${b.linkPanoramaId}`
      const panoTitle = pano?.title || b.linkPanorama?.title || ''
      sceneRegistry.value[sceneId] = { url: panoUrl, title: panoTitle }
      scenes[sceneId] = {
        type: 'equirectangular',
        panorama: panoUrl + (panoUrl.includes('?') ? '&' : '?') + 'nc=' + Date.now(),
        hfov: 100, minHfov: 50, maxHfov: 120,
        autoLoad: true, showControls: false, compass: false,
        autoRotate: 0,
        hotSpots: (pano?.beacons || []).filter((bb: any) => bb.visible !== false).map((bb: any) => ({
          type: 'info',
          pitch: (bb.y - 0.5) * -180,
          yaw: (bb.x - 0.5) * 360,
          cssClass: `custom-hotspot beacon-style--${bb.style}`,
          createTooltipFunc: (d: HTMLElement) => createBeaconTooltip(d, bb),
        })),
      }
    }
  }

  // Return tour config with all scenes pre-registered
  return {
    default: {
      firstScene: MAIN_SCENE_ID,
      sceneFadeDuration: 200,
    },
    scenes: {
      [MAIN_SCENE_ID]: {
        type: 'equirectangular',
        panorama: url + (url.includes('?') ? '&' : '?') + 'nc=' + Date.now(),
        hfov,
        minHfov: 50,
        maxHfov: 120,
        autoLoad: true,
        showControls: false,
        compass: false,
        autoRotate,
        autoRotateInactivityDelay: autoRotate ? 3000 : 0,
        hotSpots: buildHotspots(props.panorama.beacons),
      },
      ...scenes,
    },
  }
}

function buildHotspots(beacons: PanoramaBeacon[]): any[] {
  // ALL beacons rendered as info hotspots with custom tooltips.
  // Navigable ones get click handlers for Street View navigation.
  return beacons
    .filter(b => b.visible !== false)
    .map(b => {
      const pitch = (b.y - 0.5) * -180
      const yaw = (b.x - 0.5) * 360

      return {
        type: 'info',
        pitch,
        yaw,
        cssClass: `custom-hotspot beacon-style--${b.style}` + (isBeaconNavigable(b) ? ' beacon--navigable' : ''),
        createTooltipFunc: (hotSpotDiv: HTMLElement) => createBeaconTooltip(hotSpotDiv, b),
        clickHandlerFunc: () => handleBeaconClick(b),
      }
    })
}

function isBeaconNavigable(b: PanoramaBeacon): boolean {
  if (props.editable) return false
  if (b.linkType === 'URL') return true // URL links handled in click
  if (b.linkType === 'LOT' && b.linkLot?.panoramaUrl) return true
  if (b.linkType === 'PANORAMA' && b.linkPanoramaId) return true
  return false
}

function createBeaconTooltip(div: HTMLElement, b: PanoramaBeacon) {
  div.classList.add('custom-hotspot')
  div.classList.add(`beacon-style--${b.style}`)

  const isNav = isBeaconNavigable(b)

  // Stem line
  const stem = document.createElement('div')
  stem.className = 'beacon-stem'
  if (isNav) stem.classList.add('beacon-stem--nav')

  // Label box
  const label = document.createElement('div')
  label.className = 'beacon-label'
  if (isNav) label.classList.add('beacon-label--nav')

  // Text
  const text = document.createElement('span')
  text.className = 'beacon-text'
  text.innerText = b.title
  label.appendChild(text)

  div.appendChild(stem)
  div.appendChild(label)
}

function getBeaconSceneId(beacon: PanoramaBeacon): string | null {
  if (beacon.linkType === 'LOT' && beacon.linkLot?.panoramaUrl) {
    return `lot-${beacon.linkLotId}`
  }
  if (beacon.linkType === 'PANORAMA' && beacon.linkPanoramaId) {
    return `pano-${beacon.linkPanoramaId}`
  }
  return null
}

function initPannellum() {
  if (typeof window === 'undefined' || !(window as any).pannellum) return

  const el = document.getElementById(pannellumElementId.value)
  if (!el) return

  if (pviewer) {
    try { pviewer.destroy() } catch {}
    pviewer = null
  }

  const config = buildTourConfig()
  if (!config) return

  pviewer = (window as any).pannellum.viewer(el, config)
  pviewerReady.value = true

  // Events
  pviewer.on('load', () => { pviewerReady.value = true })
  pviewer.on('scenechange', (sceneId: string) => {
    // Sync navStack with scene changes triggered by hotspot clicks
    if (sceneId === MAIN_SCENE_ID) {
      // Returning to main scene - might be from back button or programmatic
      return
    }
    // If scene change triggered externally, ensure nav stack reflects it
    const alreadyInStack = navStack.value.find(n => n.sceneId === sceneId)
    if (!alreadyInStack) {
      const reg = sceneRegistry.value[sceneId]
      if (reg) {
        navStack.value.push({
          sceneId,
          label: reg.title,
          type: sceneId.startsWith('lot-') ? 'lot' : 'panorama',
          lotId: sceneId.startsWith('lot-') ? sceneId.replace('lot-', '') : undefined,
          lotCode: null,
        })
      }
    }
  })

  // Editable mode: click to place beacon
  if (props.editable) {
    const viewerContainer = pviewer.getContainer()
    viewerContainer.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return
      const sx = e.clientX; const sy = e.clientY
      const onUp = (ue: MouseEvent) => {
        viewerContainer.removeEventListener('mouseup', onUp)
        if (Math.abs(ue.clientX - sx) < 10 && Math.abs(ue.clientY - sy) < 10) {
          const [pitch, yaw] = pviewer.mouseEventToCoords(ue)
          emit('viewClick', { x: (yaw / 360) + 0.5, y: (pitch / -180) + 0.5 })
        }
      }
      viewerContainer.addEventListener('mouseup', onUp)
    })
  }
}

function requestViewerResize() {
  if (!pviewer) return
  if (resizeRaf !== null) window.cancelAnimationFrame(resizeRaf)
  resizeRaf = window.requestAnimationFrame(() => {
    pviewer?.resize?.()
    resizeRaf = null
  })
}

// ── Navigation functions ─────────────────────────────

function navigateToScene(sceneId: string, label: string, type: 'lot' | 'panorama', lotId?: string, lotCode?: string | null) {
  if (!pviewer) return
  navStack.value.push({ sceneId, label, type, lotId, lotCode })
  pviewer.loadScene(sceneId)
}

function navigateBack() {
  if (!pviewer || navStack.value.length === 0) return
  navStack.value.pop()
  const prev = navStack.value[navStack.value.length - 1]
  const target = prev ? prev.sceneId : MAIN_SCENE_ID
  pviewer.loadScene(target)
}

function handleLotCta() {
  const entry = currentNavEntry.value
  if (!entry || entry.type !== 'lot') return

  // Find lot code — try nav entry, sceneRegistry, then search beacons
  let lotCode: string | null = entry.lotCode ?? sceneRegistry.value[entry.sceneId]?.lotCode ?? null

  if (!lotCode) {
    // Fallback: search beacons for this lot
    const beacon = props.panorama.beacons.find(
      b => b.linkType === 'LOT' && b.linkLotId === (entry.lotId || sceneRegistry.value[entry.sceneId]?.lotId)
    )
    lotCode = beacon?.linkLot?.mapElement?.code ?? null
  }

  emit('lotCta', entry.lotId ?? '', lotCode)
}

function handleBeaconClick(beacon: PanoramaBeacon) {
  const fresh = props.panorama.beacons.find(b => b.id === beacon.id) ?? beacon

  // In editable mode, just emit for parent to handle (editor opens modal)
  if (props.editable) {
    emit('beaconClick', fresh)
    return
  }

  // URL links open in new tab
  if (fresh.linkType === 'URL' && fresh.linkUrl) {
    window.open(fresh.linkUrl, '_blank', 'noopener')
    return
  }

  // LOT with 360 → navigate to lot scene (Street View style)
  if (fresh.linkType === 'LOT' && fresh.linkLot?.panoramaUrl) {
    const label = [
      fresh.linkLot.block ? `Qd. ${fresh.linkLot.block}` : '',
      fresh.linkLot.lotNumber ? `Lote ${fresh.linkLot.lotNumber}` : '',
    ].filter(Boolean).join(' ') || fresh.title
    const lotCode = fresh.linkLot?.mapElement?.code ?? null
    navigateToScene(`lot-${fresh.linkLotId}`, label, 'lot', fresh.linkLotId!, lotCode)
    return
  }

  // PANORAMA → navigate to other panorama scene
  if (fresh.linkType === 'PANORAMA' && fresh.linkPanoramaId) {
    const label = fresh.linkPanorama?.title || fresh.title
    navigateToScene(`pano-${fresh.linkPanoramaId}`, label, 'panorama')
    return
  }

  // Info-only beacon — emit for parent (e.g. show detail panel)
  emit('beaconClick', fresh)
}

// ── Fullscreen ──────────────────────────────────────

async function toggleFullscreen() {
  if (!containerRef.value) return
  if (!document.fullscreenElement) {
    try { await containerRef.value.requestFullscreen(); isFullscreen.value = true } catch {}
  } else {
    try { await document.exitFullscreen(); isFullscreen.value = false } catch {}
  }
}

// ── Flat image: zoom/pan ────────────────────────────

function clampScale(s: number) { return Math.min(Math.max(s, 0.3), 5) }
function onWheel(e: WheelEvent) {
  if (effectiveProjection.value === 'EQUIRECTANGULAR') return
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const rect = containerRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left; const my = e.clientY - rect.top
  const ratio = clampScale(scale.value + delta) / scale.value
  panX.value = mx - (mx - panX.value) * ratio
  panY.value = my - (my - panY.value) * ratio
  scale.value = clampScale(scale.value + delta)
}
function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  imgW.value = img.naturalWidth; imgH.value = img.naturalHeight
  resetView()
}
function resetView() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const fit = Math.min(rect.width / imgW.value, rect.height / imgH.value, 1)
  scale.value = fit
  panX.value = (rect.width - imgW.value * fit) / 2
  panY.value = (rect.height - imgH.value * fit) / 2
}
let isPanning = false, panStartX = 0, panStartY = 0, panOriginX = 0, panOriginY = 0, lastPinchDist = 0
function onPanStart(e: MouseEvent) { isPanning = true; panStartX = e.clientX; panStartY = e.clientY; panOriginX = panX.value; panOriginY = panY.value }
function onPanMove(e: MouseEvent) { if (!isPanning) return; panX.value = panOriginX + (e.clientX - panStartX); panY.value = panOriginY + (e.clientY - panStartY) }
function onPanEnd() { isPanning = false }
function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) { isPanning = true; panStartX = e.touches[0]!.clientX; panStartY = e.touches[0]!.clientY; panOriginX = panX.value; panOriginY = panY.value }
  else if (e.touches.length === 2) { lastPinchDist = pinchDist(e.touches) }
}
function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 1 && isPanning) { e.preventDefault(); panX.value = panOriginX + (e.touches[0]!.clientX - panStartX); panY.value = panOriginY + (e.touches[0]!.clientY - panStartY) }
  else if (e.touches.length === 2) { e.preventDefault(); const d = pinchDist(e.touches); scale.value = clampScale(scale.value + (d - lastPinchDist) * 0.005); lastPinchDist = d }
}
function onTouchEnd() { isPanning = false; lastPinchDist = 0 }
function pinchDist(t: TouchList) { return Math.sqrt((t[0]!.clientX - t[1]!.clientX) ** 2 + (t[0]!.clientY - t[1]!.clientY) ** 2) }

// ── Init ─────────────────────────────────────────────

watch(() => props.panorama.snapshots, (snaps) => {
  if (activeSnapshot.value && !snaps.find(s => s.id === activeSnapshot.value?.id)) activeSnapshot.value = null
  if (props.activeSnapshotId) { const f = snaps.find(s => s.id === props.activeSnapshotId); if (f) { activeSnapshot.value = f; return } }
  if (snaps.length && (!activeSnapshot.value || !snaps.find(s => s.id === activeSnapshot.value?.id))) activeSnapshot.value = snaps[snaps.length - 1] ?? null
}, { immediate: true, deep: true })

watch(() => props.activeSnapshotId, (newId) => {
  if (newId) { const f = props.panorama.snapshots.find(s => s.id === newId); if (f) activeSnapshot.value = f }
  else activeSnapshot.value = null
})

// Re-init when snapshot changes
watch([activeSnapshot, () => props.panorama.projection, () => props.panorama.beacons.length, () => props.editable], () => {
  if (props.panorama.projection === 'EQUIRECTANGULAR') {
    setTimeout(initPannellum, 300)
  }
})

onMounted(() => {
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup', onPanEnd)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  document.addEventListener('fullscreenchange', () => { isFullscreen.value = !!document.fullscreenElement; setTimeout(requestViewerResize, 100) })
  window.addEventListener('resize', requestViewerResize)
  window.addEventListener('orientationchange', requestViewerResize)

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => requestViewerResize())
    resizeObserver.observe(containerRef.value)
  }

  if (props.panorama.projection === 'EQUIRECTANGULAR') setTimeout(initPannellum, 800)
  resetView()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', onPanEnd)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  resizeObserver?.disconnect(); resizeObserver = null
  if (resizeRaf !== null) { window.cancelAnimationFrame(resizeRaf); resizeRaf = null }
  if (pviewer) { try { pviewer.destroy() } catch {} }
})

defineExpose({ navigateToScene, navigateBack, navStack })
</script>

<style>
/* ─── Beacon hotspots ────────────────────────────── */

.custom-hotspot {
  background: none !important;
  cursor: pointer;
  width: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  border: none !important;
}

/* Stem */
.custom-hotspot .beacon-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 36px;
  background: rgba(255,255,255,0.7);
}
.custom-hotspot .beacon-stem--nav {
  background: rgba(16, 185, 129, 0.6);
}

/* Label */
.custom-hotspot .beacon-label {
  position: absolute;
  bottom: 38px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
  box-shadow: 0 3px 10px rgba(0,0,0,0.35);
  background: rgba(30, 41, 59, 0.92);
  color: #e2e8f0;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
}
.custom-hotspot .beacon-label--nav {
  background: rgba(5, 46, 22, 0.9);
  border-color: rgba(16, 185, 129, 0.35);
  color: #d1fae5;
}

/* Style variants */
.beacon-style--default .beacon-label { background: rgba(30, 41, 59, 0.92); }
.beacon-style--highlight .beacon-label { background: rgba(120, 53, 15, 0.92); border-color: rgba(251, 191, 36, 0.35); color: #fef3c7; }
.beacon-style--subtle .beacon-label { background: rgba(255,255,255,0.7); color: #1e293b; border-color: rgba(255,255,255,0.4); }
.beacon-style--subtle .beacon-stem { background: rgba(255,255,255,0.5); }
</style>

<style scoped>
.panorama-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111;
  border-radius: var(--radius-lg, 12px);
  user-select: none;
}

.panorama-360-container {
  width: 100%; height: 100%;
  position: relative;
  background: #001;
}

.panorama-content { position: absolute; top: 0; left: 0; cursor: grab; will-change: transform; }
.panorama-content:active { cursor: grabbing; }
.panorama-image { display: block; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.panorama-beacons-layer { position: absolute; inset: 0; pointer-events: none; }

/* ─── UI Overlay ──────────────────────────────────── */

.panorama-ui-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 50; }
.panorama-ui-overlay > * { pointer-events: auto; }

.panorama-top-left { position: absolute; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 6px; }
.panorama-title-box { display: flex; flex-direction: column; gap: 2px; }
.panorama-view-label { font-size: 0.8rem; font-weight: 500; color: rgba(255,255,255,0.7); }
.panorama-date-label { font-size: 1rem; font-weight: 700; color: #fff; }
.panorama-top-right { position: absolute; top: 16px; right: 16px; display: flex; gap: 8px; }

.panorama-back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 999px;
  background: rgba(8, 19, 38, 0.88);
  color: #f8fafc;
  font-size: 0.78rem; font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: all 0.15s ease;
  width: fit-content;
}
.panorama-back-btn:hover { background: rgba(18, 39, 72, 0.95); border-color: rgba(255,255,255,0.5); }

.panorama-bottom-center { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); }
.panorama-bottom-right { position: absolute; bottom: 16px; right: 16px; }

.panorama-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.9);
  color: #fff;
  font-size: 0.82rem; font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
  transition: all 0.15s ease;
  backdrop-filter: blur(6px);
  animation: cta-enter 0.4s ease;
}
@keyframes cta-enter {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
.panorama-cta-btn:hover {
  background: rgba(16, 185, 129, 1);
  box-shadow: 0 8px 28px rgba(16, 185, 129, 0.5);
  transform: translateY(-1px);
}

.panorama-ui-btn {
  padding: 8px 18px;
  border: 1px solid rgba(255,255,255,0.32); border-radius: 8px;
  background: rgba(8, 19, 38, 0.9); color: #f8fafc;
  font-size: 0.82rem; font-weight: 700; cursor: pointer;
  backdrop-filter: blur(6px); transition: all 0.15s ease;
  white-space: nowrap;
  box-shadow: 0 6px 14px rgba(0,0,0,0.25);
  display: flex; gap: 8px; align-items: center;
}
.panorama-ui-btn:hover { background: rgba(18, 39, 72, 0.95); border-color: rgba(255,255,255,0.55); transform: translateY(-1px); }

@media (max-width: 768px) {
  .panorama-top-left { top: 12px; left: 12px; right: 92px; }
  .panorama-view-label { font-size: 0.72rem; }
  .panorama-date-label { font-size: 0.88rem; }
  .panorama-top-right { top: 12px; right: 12px; }
  .panorama-ui-btn { padding: 7px 10px; font-size: 0.72rem; border-radius: 10px; }
  .panorama-bottom-center { left: 12px; right: 12px; bottom: 12px; transform: none; display: flex; justify-content: center; }
  .panorama-back-btn { padding: 6px 10px; font-size: 0.72rem; }
}
</style>
