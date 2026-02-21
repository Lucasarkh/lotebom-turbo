<template>
  <div class="editor-root">
    <!-- Left: Toolbox -->
    <EditorToolbox
      :active-tool="store.activeTool"
      :road-width="store.roadWidth"
      :wall-width="store.wallWidth"
      :roundabout-radius="store.roundaboutRadius"
      :roundabout-ports="store.roundaboutPorts"
      :prefab-width="store.prefabWidth"
      :prefab-height="store.prefabHeight"
      :can-undo="store.canUndo"
      :can-redo="store.canRedo"
      :auto-frame="store.autoFrame"
      :auto-snap="store.autoSnap"
      :current-theme="store.themeName"
      :text-font-size="store.textFontSize"
      :text-color="store.textColor"
      :stats="store.stats"
      @select-tool="store.selectTool"
      @set-road-width="(w) => store.roadWidth = w"
      @set-wall-width="(w) => store.wallWidth = w"
      @set-roundabout-radius="(r) => store.roundaboutRadius = r"
      @set-roundabout-ports="(p) => store.roundaboutPorts = p"
      @set-prefab-width="(w) => store.prefabWidth = w"
      @set-prefab-height="(h) => store.prefabHeight = h"
      @set-auto-frame="(v) => store.autoFrame = v"
      @set-auto-snap="(v) => store.autoSnap = v"
      @undo="store.undo"
      @redo="store.redo"
      @delete-selected="store.deleteSelected"
      @set-theme="(t) => store.themeName = t"
      @set-text-font-size="(s: number) => store.textFontSize = s"
      @set-text-color="(c: string) => store.textColor = c"
      @clear-all="store.clearAll"
    />

    <!-- Center: SVG Viewport -->
    <div class="editor-center">
      <!-- Top bar -->
      <div class="editor-topbar">
        <NuxtLink to="/painel/projetos" class="back-link">← Projetos</NuxtLink>
        <span class="project-name">{{ projectName }}</span>
        <div class="topbar-actions">
          <span v-if="saveStatus === 'saving'" class="save-indicator saving">⏳ Salvando…</span>
          <span v-else-if="saveStatus === 'saved'" class="save-indicator saved">✅ Salvo</span>
          <span v-else-if="saveStatus === 'error'" class="save-indicator error">❌ Erro ao salvar</span>
          <button class="topbar-btn" @click="handleSave">
            💾 Salvar
          </button>
        </div>
      </div>

      <SvgViewport @show-lot-gen-modal="openLotGenModal" />
    </div>

    <!-- Right: Lot properties panel -->
    <LotPanel
      v-if="store.selectedLot"
      :lot="store.selectedLot"
      :pixels-per-meter="store.pixelsPerMeter"
      :active-vertex-index="store.activeLotVertexIndex"
      @update="onLotUpdate"
      @close="store.clearSelection"
      @delete-lot="onDeleteLot"
      @duplicate-lot="onDuplicateLot"
      @create-lot="onCreateLotInBlock"
      @remove-vertex="onRemoveLotVertex"
      @add-vertex="onAddLotVertex"
    />

    <BlockPanel
      v-if="store.selectedBlock || store.selectedBlocksCount > 1"
      :block="store.selectedBlock"
      :count="store.selectedBlocksCount"
      @close="store.clearSelection"
      @generate-lots="openLotGenModal"
    />

    <!-- Lot generation modal -->
    <LotGenModal
      v-if="showLotGenModal"
      :block-id="lotGenBlockId!"
      @generate="onGenerateLots"
      @close="showLotGenModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLoteamentoStore } from '~/composables/lotEditor/store'
import type { BlockId, LotId } from '~/composables/lotEditor/topology/types'
import EditorToolbox from '~/components/lotEditor/EditorToolbox.vue'
import SvgViewport from '~/components/lotEditor/SvgViewport.vue'
import LotPanel from '~/components/lotEditor/LotPanel.vue'
import BlockPanel from '~/components/lotEditor/BlockPanel.vue'
import LotGenModal from '~/components/lotEditor/LotGenModal.vue'

definePageMeta({ layout: 'editor' })

const route = useRoute()
const projectId = route.params.id as string
const store = useLoteamentoStore()

const projectName = ref('Projeto')
const showLotGenModal = ref(false)
const lotGenBlockId = ref<BlockId | null>(null)

// ─── Save state ──────────────────────────────────────────
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const lastSavedSnapshot = ref<string | null>(null)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(async () => {
    const current = store.exportData()
    if (current !== lastSavedSnapshot.value) {
      await handleSave()
    }
  }, 5000)
}

