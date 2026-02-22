<template>
  <div class="pme">
    <!-- Toolbar -->
    <div class="pme__toolbar">
      <div class="pme__toolbar-left">
        <span class="pme__toolbar-title">🗺️ Planta Interativa</span>

        <div class="pme__mode-toggle">
          <button
            class="pme__mode-btn"
            :class="{ active: editorMode === 'view' }"
            @click="editorMode = 'view'"
          >👁 Visualizar</button>
          <button
            class="pme__mode-btn"
            :class="{ active: editorMode === 'add' }"
            @click="editorMode = 'add'"
            :disabled="!plantMap"
          >+ Adicionar</button>
          <button
            class="pme__mode-btn"
            :class="{ active: editorMode === 'move' }"
            @click="editorMode = 'move'"
            :disabled="!plantMap"
          >✥ Mover</button>
        </div>
      </div>

      <div class="pme__toolbar-right">
        <!-- Sun path toggle -->
        <label v-if="plantMap" class="pme__toggle-label">
          <input type="checkbox" :checked="localSunPath.enabled" @change="toggleSunPath" />
          ☀️ Trajetória solar
        </label>

        <!-- Upload image button -->
        <button class="pme__btn pme__btn--outline" @click="triggerImageUpload" :disabled="uploadingImage">
          {{ uploadingImage ? '⏳ Enviando...' : '🖼️ Trocar imagem' }}
        </button>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="handleImageUpload" />

        <!-- Save button -->
        <button
          v-if="plantMap"
          class="pme__btn pme__btn--primary"
          :disabled="saving"
          @click="saveAll"
        >
          {{ saving ? '⏳ Salvando...' : '💾 Salvar' }}
        </button>
      </div>
    </div>

    <!-- Sun path controls (shown when enabled) -->
    <div v-if="plantMap && localSunPath.enabled" class="pme__sun-controls">
      <label class="pme__sun-label">
        Ângulo (0°=L → 90°=S → 180°=O → 270°=N):
      </label>
      <input
        type="range"
        min="0"
        max="359"
        :value="localSunPath.angleDeg"
        @input="localSunPath.angleDeg = +($event.target as HTMLInputElement).value"
        style="width: 180px;"
      />
      <span class="pme__sun-value">{{ localSunPath.angleDeg }}°</span>
      <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
        <input type="checkbox" v-model="localSunPath.showLabels" />
        Mostrar N/S/E/O
      </label>
    </div>

    <!-- No image state -->
    <div v-if="!plantMap" class="pme__empty">
      <div class="pme__empty-card">
        <div style="font-size:48px; margin-bottom:12px;">🗺️</div>
        <h3>Nenhuma planta cadastrada</h3>
        <p>Faça upload de uma imagem da planta para começar a adicionar hotspots.</p>
        <button class="pme__btn pme__btn--primary" @click="triggerImageUpload" :disabled="uploadingImage">
          {{ uploadingImage ? '⏳ Enviando...' : '📤 Upload da planta' }}
        </button>
      </div>
    </div>

    <!-- Map area -->
    <div v-else class="pme__canvas-area">
      <!-- Left: canvas -->
      <div
        class="pme__canvas-wrap"
        ref="canvasWrapEl"
        :class="{ 'mode-add': editorMode === 'add', 'mode-move': editorMode === 'move' }"
        @click="handleCanvasClick"
        @wheel.prevent="onWheel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div
          ref="canvasContentEl"
          class="pme__canvas-content"
          :style="canvasContentStyle"
        >
          <!-- Image -->
          <img
            :src="plantMap.imageUrl"
            class="pme__canvas-image"
            alt="Planta"
            draggable="false"
            @load="onImageLoad"
          />

          <!-- SVG overlay -->
          <svg
            v-if="imgLoaded"
            class="pme__canvas-svg"
            :viewBox="`0 0 ${imgW} ${imgH}`"
            :width="imgW"
            :height="imgH"
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- Sun path -->
            <SunPathLine
              :enabled="localSunPath.enabled"
              :angle-deg="localSunPath.angleDeg"
              :show-labels="localSunPath.showLabels"
              :width="imgW"
              :height="imgH"
            />

            <!-- Hotspot pins -->
            <g
              v-for="hs in localHotspots"
              :key="hs.id"
              class="pme__hs-group"
            >
              <HotspotPin
                :hotspot="hs"
                :container-width="imgW"
                :container-height="imgH"
                :selected="selectedHotspotId === hs.id"
                :show-label="true"
                :pin-radius="Math.min(30, Math.max(8, 14 / canvasScale))"
                @click="selectHotspot(hs.id)"
              />

              <!-- Drag handle (invisible larger hit area in move mode) -->
              <circle
                v-if="editorMode === 'move'"
                :cx="hs.x * imgW"
                :cy="hs.y * imgH"
                :r="22 / canvasScale"
                fill="transparent"
                class="pme__drag-handle"
                @mousedown.stop="startDrag(hs.id, $event)"
                @touchstart.stop.prevent="startDragTouch(hs.id, $event)"
              />
            </g>
          </svg>
        </div>

        <!-- Toast hint -->
        <div v-if="editorMode === 'add'" class="pme__canvas-hint">
          Clique na planta para adicionar um hotspot
        </div>
        <div v-if="editorMode === 'move'" class="pme__canvas-hint">
          Arraste um hotspot para reposicioná-lo
        </div>
      </div>

      <!-- Right: hotspot list -->
      <div class="pme__sidebar">
        <div class="pme__sidebar-header">
          <span>Hotspots ({{ localHotspots.length }})</span>
          <button
            v-if="selectedHotspotId"
            class="pme__btn pme__btn--sm pme__btn--danger"
            @click="deleteSelectedHotspot"
          >Excluir</button>
        </div>

        <div v-if="!localHotspots.length" class="pme__sidebar-empty">
          Nenhum hotspot ainda.<br/>Use o modo "+ Adicionar".
        </div>

        <div class="pme__hs-list">
          <div
            v-for="hs in localHotspots"
            :key="hs.id"
            class="pme__hs-item"
            :class="{ selected: selectedHotspotId === hs.id }"
            @click="selectHotspot(hs.id)"
          >
            <span class="pme__hs-icon">{{ typeIcon(hs.type) }}</span>
            <div class="pme__hs-info">
              <span class="pme__hs-title">{{ hs.label || hs.title }}</span>
              <span class="pme__hs-type">{{ typeLabel(hs.type) }}</span>
            </div>
            <div class="pme__hs-actions">
              <button
                class="pme__hs-action-btn"
                @click.stop="duplicateHotspot(hs)"
                title="Duplicar"
              >👯</button>
              <button
                class="pme__hs-action-btn"
                @click.stop="editHotspot(hs)"
                title="Editar"
              >✏️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error / success banners -->
    <div v-if="errorMsg" class="pme__banner pme__banner--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="pme__banner pme__banner--success">{{ successMsg }}</div>

    <!-- Hotspot modal -->
    <HotspotModal
      v-model="showModal"
      :hotspot="editingHotspot"
      :initial-x="newHotspotPos.x"
      :initial-y="newHotspotPos.y"
      :saving="savingHotspot"
      :error="hotspotError"
      @save="handleHotspotSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { PlantMap, PlantHotspot, CreateHotspotPayload } from '~/composables/plantMap/types'
