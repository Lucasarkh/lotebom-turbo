<template>
  <div class="editor-layout" @keydown="onKeyDown" tabindex="0" ref="rootRef">
    <!-- Top bar -->
    <div class="editor-topbar">
      <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm">&larr; Voltar ao projeto</NuxtLink>
      <span class="topbar-title">Editor de Mapa</span>
      <div class="topbar-right">
        <span v-if="editor.dirty.value" class="badge badge-warning">Alterações não salvas</span>
        <button class="btn btn-primary btn-sm" @click="save" :disabled="editor.saving.value || !editor.dirty.value">
          {{ editor.saving.value ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>

    <div v-if="editor.loading.value" class="loading-state" style="height:calc(100vh - 50px)"><div class="loading-spinner"></div></div>

    <div v-else-if="loadError" class="error-state" style="height:calc(100vh - 50px)">
      <p>{{ loadError }}</p>
      <button class="btn btn-primary" style="margin-top: var(--space-4);" @click="retryLoad">Tentar novamente</button>
    </div>

    <div v-else class="editor-body">
      <!-- Left: Toolbox + context panel -->
      <div class="editor-sidebar-left">
        <MapToolbox
          :smartTool="editor.smartTool.value"
          :editorStep="editor.editorStep.value"
          :isDrawing="editor.isDrawing.value"
          :dirty="editor.dirty.value"
          :saving="editor.saving.value"
          :canUndo="canUndo"
          :canRedo="canRedo"
          :drawingHint="editor.drawingHint.value"
          :mapBaseImageUrl="editor.mapBaseImageUrl.value"
          :uploadingImage="uploadingImage"
          :stats="editor.stats.value"
          :lotCount="editor.lotElements.value.length"
          @setSmartTool="onSetSmartTool"
          @setStep="editor.editorStep.value = $event"
          @save="save"
          @undo="editor.undo()"
          @redo="editor.redo()"
          @cancelDrawing="editor.cancelDrawing()"
          @uploadImage="onUploadImage"
          @removeImage="onRemoveImage"
          @autoName="onAutoName"
        />
        <!-- Layers (draw step) or Batch lots (data step) -->
        <MapLayersPanel
          v-if="editor.editorStep.value !== 'data'"
          :elements="editor.elements.value"
          :selectedId="editor.selectedId.value"
          @select="editor.selectedId.value = $event"
          @delete="editor.removeElement($event)"
        />
        <MapBatchLotsPanel
          v-else
          :lots="editor.lotElements.value"
          :selectedId="editor.selectedId.value"
          @select="editor.selectedId.value = $event"
          @update="onBatchLotUpdate"
          @delete="editor.removeElement($event)"
          @focusElement="focusOnElement($event)"
        />
      </div>

      <!-- Center: Canvas -->
      <div class="editor-canvas">
        <ClientOnly>
          <MapCanvas
            :elements="editor.elements.value"
            :selectedId="editor.selectedId.value"
            :activeTool="editor.activeTool.value"
            :stageScale="editor.stageScale.value"
            :stagePos="editor.stagePos.value"
            :isDrawing="editor.isDrawing.value"
            :drawingPoints="editor.drawingPoints.value"
            :mapBaseImageUrl="editor.mapBaseImageUrl.value"
            @select="onSelect"
            @elementDrag="onElementDrag"
            @elementTransform="onElementTransform"
            @stageClick="onStageClick"
            @stageDblClick="onStageDblClick"
            @updateScale="editor.stageScale.value = $event"
            @updatePos="editor.stagePos.value = $event"
            @zoomIn="editor.zoomIn()"
            @zoomOut="editor.zoomOut()"
            @resetView="editor.resetView()"
          />
        </ClientOnly>
      </div>

      <!-- Right: Properties -->
      <MapPropertiesPanel
        :element="editor.selected.value"
        @update="onPropertyUpdate"
        @duplicate="duplicateSelected"
        @delete="deleteSelected"
      />
    </div>

    <!-- Lot Grid Modal -->
    <MapLotGridModal
      v-if="editor.showLotGrid.value"
      :config="editor.lotGridConfig.value"
      @create="onCreateLotGrid"
      @close="editor.showLotGrid.value = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapEditor } from '~/composables/map/useMapEditor'
import { SMART_TOOLS } from '~/composables/map/types'

definePageMeta({ layout: 'editor' })

const route = useRoute()
const projectId = route.params.id

const editor = useMapEditor(projectId)
const rootRef = ref(null)
const saveError = ref('')
const loadError = ref('')
const uploadingImage = ref(false)
const { success: toastSuccess, fromError: toastFromError } = useToast()
const { uploadApi } = useApi()

const canUndo = computed(() => editor.history?.value?.length > 0 && editor.historyIndex?.value > 0)
const canRedo = computed(() => editor.history?.value?.length > 0 && editor.historyIndex?.value < editor.history.value.length - 1)

/* ── Init ───────────────────────────────── */
onMounted(async () => {
  try {
    await editor.loadElements()
  } catch (e) {
    loadError.value = 'Não foi possível carregar o editor. Verifique sua conexão.'
  }
  rootRef.value?.focus()
})

async function retryLoad() {
  loadError.value = ''
  try {
    await editor.loadElements()
  } catch (e) {
    loadError.value = 'Não foi possível carregar o editor. Verifique sua conexão.'
  }
}

/* ── Smart Tool handling ────────────────── */
function onSetSmartTool(tool) {
  editor.setSmartTool(tool)
}

/* ── Image upload / remove ──────────────── */
async function onUploadImage(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const project = await uploadApi(`/projects/${projectId}/map-image`, fd)
    editor.mapBaseImageUrl.value = project.mapBaseImageUrl ?? null
    toastSuccess('Imagem enviada com sucesso!')
    // Auto-advance to draw step
    editor.editorStep.value = 'draw'
  } catch (err) {
    toastFromError(err, 'Erro ao enviar imagem')
  }
  event.target.value = ''
  uploadingImage.value = false
}

async function onRemoveImage() {
  try {
    const { fetchApi } = useApi()
    await fetchApi(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ mapBaseImageUrl: null }),
    })
    editor.mapBaseImageUrl.value = null
    toastSuccess('Imagem removida')
  } catch (err) {
    toastFromError(err, 'Erro ao remover imagem')
  }
}

