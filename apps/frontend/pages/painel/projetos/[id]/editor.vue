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
      @update="onLotUpdate"
      @close="store.clearSelection"
      @delete-lot="onDeleteLot"
      @duplicate-lot="onDuplicateLot"
      @create-lot="onCreateLotInBlock"
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
  // Ignore if user is typing in an input
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return

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
    const data = store.exportData()
    const { useApi } = await import('~/composables/useApi')
    const { fetchApi } = useApi()
    await fetchApi(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ mapData: JSON.parse(data) }),
    })
    saveStatus.value = 'saved'
    lastSavedSnapshot.value = data
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