import { HOTSPOT_TYPE_ICONS, HOTSPOT_TYPE_LABELS } from '~/composables/plantMap/types'
import { usePlantMapApi } from '~/composables/plantMap/usePlantMapApi'
import HotspotPin from './HotspotPin.vue'
import SunPathLine from './SunPathLine.vue'
import HotspotModal from './HotspotModal.vue'

const props = defineProps<{
  projectId: string
  initialPlantMap?: PlantMap | null
}>()

const emit = defineEmits<{
  (e: 'updated', plantMap: PlantMap): void
}>()

const api = usePlantMapApi()

// ── State ─────────────────────────────────────────────────
const plantMap = ref<PlantMap | null>(props.initialPlantMap ?? null)
const localHotspots = ref<PlantHotspot[]>([...(props.initialPlantMap?.hotspots ?? [])])

const localSunPath = reactive({
  enabled: props.initialPlantMap?.sunPathEnabled ?? false,
  angleDeg: props.initialPlantMap?.sunPathAngleDeg ?? 0,
  showLabels: props.initialPlantMap?.sunPathLabelEnabled ?? true,
})

watch(
  () => props.initialPlantMap,
  (pm) => {
    // Only reset image load state if URL changed
    if (pm?.imageUrl !== plantMap.value?.imageUrl) {
      imgLoaded.value = false
    }
    
    plantMap.value = pm ?? null
    localHotspots.value = [...(pm?.hotspots ?? [])]
    localSunPath.enabled = pm?.sunPathEnabled ?? false
    localSunPath.angleDeg = pm?.sunPathAngleDeg ?? 0
    localSunPath.showLabels = pm?.sunPathLabelEnabled ?? true
  },
)