/* ── Lot grid creation ──────────────────── */
function onCreateLotGrid(config) {
  editor.generateLotGrid(config)
  editor.showLotGrid.value = false
  editor.setSmartTool('select')
  toastSuccess(`${config.rows * config.cols} lotes criados!`)
}

/* ── Auto name lots ─────────────────────── */
function onAutoName(prefix, startNum) {
  editor.autoNameLots(prefix, startNum)
  toastSuccess(`${editor.lotElements.value.length} lotes nomeados!`)
}

/* ── Batch lot update (from BatchLotsPanel) */
function onBatchLotUpdate(id, patch) {
  editor.updateElement(id, patch)
}

/* ── Focus on element (scroll + select) ─── */
function focusOnElement(id) {
  editor.selectedId.value = id
  // Switch to draw step to show element on canvas
  if (editor.editorStep.value === 'data') {
    // Keep on data step but element is selected
  }
}

/* ── Canvas events ──────────────────────── */
function onSelect(id) {
  editor.selectedId.value = id
}

function onElementDrag(id, geometryJson) {
  editor.updateElement(id, { geometryJson })
}

function onElementTransform(id, geometryJson) {
  editor.updateElement(id, { geometryJson })
}

function onStageClick(pos) {
  const tool = editor.activeTool.value
  const smart = editor.smartTool.value

  if (editor.isDrawing.value) {
    editor.addDrawingPoint(pos)
    return
  }

  // Start drawing for polygon/polyline tools (lot, green, lake, road, polygon)
  if (tool === 'polygon' || tool === 'polyline') {
    editor.startDrawing()
    editor.addDrawingPoint(pos)
    return
  }

  // Rect tool: create element at click position (lot-rect)
  if (tool === 'rect') {
    editor.addElement({
      type: editor.activeType.value,
      geometryType: 'RECT',
      geometryJson: { x: pos.x - 50, y: pos.y - 30, width: 100, height: 60 },
    })
    // Don't auto-switch away — let user keep placing lots
    return
  }

  // Circle tool: create at click position (roundabout)
  if (tool === 'circle') {
    editor.addElement({
      type: editor.activeType.value,
      geometryType: 'CIRCLE',
      geometryJson: { x: pos.x, y: pos.y, radius: 30 },
    })
    return
  }

  // Label tool: create at click position
  if (tool === 'label') {
    editor.addElement({
      type: 'LABEL',
      geometryType: 'RECT',
      geometryJson: { x: pos.x, y: pos.y, width: 100, height: 30 },
      name: 'Rótulo',
    })
    editor.setSmartTool('select')
    return
  }
}