// Watch store data changes for auto-save
watch(
  () => store.exportData(),
  () => {
    if (saveStatus.value === 'saved') saveStatus.value = 'idle'
    scheduleAutoSave()
  },
  { deep: false },
)

// Handle keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement

  // Ignore if user is typing in an input / textarea / select
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  // Ignore if focus is inside any side panel (lot panel, block panel, modal, etc.)
  // This prevents Delete/Backspace from deleting a lot while editing its properties
  if (target.closest('[data-panel], .lot-panel, .block-panel, .modal, .modal-overlay')) return

  const key = e.key.toLowerCase()
  
  if (key === 'v') store.selectTool('select')
  if (key === 'r' && !e.ctrlKey) store.selectTool('road')
  if (key === 'm') store.selectTool('wall')
  if (key === 'c') store.selectTool('roundabout')
  if (key === 'p') store.selectTool('roundabout')
  if (key === 'b') store.selectTool('prefab_block')
  if (key === 't') store.selectTool('text')
  
  if (key === 'escape') {
    if (store.activeTool !== 'select') store.selectTool('select')
    else store.clearSelection()
  }
  
  if (key === 'delete' || key === 'backspace') {
    store.deleteSelected()
  }

  // Undo/Redo
  if (e.ctrlKey || e.metaKey) {
    if (key === 'z') {
      if (e.shiftKey) store.redo()
      else store.undo()
      e.preventDefault()
    }
    if (key === 'y') {
      store.redo()
      e.preventDefault()
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  try {
    const { useApi } = await import('~/composables/useApi')
    const { fetchApi } = useApi()
    const project = await fetchApi(`/projects/${projectId}`)
    if (project) {
      projectName.value = project.name || 'Projeto'
      // Load saved map data
      if (project.mapData) {
        const json = typeof project.mapData === 'string'
          ? project.mapData
          : JSON.stringify(project.mapData)
        store.importData(json)
        lastSavedSnapshot.value = store.exportData()
      }
    }
  } catch {}
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})

function openLotGenModal(blockId: BlockId) {
  lotGenBlockId.value = blockId
  showLotGenModal.value = true
}

function onGenerateLots(blockId: BlockId, options: any) {
  store.generateBlockLots(blockId, options)
  showLotGenModal.value = false
}

function onLotUpdate(lotId: LotId, field: string, value: any) {
  store.updateLot(lotId, { [field]: value })
}

function onRemoveLotVertex(index: number) {
  if (store.selectedLot) store.removeLotVertex(store.selectedLot.id, index)
}

function onAddLotVertex(afterIndex: number) {
  if (store.selectedLot) store.addLotVertex(store.selectedLot.id, afterIndex)
}

function onDeleteLot() {
  if (store.selectedLot) {
    store.removeLot(store.selectedLot.id)
    store.clearSelection()
  }
}

function onDuplicateLot() {
  if (store.selectedLot) {
    const newId = store.duplicateLot(store.selectedLot.id)
    if (newId) {
      store.select({ type: 'lot', id: newId })
    }
  }
}

function onCreateLotInBlock() {
  if (store.selectedLot) {
    const newId = store.addLotToBlock(store.selectedLot.blockId)
    if (newId) {
      store.select({ type: 'lot', id: newId })
    }
  }
}