onMounted(() => {
  // Try to fit on mount if image might be cached
  if (imgLoaded.value) {
    fitImageToContainer()
  }
})

// ── UI state ──────────────────────────────────────────────
const editorMode = ref<'view' | 'add' | 'move'>('view')
const selectedHotspotId = ref<string | null>(null)
const saving = ref(false)
const uploadingImage = ref(false)
const savingHotspot = ref(false)
const hotspotError = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)
const showModal = ref(false)
const editingHotspot = ref<PlantHotspot | null>(null)
const newHotspotPos = reactive({ x: 0.5, y: 0.5 })
const fileInput = ref<HTMLInputElement | null>(null)

// ── Image / canvas ────────────────────────────────────────
const imgLoaded = ref(false)
const imgW = ref(1200)
const imgH = ref(800)
const canvasWrapEl = ref<HTMLElement | null>(null)
const canvasContentEl = ref<HTMLElement | null>(null)

// Zoom/pan state (manual, to avoid event conflicts with drag)
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const canvasScale = computed(() => scale.value)
const canvasContentStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
  transformOrigin: '0 0',
}))

let isPanning = false
let panStart = { x: 0, y: 0 }
let panOffsetStart = { x: 0, y: 0 }
let isDraggingHotspot = false
let draggingHotspotId: string | null = null

const onImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement
  imgW.value = img.naturalWidth || plantMap.value?.imageWidth || 1200
  imgH.value = img.naturalHeight || plantMap.value?.imageHeight || 800
  imgLoaded.value = true
  
  // Fit to container on load
  nextTick(() => {
    fitImageToContainer()
  })
}

const fitImageToContainer = () => {
  if (!canvasWrapEl.value || !imgW.value || !imgH.value) return
  
  const rect = canvasWrapEl.value.getBoundingClientRect()
  const cw = rect.width
  const ch = rect.height
  
  if (cw <= 0 || ch <= 0) return

  // Calculate scale to "cover" the container
  const scaleX = cw / imgW.value
  const scaleY = ch / imgH.value
  const newScale = Math.max(scaleX, scaleY)
  
  scale.value = newScale
  
  // Center it
  offset.value = {
    x: (cw - imgW.value * newScale) / 2,
    y: (ch - imgH.value * newScale) / 2
  }
}

// ── Constraints ───────────────────────────────────────────
const clampOffset = (newScale: number, newX: number, newY: number) => {
  if (!canvasWrapEl.value) return { x: newX, y: newY }
  const rect = canvasWrapEl.value.getBoundingClientRect()
  const cw = rect.width
  const ch = rect.height
  
  const contentW = imgW.value * newScale
  const contentH = imgH.value * newScale
  
  let x = newX
  let y = newY
  
  // If image is wider than container, don't let edges leave
  if (contentW > cw) {
    x = Math.min(0, Math.max(cw - contentW, x))
  } else {
    // Keep centered
    x = (cw - contentW) / 2
  }
  
  // If image is taller than container
  if (contentH > ch) {
    y = Math.min(0, Math.max(ch - contentH, y))
  } else {
    // Keep centered
    y = (ch - contentH) / 2
  }
  
  return { x, y }
}

// ── Wheel zoom ─────────────────────────────────────────────
const onWheel = (e: WheelEvent) => {
  if (editorMode.value !== 'view') return
  e.preventDefault()
  const rect = canvasWrapEl.value!.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top
  const delta = e.deltaY > 0 ? -0.15 : 0.15
  
  // Calculate minimum scale to keep image covering area
  const minS = Math.max(rect.width / imgW.value, rect.height / imgH.value)
  const newScale = Math.min(10, Math.max(minS * 0.8, scale.value + delta * scale.value))
  
  const ratio = newScale / scale.value
  const newX = ox - ratio * (ox - offset.value.x)
  const newY = oy - ratio * (oy - offset.value.y)
  
  const clamped = clampOffset(newScale, newX, newY)
  offset.value = clamped
  scale.value = newScale
}