function onStageDblClick(pos) {
  if (editor.isDrawing.value) {
    editor.finishDrawing()
    return
  }
}

/* ── Property edits ─────────────────────── */
function onPropertyUpdate(patch) {
  if (!editor.selectedId.value) return
  editor.updateElement(editor.selectedId.value, patch)
}

function duplicateSelected() {
  if (editor.selectedId.value) editor.duplicateElement(editor.selectedId.value)
}

function deleteSelected() {
  if (editor.selectedId.value) editor.removeElement(editor.selectedId.value)
}

/* ── Save ────────────────────────────────── */
async function save() {
  try {
    await editor.saveElements()
    saveError.value = ''
    toastSuccess('Mapa salvo com sucesso!')
  } catch (e) {
    saveError.value = e.message || 'Erro ao salvar'
    toastFromError(e, 'Erro ao salvar mapa')
  }
}

/* ── Keyboard shortcuts (Smart Tool aware) ─ */
function onKeyDown(e) {
  // Ignore if typing in an input
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

  const ctrl = e.ctrlKey || e.metaKey

  if (ctrl && e.key === 'z') { e.preventDefault(); editor.undo() }
  if (ctrl && e.key === 'y') { e.preventDefault(); editor.redo() }
  if (ctrl && e.key === 's') { e.preventDefault(); save() }

  if (e.key === 'Escape') {
    if (editor.isDrawing.value) editor.cancelDrawing()
    else if (editor.showLotGrid.value) editor.showLotGrid.value = false
    else editor.selectedId.value = null
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (editor.selectedId.value) editor.removeElement(editor.selectedId.value)
  }

  // Smart Tool shortcuts (match the SMART_TOOLS shortcut keys)
  const key = e.key.toUpperCase()
  const smartToolMatch = SMART_TOOLS.find(t => t.shortcut === key)
  if (smartToolMatch && !ctrl) {
    editor.setSmartTool(smartToolMatch.key)
    return
  }

  // Zoom
  if (e.key === '+' || e.key === '=') editor.zoomIn()
  if (e.key === '-') editor.zoomOut()
  if (e.key === '0') editor.resetView()

  // Duplicate
  if (ctrl && e.key === 'd') { e.preventDefault(); duplicateSelected() }
}

/* ── Warn on leave ───────────────────────── */
function beforeUnload(e) {
  if (editor.dirty.value) { e.preventDefault(); e.returnValue = '' }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<style scoped>
.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  outline: none;
}

.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 50px;
  background: white;
  border-bottom: 1px solid var(--gray-200);
  flex-shrink: 0;
}

.topbar-title {
  font-weight: 600;
  color: var(--gray-800);
  font-size: 0.9375rem;
}

.topbar-right {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-sidebar-left {
  display: flex;
  flex-direction: column;
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--gray-200);
  overflow: hidden;
  background: white;
}

.editor-canvas {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  background: var(--gray-50);
}
</style>