async function handleSave() {
  try {
    saveStatus.value = 'saving'
    const dataString = store.exportData()
    const data = JSON.parse(dataString)
    
    const { useApi } = await import('~/composables/useApi')
    const { fetchApi } = useApi()
    
    // 1. Save canonical map data
    await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ mapData: data }),
    })

    // 2. Extract and sync map-elements
    const elements: any[] = []

    // Convert LOTS
    for (const [id, lot] of data.lots) {
      elements.push({
        id: `${projectId}:${id}`, // Prefix with projectId to ensure global uniqueness
        type: 'LOT',
        name: lot.label || `Lote ${id}`,
        code: lot.label || null,
        geometryType: 'POLYGON',
        geometryJson: lot.polygon,
        styleJson: { status: lot.status },
        metaJson: {
          area: lot.area,
          frontage: lot.frontage,
          price: lot.price,
          notes: lot.notes,
        },
      })
    }

    // Convert ROADS
    for (const [id, edge] of data.edges) {
      elements.push({
        id: `${projectId}:${id}`,
        type: 'ROAD',
        name: `Via ${id}`,
        code: null,
        geometryType: 'POLYLINE',
        geometryJson: edge.curve,
        styleJson: { width: edge.width, style: edge.style },
      })
    }

    // Convert ROUNDABOUTS
    for (const [id, rb] of data.roundabouts) {
      elements.push({
        id: `${projectId}:${id}`,
        type: 'ROUNDABOUT',
        name: `Rotatória ${id}`,
        code: null,
        geometryType: 'CIRCLE',
        geometryJson: { center: rb.center, radius: rb.radius },
      })
    }

    // Convert NATURAL
    for (const [id, ne] of data.naturalElements) {
      elements.push({
        id: `${projectId}:${id}`,
        type: ne.kind === 'lake' ? 'LAKE' : ne.kind === 'green_area' ? 'GREEN' : 'POLYGON',
        name: ne.label || `Área ${id}`,
        code: ne.label || null,
        geometryType: 'POLYGON',
        geometryJson: ne.polygon,
      })
    }

    // Convert LABELS
    for (const [id, lb] of data.textLabels) {
      elements.push({
        id: `${projectId}:${id}`,
        type: 'LABEL',
        name: lb.text,
        code: null,
        geometryType: 'RECT',
        geometryJson: { position: lb.position, text: lb.text, fontSize: lb.fontSize },
        styleJson: { color: lb.color, rotation: lb.rotation },
      })
    }

    await fetchApi(`/projects/${projectId}/map-elements/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ elements }),
    })

    // 3. Sync LotDetails (status, price, notes, measurements, etc.)
    const lotStatusMap: Record<string, string> = {
      available: 'AVAILABLE',
      reserved: 'RESERVED',
      sold: 'SOLD',
    }

    const calcContractArea = (lot: any): number | null => {
      const poly: Array<{x:number,y:number}> = lot.polygon ?? []
      if (poly.length < 2) return null
      const lengths = poly.map((p: any, i: number) => {
        const q = poly[(i + 1) % poly.length]!
        return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
      })
      const sm: Array<{meters: number | null}> = lot.sideMetrics ?? []
      const scales: number[] = []
      for (let i = 0; i < lengths.length; i++) {
        const m = sm[i]?.meters
        if (m != null && m > 0 && (lengths[i] ?? 0) > 0) {
          scales.push(m / lengths[i]!)
        }
      }
      if (scales.length === 0) return null
      const avgScale = scales.reduce((a: number, b: number) => a + b, 0) / scales.length
      // lot.area is in px²
      return (lot.area ?? 0) * avgScale * avgScale
    }

    const lotSyncPromises: Promise<any>[] = []
    for (const [id, lot] of data.lots) {
      const mapElementId = `${projectId}:${id}`
      const contractArea = calcContractArea(lot)
      const payload: Record<string, any> = {
        status: lotStatusMap[lot.status] ?? 'AVAILABLE',
        price: lot.price ?? undefined,
        frontage: lot.manualFrontage ?? undefined,
        depth: lot.manualBack ?? lot.manualDepth ?? undefined,
        sideLeft: lot.sideLeft ?? undefined,
        sideRight: lot.sideRight ?? undefined,
        sideMetricsJson: lot.sideMetrics ? lot.sideMetrics : undefined,
        notes: lot.notes || undefined,
        conditionsJson: lot.conditions
          ? lot.conditions.split('\n').map((s: string) => s.trim()).filter(Boolean)
          : undefined,
      }
      if (contractArea !== null) payload.areaM2 = contractArea
      lotSyncPromises.push(
        fetchApi(`/projects/${projectId}/lots/${mapElementId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }).catch(() => { /* silently ignore individual lot sync errors */ })
      )
    }
    await Promise.all(lotSyncPromises)

    saveStatus.value = 'saved'
    lastSavedSnapshot.value = dataString
  } catch (e) {
    console.error('Save failed:', e)
    saveStatus.value = 'error'
  }
}
</script>

<style scoped>
.editor-root {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

.editor-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.editor-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 42px;
  padding: 0 12px;
  background: white;
  border-bottom: 1px solid var(--gray-200, #e5e7eb);
  flex-shrink: 0;
}
.back-link {
  font-size: 0.78rem;
  color: var(--gray-500);
  text-decoration: none;
}
.back-link:hover { color: var(--primary, #2563eb); }
.project-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--gray-800, #1f2937);
  flex: 1;
}
.topbar-actions { display: flex; gap: 4px; }
.topbar-btn {
  padding: 5px 12px;
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--gray-600);
  transition: all 0.15s ease;
}
.topbar-btn:hover {
  background: var(--gray-50, #f9fafb);
  border-color: var(--gray-300);
}
.save-indicator {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.save-indicator.saving { color: var(--gray-500); }
.save-indicator.saved { color: #16a34a; }
.save-indicator.error { color: #dc2626; }
</style>