// ── Mouse events ───────────────────────────────────────────
const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return
  if (editorMode.value === 'view') {
    isPanning = true
    panStart = { x: e.clientX, y: e.clientY }
    panOffsetStart = { ...offset.value }
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (isPanning) {
    const newX = panOffsetStart.x + e.clientX - panStart.x
    const newY = panOffsetStart.y + e.clientY - panStart.y
    offset.value = clampOffset(scale.value, newX, newY)
    return
  }
  if (isDraggingHotspot && draggingHotspotId) {
    updateHotspotPosByMouse(e.clientX, e.clientY)
  }
}

const onMouseUp = () => {
  if (isDraggingHotspot && draggingHotspotId) {
    commitHotspotPosition(draggingHotspotId)
  }
  isPanning = false
  isDraggingHotspot = false
  draggingHotspotId = null
}

// ── Touch events ────────────────────────────────────────────
let lastTouchDist = 0

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    lastTouchDist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    )
  } else if (e.touches.length === 1 && editorMode.value === 'view') {
    isPanning = true
    panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    panOffsetStart = { ...offset.value }
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    )
    const delta = (dist - lastTouchDist) / 200
    lastTouchDist = dist
    const rect = canvasWrapEl.value!.getBoundingClientRect()
    const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left
    const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
    const minS = Math.max(rect.width / imgW.value, rect.height / imgH.value)
    const newScale = Math.min(10, Math.max(minS * 0.8, scale.value + delta * scale.value))
    const ratio = newScale / scale.value
    const newX = cx - ratio * (cx - offset.value.x)
    const newY = cy - ratio * (cy - offset.value.y)
    offset.value = clampOffset(newScale, newX, newY)
    scale.value = newScale
  } else if (e.touches.length === 1 && isPanning) {
    const newX = panOffsetStart.x + e.touches[0].clientX - panStart.x
    const newY = panOffsetStart.y + e.touches[0].clientY - panStart.y
    offset.value = clampOffset(scale.value, newX, newY)
  }
}

const onTouchEnd = () => {
  isPanning = false
}

// ── Drag hotspot ────────────────────────────────────────────
const startDrag = (id: string, e: MouseEvent) => {
  if (editorMode.value !== 'move') return
  isDraggingHotspot = true
  draggingHotspotId = id
  selectedHotspotId.value = id
  e.preventDefault()
}

const startDragTouch = (id: string, e: TouchEvent) => {
  if (editorMode.value !== 'move') return
  isDraggingHotspot = true
  draggingHotspotId = id
  selectedHotspotId.value = id
}

const clientToNormalized = (clientX: number, clientY: number) => {
  const rect = canvasWrapEl.value!.getBoundingClientRect()
  const localX = (clientX - rect.left - offset.value.x) / (scale.value * imgW.value)
  const localY = (clientY - rect.top - offset.value.y) / (scale.value * imgH.value)
  return {
    x: Math.min(1, Math.max(0, localX)),
    y: Math.min(1, Math.max(0, localY)),
  }
}

const updateHotspotPosByMouse = (clientX: number, clientY: number) => {
  if (!draggingHotspotId) return
  const { x, y } = clientToNormalized(clientX, clientY)
  const idx = localHotspots.value.findIndex((h) => h.id === draggingHotspotId)
  if (idx !== -1) {
    localHotspots.value[idx] = { ...localHotspots.value[idx], x, y }
  }
}

const commitHotspotPosition = async (id: string) => {
  const hs = localHotspots.value.find((h) => h.id === id)
  if (!hs) return
  try {
    await api.updateHotspot(id, { x: hs.x, y: hs.y })
  } catch (e: any) {
    showError(e.message)
  }
}

// ── Canvas click (add mode) ─────────────────────────────────
const handleCanvasClick = (e: MouseEvent) => {
  if (editorMode.value !== 'add') return
  if (isDraggingHotspot) return
  const { x, y } = clientToNormalized(e.clientX, e.clientY)
  newHotspotPos.x = x
  newHotspotPos.y = y
  editingHotspot.value = null
  hotspotError.value = null
  showModal.value = true
}

// ── Hotspot selection ──────────────────────────────────────
const selectHotspot = (id: string) => {
  selectedHotspotId.value = selectedHotspotId.value === id ? null : id
}

const editHotspot = (hs: PlantHotspot) => {
  editingHotspot.value = hs
  hotspotError.value = null
  showModal.value = true
}

const duplicateHotspot = async (hs: PlantHotspot) => {
  if (!plantMap.value) return
  savingHotspot.value = true
  try {
    const payload: CreateHotspotPayload = {
      type: hs.type,
      title: `${hs.title} (cópia)`,
      description: hs.description || '',
      x: Math.min(0.99, hs.x + 0.02),
      y: Math.min(0.99, hs.y + 0.02),
      label: hs.label ? `${hs.label} (cópia)` : '',
      labelEnabled: hs.labelEnabled,
      labelOffsetX: hs.labelOffsetX,
      labelOffsetY: hs.labelOffsetY,
      loteStatus: hs.loteStatus || 'AVAILABLE',
      metaJson: hs.metaJson || {},
    }
    const created = await api.createHotspot(plantMap.value.id, payload)
    localHotspots.value.push(created)
    showSuccess('Hotspot duplicado!')
  } catch (e: any) {
    showError(e.message ?? 'Erro ao duplicar hotspot.')
  } finally {
    savingHotspot.value = false
  }
}

// ── Hotspot CRUD ───────────────────────────────────────────
const handleHotspotSave = async (payload: CreateHotspotPayload) => {
  if (!plantMap.value) return
  savingHotspot.value = true
  hotspotError.value = null
  try {
    if (editingHotspot.value) {
      // Update existing
      const updated = await api.updateHotspot(editingHotspot.value.id, payload)
      const idx = localHotspots.value.findIndex((h) => h.id === editingHotspot.value!.id)
      if (idx !== -1) localHotspots.value[idx] = updated
      showSuccess('Hotspot atualizado!')
    } else {
      // Create new
      const created = await api.createHotspot(plantMap.value.id, payload)
      localHotspots.value.push(created)
      showSuccess('Hotspot criado!')
    }
    showModal.value = false
    editorMode.value = 'view'
  } catch (e: any) {
    hotspotError.value = e.message ?? 'Erro ao salvar hotspot.'
  } finally {
    savingHotspot.value = false
  }
}

const deleteSelectedHotspot = async () => {
  if (!selectedHotspotId.value) return
  if (!confirm('Excluir este hotspot?')) return
  try {
    await api.deleteHotspot(selectedHotspotId.value)
    localHotspots.value = localHotspots.value.filter(
      (h) => h.id !== selectedHotspotId.value,
    )
    selectedHotspotId.value = null
    showSuccess('Hotspot excluído.')
  } catch (e: any) {
    showError(e.message)
  }
}

// ── Save all (sun path + plant map) ────────────────────────
const saveAll = async () => {
  if (!plantMap.value) return
  saving.value = true
  try {
    const updated = await api.updatePlantMap(plantMap.value.id, {
      sunPathEnabled: localSunPath.enabled,
      sunPathAngleDeg: localSunPath.angleDeg,
      sunPathLabelEnabled: localSunPath.showLabels,
    })
    plantMap.value = { ...updated, hotspots: localHotspots.value }
    emit('updated', plantMap.value)
    showSuccess('Configurações salvas!')
  } catch (e: any) {
    showError(e.message)
  } finally {
    saving.value = false
  }
}

// ── Sun path toggle ────────────────────────────────────────
const toggleSunPath = () => {
  localSunPath.enabled = !localSunPath.enabled
}

// ── Image upload ───────────────────────────────────────────
const triggerImageUpload = () => fileInput.value?.click()

const handleImageUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const { imageUrl } = await api.uploadPlantImage(props.projectId, file)
    if (plantMap.value) {
      // Update existing plant map
      const updated = await api.updatePlantMap(plantMap.value.id, { imageUrl })
      plantMap.value = { ...updated, hotspots: localHotspots.value }
    } else {
      // Create new plant map
      const created = await api.createPlantMap(props.projectId, { imageUrl })
      plantMap.value = created
      localHotspots.value = []
    }
    imgLoaded.value = false // force re-load
    emit('updated', plantMap.value!)
    showSuccess('Imagem atualizada!')
  } catch (e: any) {
    showError(e.message ?? 'Erro no upload.')
  } finally {
    uploadingImage.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

// ── Utils ──────────────────────────────────────────────────
const typeIcon = (type: PlantHotspot['type']) => HOTSPOT_TYPE_ICONS[type]
const typeLabel = (type: PlantHotspot['type']) => HOTSPOT_TYPE_LABELS[type]

const showSuccess = (msg: string) => {
  successMsg.value = msg
  errorMsg.value = null
  setTimeout(() => (successMsg.value = null), 3000)
}

const showError = (msg: string) => {
  errorMsg.value = msg
  setTimeout(() => (errorMsg.value = null), 5000)
}
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────── */
.pme {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f172a;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  min-height: 500px;
  color: #e2e8f0;
}

/* ── Toolbar ───────────────────────────────────────────── */
.pme__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}
.pme__toolbar-left,
.pme__toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pme__toolbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

.pme__mode-toggle {
  display: flex;
  background: #0f172a;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.pme__mode-btn {
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.pme__mode-btn:hover:not(:disabled) { color: #e2e8f0; background: #1e293b; }
.pme__mode-btn.active { background: #3b82f6; color: white; }
.pme__mode-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.pme__toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #94a3b8;
}
.pme__toggle-label input { cursor: pointer; }

/* ── Sun path controls ─────────────────────────────────── */
.pme__sun-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #1e2a3a;
  border-bottom: 1px solid #334155;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.pme__sun-label {
  font-size: 12px;
  color: #94a3b8;
}
.pme__sun-value {
  font-size: 13px;
  font-weight: 700;
  color: #fbbf24;
  min-width: 36px;
}

/* ── Empty state ───────────────────────────────────────── */
.pme__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.pme__empty-card {
  text-align: center;
  background: #1e293b;
  border-radius: 16px;
  padding: 40px;
  max-width: 360px;
}
.pme__empty-card h3 { margin: 0 0 8px; font-size: 18px; color: #f1f5f9; }
.pme__empty-card p { font-size: 14px; color: #64748b; margin: 0 0 20px; }

/* ── Canvas area ───────────────────────────────────────── */
.pme__canvas-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.pme__canvas-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0f172a;
}
.pme__canvas-wrap.mode-add { cursor: crosshair; }
.pme__canvas-wrap.mode-move { cursor: default; }

.pme__canvas-content {
  position: relative;
  display: inline-block;
  transform-origin: 0 0;
  will-change: transform;
}
.pme__canvas-image {
  display: block;
  max-width: none;
  -webkit-user-drag: none;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: high-quality;
  transform: translateZ(0); /* Force GPU acceleration */
}
.pme__canvas-svg {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: all;
}

.pme__drag-handle { cursor: grab; }
.pme__drag-handle:active { cursor: grabbing; }

.pme__canvas-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  color: #fbbf24;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  white-space: nowrap;
}

/* ── Sidebar ────────────────────────────────────────────── */
.pme__sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1e293b;
  border-left: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pme__sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
}
.pme__sidebar-empty {
  padding: 20px 12px;
  font-size: 12px;
  color: #475569;
  text-align: center;
  line-height: 1.5;
}
.pme__hs-list { overflow-y: auto; flex: 1; }
.pme__hs-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #1e293b;
  transition: background 0.1s;
}
.pme__hs-item:hover { background: #0f172a; }
.pme__hs-item.selected { background: #172554; border-left: 3px solid #3b82f6; }
.pme__hs-icon { font-size: 18px; flex-shrink: 0; }
.pme__hs-info { flex: 1; min-width: 0; }
.pme__hs-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pme__hs-type { font-size: 11px; color: #64748b; }
.pme__hs-actions {
  display: flex;
  gap: 4px;
}
.pme__hs-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 6px;
  border-radius: 4px;
  opacity: 0.5;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pme__hs-action-btn:hover {
  opacity: 1;
  background: #334155;
}

/* ── Buttons ────────────────────────────────────────────── */
.pme__btn {
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  white-space: nowrap;
}
.pme__btn--primary { background: #2563eb; color: white; }
.pme__btn--primary:hover:not(:disabled) { background: #1d4ed8; }
.pme__btn--outline {
  background: transparent;
  color: #94a3b8;
  border: 1.5px solid #334155;
}
.pme__btn--outline:hover:not(:disabled) { border-color: #94a3b8; color: #e2e8f0; }
.pme__btn--danger { background: #ef4444; color: white; }
.pme__btn--danger:hover { background: #dc2626; }
.pme__btn--sm { padding: 4px 10px; font-size: 11px; }
.pme__btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Banners ────────────────────────────────────────────── */
.pme__banner {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  z-index: 100;
  pointer-events: none;
  white-space: nowrap;
  animation: fadeInBanner 0.2s ease;
}
.pme__banner--error { background: #fee2e2; color: #b91c1c; }
.pme__banner--success { background: #dcfce7; color: #166534; }
@keyframes fadeInBanner {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 640px) {
  .pme__sidebar { width: 160px; }
  .pme__toolbar { flex-direction: column; align-items: flex-start; }
}
</style>
