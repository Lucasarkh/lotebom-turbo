<template>
  <div
    ref="containerRef"
    class="svg-viewport"
    :class="{ 'is-panning': isPanning || isSpacePressed }"
    :data-tool="store.activeTool"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
    @dblclick="onDblClick"
    @contextmenu.prevent="onContextMenu"
  >
    <svg
      ref="svgRef"
      :width="containerWidth"
      :height="containerHeight"
      :viewBox="`0 0 ${containerWidth} ${containerHeight}`"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Background -->
      <rect
        :width="containerWidth"
        :height="containerHeight"
        :fill="store.theme.bg"
      />

      <!-- Definitions (gradients, filters, patterns) -->
      <SvgDefs :theme="store.theme" />

      <!-- World-space group with pan/zoom transform -->
      <g :transform="worldTransform">
        <!-- Grid -->
        <rect
          x="-5000" y="-5000" width="10000" height="10000"
          fill="url(#gridPattern)"
          opacity="0.5"
        />

        <!-- Blocks (quadras) - Under roads -->
        <BlockLayer
          :blocks="store.blocks"
          :theme="store.theme"
          :selected-targets="store.selectedTargets"
          :active-tool="store.activeTool"
          @select-block="onSelectBlock"
          @start-drag-block="onStartDragBlock"
          @generate-lots="onGenerateLots"
        />

        <!-- Interactive Grid Handles for selected block -->
        <GridLayer
          v-if="store.selection?.type === 'block'"
          :block="store.blocks.get(store.selection.id)!"
          :pixels-per-meter="store.pixelsPerMeter"
          @drag-depth="onDragGridDepth"
        />

        <!-- Road surfaces - Over blocks -->
        <RoadLayer
          :edges="store.edges"
          :nodes="store.nodes"
          :theme="store.theme"
          :selected-targets="store.selectedTargets"
          :active-tool="store.activeTool"
          @select-edge="onSelectEdge"
          @start-drag-edge="onStartDragEdge"
        />

        <!-- Roundabouts -->
        <RoundaboutLayer
          :roundabouts="store.roundabouts"
          :theme="store.theme"
          :selected-targets="store.selectedTargets"
          :active-tool="store.activeTool"
          @select-roundabout="onSelectRoundabout"
          @start-drag-roundabout="onStartDragRoundabout"
        />

        <!-- Lots -->
        <LotLayer
          :lots="store.lots"
          :theme="store.theme"
          :selected-targets="store.selectedTargets"
          :pixels-per-meter="store.pixelsPerMeter"
          @select-lot="onSelectLot"
          @drag-lot-vertex="onDragLotVertex"
          @drag-lot="onDragLot"
        />

        <!-- Nodes (on top) -->
        <NodeLayer
          v-if="showNodes"
          :nodes="store.nodes"
          :theme="store.theme"
          :selected-targets="store.selectedTargets"
          :active-tool="store.activeTool"
          :snap-indicator="store.snapIndicator"
          @select-node="onSelectNode"
          @start-drag-node="onStartDragNode"
        />

        <!-- Natural Elements -->
        <NaturalLayer
          :elements="store.naturalElements"
          :drawing-points="store.naturalDrawPoints"
          :theme="store.theme"
          :selected-targets="store.selectedTargets"
          :active-tool="store.activeTool"
          @select-natural="onSelectNatural"
          @start-drag-natural="onStartDragNatural"
        />

        <!-- Text Labels -->
        <TextLabelLayer
          :labels="store.textLabels"
          :selected-targets="store.selectedTargets"
          :active-tool="store.activeTool"
          @select-text="onSelectText"
          @start-drag-text="onStartDragText"
          @edit-text="onEditText"
        />

        <!-- Bezier handles for selected edge -->
        <BezierHandles
          v-if="selectedEdge"
          :edge="selectedEdge"
          @drag-handle="onDragBezierHandle"
          @drag-end="onDragEnd"
        />

        <!-- Road drawing preview -->
        <RoadPreview
          :is-drawing="store.isDrawingRoad"
          :last-node="lastDrawNode"
          :cursor-pos="worldCursor"
          :road-width="store.activeTool === 'wall' ? store.wallWidth : store.roadWidth"
          :is-wall="store.activeTool === 'wall'"
        />

        <!-- Lot Draw Preview -->
        <g v-if="store.isDrawingLot && store.lotDrawPoints.length > 0 && worldCursor" class="pointer-events-none">
          <polyline 
            :points="store.lotDrawPoints.map((p: any) => `${p.x},${p.y}`).join(' ')" 
            stroke="#4ade80" 
            stroke-width="2" 
            fill="rgba(74, 222, 128, 0.2)" 
            stroke-dasharray="4"
          />
          <line 
            :x1="store.lotDrawPoints[store.lotDrawPoints.length - 1]?.x" 
            :y1="store.lotDrawPoints[store.lotDrawPoints.length - 1]?.y" 
            :x2="worldCursor.x" 
            :y2="worldCursor.y" 
            stroke="#4ade80" 
            stroke-width="1.5" 
            stroke-dasharray="4"
          />
          <!-- Closing line preview -->
          <line 
            :x1="worldCursor.x" 
            :y1="worldCursor.y" 
            :x2="store.lotDrawPoints[0]?.x" 
            :y2="store.lotDrawPoints[0]?.y" 
            stroke="#4ade80" 
            stroke-width="1" 
            stroke-dasharray="2"
            opacity="0.5"
          />
        </g>

        <!-- Prefab Block Preview -->
        <g v-if="store.activeTool === 'prefab_block' && worldCursor" class="pointer-events-none">
          <rect
            :x="worldCursor.x - (store.prefabWidth * store.pixelsPerMeter) / 2"
            :y="worldCursor.y - (store.prefabHeight * store.pixelsPerMeter) / 2"
            :width="store.prefabWidth * store.pixelsPerMeter"
            :height="store.prefabHeight * store.pixelsPerMeter"
            fill="none"
            stroke="#2563eb"
            stroke-width="2"
            stroke-dasharray="4 4"
            opacity="0.5"
          />
        </g>

        <!-- Selection marquee -->
        <rect
          v-if="selectionRect"
          :x="Math.min(selectionRect.a.x, selectionRect.b.x)"
          :y="Math.min(selectionRect.a.y, selectionRect.b.y)"
          :width="Math.abs(selectionRect.b.x - selectionRect.a.x)"
          :height="Math.abs(selectionRect.b.y - selectionRect.a.y)"
          fill="rgba(59, 130, 246, 0.08)"
          stroke="#3b82f6"
          :stroke-width="1.5 / store.viewZoom"
          stroke-dasharray="6 3"
          class="pointer-events-none"
        />

        <!-- Debug overlay (dev only) -->
        <DebugOverlay
          :show-debug="showDebugOverlay"
          :block="debugBlock"
          :lots="store.lots"
          :pixels-per-meter="store.pixelsPerMeter"
        />
      </g>

      <!-- HUD overlay (screen-space) -->
      <g class="hud">
        <!-- Zoom indicator -->
        <text
          :x="containerWidth - 16"
          :y="containerHeight - 16"
          text-anchor="end"
          fill="#94a3b8"
          font-size="11"
          font-family="monospace"
        >
          {{ (store.viewZoom * 100).toFixed(0) }}%
        </text>

        <!-- Tool indicator -->
        <text
          x="16"
          :y="containerHeight - 16"
          fill="#94a3b8"
          font-size="11"
        >
          {{ toolLabel }}
        </text>
      </g>
    </svg>

    <!-- Floating edge toolbar for toggling wall/road -->
    <div
      v-if="selectedEdge && store.activeTool === 'select'"
      class="edge-toolbar"
      :style="edgeToolbarStyle"
    >
      <button
        class="edge-toolbar-btn"
        :class="{ active: selectedEdge.style !== 'wall' }"
        @click.stop="store.setEdgeStyle(selectedEdge!.id, 'asphalt', store.roadWidth)"
        title="Rua"
      >
        ━ Rua
      </button>
      <button
        class="edge-toolbar-btn"
        :class="{ active: selectedEdge.style === 'wall' }"
        @click.stop="store.setEdgeStyle(selectedEdge!.id, 'wall', store.wallWidth)"
        title="Muro"
      >
        ▮ Muro
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLoteamentoStore } from '../../composables/lotEditor/store'
import type { NodeId, EdgeId, BlockId, LotId, RoundaboutId, NaturalElementId } from '../../composables/lotEditor/topology/types'
import type { Vec2 } from '../../composables/lotEditor/geometry/types'
import type { SelectionTarget } from '../../composables/lotEditor/store'
import { centroid } from '../../composables/lotEditor/geometry/polygon'

import SvgDefs from './SvgDefs.vue'
import RoadLayer from './RoadLayer.vue'
import NodeLayer from './NodeLayer.vue'
import BlockLayer from './BlockLayer.vue'
import LotLayer from './LotLayer.vue'
import RoundaboutLayer from './RoundaboutLayer.vue'
import NaturalLayer from './NaturalLayer.vue'
import TextLabelLayer from './TextLabelLayer.vue'
import GridLayer from './GridLayer.vue'
import BezierHandles from './BezierHandles.vue'
import RoadPreview from './RoadPreview.vue'
import DebugOverlay from './DebugOverlay.vue'

const store = useLoteamentoStore()

const emit = defineEmits<{
  showLotGenModal: [blockId: BlockId]
}>()

// ─── Debug overlay ───────────────────────────────────────
const showDebugOverlay = ref(false)
const debugBlock = computed(() => {
  // Show debug for selected block (if any)
  const sel = store.selection
  if (sel?.type === 'block') return store.blocks.get(sel.id) ?? null
  if (sel?.type === 'lot') {
    const lot = store.lots.get(sel.id)
    if (lot) return store.blocks.get(lot.blockId) ?? null
  }
  return null
})

// ─── Container sizing ────────────────────────────────────
const containerRef = ref<HTMLDivElement>()
const svgRef = ref<SVGSVGElement>()
const containerWidth = ref(800)
const containerHeight = ref(600)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        containerHeight.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(containerRef.value)
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space' || e.key === ' ') {
    isSpacePressed.value = true
  }

  // Toggle debug overlay with Ctrl+Shift+D
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
    e.preventDefault()
    showDebugOverlay.value = !showDebugOverlay.value
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    if (e.shiftKey) store.redo()
    else store.undo()
    return
  }

  // Ctrl+D: duplicate selected lot
  if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault()
    if (store.selection?.type === 'lot') {
      const newId = store.duplicateLot(store.selection.id)
      if (newId) store.select({ type: 'lot', id: newId })
    }
    return
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selection) {
      store.deleteSelected()
    }
  }

  if (e.key === 'Escape') {
    if (store.isDrawingRoad) store.finishRoadDraw()
    else if (store.isDrawingNatural) store.finishNaturalDraw()
    else if (store.isDrawingLot) store.finishLotDraw()
    else store.clearSelection()
  }

  if (e.key === 'Enter') {
    if (store.isDrawingRoad) store.finishRoadDraw()
    if (store.isDrawingNatural) store.finishNaturalDraw()
    if (store.isDrawingLot) store.finishLotDraw()
  }

  // Tool shortcuts
  const key = e.key.toLowerCase()
  if (key === 'v') store.selectTool('select')
  if (key === 'r') store.selectTool('road')
  if (key === 'c') store.selectTool('roundabout')
  if (key === 'p') store.selectTool('prefab_block')
  if (key === 'b') store.selectTool('natural_green')
  if (key === 'l') store.selectTool('lot_draw')
  if (key === 'm' || key === 'h') store.selectTool('pan')
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space' || e.key === ' ') {
    isSpacePressed.value = false
  }
}

// ─── Computed helpers ────────────────────────────────────
const worldTransform = computed(() => {
  const { x, y } = store.viewOffset
  const z = store.viewZoom
  return `translate(${x}, ${y}) scale(${z})`
})

const showNodes = computed(() =>
  store.activeTool === 'road' || store.activeTool === 'wall' || store.activeTool === 'select'
)

const selectedNodeId = computed(() =>
  store.selection?.type === 'node' ? store.selection.id : null
)

const selectedLotId = computed(() =>
  store.selection?.type === 'lot' ? store.selection.id : null
)

const selectedEdge = computed(() => {
  if (store.selection?.type === 'edge') {
    return store.edges.get(store.selection.id) ?? null
  }
  return null
})

const edgeToolbarStyle = computed(() => {
  if (!selectedEdge.value) return {}
  const edge = selectedEdge.value
  const fromNode = store.nodes.get(edge.from)
  const toNode = store.nodes.get(edge.to)
  if (!fromNode || !toNode) return {}
  const midWorld = {
    x: (fromNode.position.x + toNode.position.x) / 2,
    y: (fromNode.position.y + toNode.position.y) / 2,
  }
  const screen = store.worldToScreen(midWorld)
  return {
    left: `${screen.x}px`,
    top: `${screen.y - 40}px`,
    transform: 'translateX(-50%)',
  }
})

const lastDrawNode = computed(() => {
  if (!store.isDrawingRoad || store.roadDrawNodes.length === 0) return null
  const lastId = store.roadDrawNodes[store.roadDrawNodes.length - 1] as string | undefined
  if (!lastId) return null
  return store.nodes.get(lastId) ?? null
})

const worldCursor = ref<Vec2 | null>(null)

const toolLabel = computed(() => {
  const labels: Record<string, string> = {
    select: 'Selecionar',
    pan: 'Mover',
    road: store.isDrawingRoad ? 'Desenhando rua... (clique para pontos, Esc para terminar)' : 'Criar Rua (clique para iniciar)',
    wall: store.isDrawingRoad ? 'Desenhando muro... (clique para pontos, Esc para terminar)' : 'Criar Muro (clique para iniciar)',
    roundabout: 'Clique para posicionar rotatória',
    natural_lake: store.isDrawingNatural ? 'Desenhando lago... (Esc para terminar)' : 'Lago',
    natural_green: store.isDrawingNatural ? 'Desenhando... (Esc para terminar)' : 'Área Verde',
    natural_institutional: store.isDrawingNatural ? 'Desenhando... (Esc para terminar)' : 'Institucional',
    lot_draw: store.isDrawingLot ? 'Desenhando lote... (Enter/DblClick para terminar)' : 'Desenhar Lote',
    prefab_block: 'Clique no mapa para criar uma quadra pronta',
    text: 'Clique no mapa para inserir texto',
  }
  return labels[store.activeTool] ?? ''
})

// ─── Mouse interaction state ─────────────────────────────
const isPanning = ref(false)
const isSpacePressed = ref(false)
const panStart = ref<Vec2>({ x: 0, y: 0 })

const isDraggingSelection = ref(false)
const hasDraggedSelection = ref(false)
const lastDragWorldPos = ref<Vec2 | null>(null)

const isDraggingLotVertex = ref(false)
const dragLotId = ref<LotId | null>(null)
const dragLotVertexIndex = ref<number | null>(null)

const isDraggingLot = ref(false)
const dragLotLastPos = ref<Vec2 | null>(null)

const isDraggingGridLine = ref(false)
const dragGridIndex = ref<number | null>(null)
const dragGridStartPos = ref<Vec2>({ x: 0, y: 0 })

const selectionRect = ref<{ a: Vec2; b: Vec2 } | null>(null)

// ─── TOOL RESET ──────────────────────────────────────────
watch(() => store.activeTool, () => {
  isDraggingSelection.value = false
  hasDraggedSelection.value = false
  lastDragWorldPos.value = null
  isDraggingLotVertex.value = false
  dragLotId.value = null
  isDraggingLot.value = false
  dragLotLastPos.value = null
  isDraggingGridLine.value = false
  dragGridIndex.value = null
  selectionRect.value = null
  isPanning.value = false
})

function screenToWorld(e: MouseEvent): Vec2 {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  return store.screenToWorld({ x: sx, y: sy })
}

// ─── Mouse events ────────────────────────────────────────
function onWheel(e: WheelEvent) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  const center = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  const factor = e.deltaY > 0 ? 0.92 : 1.08
  store.zoom(factor, center)
}

function onMouseDown(e: MouseEvent) {
  // If clicking on UI button (Gerar Lotes), do absolutely nothing here
  if ((e.target as HTMLElement).closest('.gen-lots-btn')) return

  if (e.button === 1 || (e.button === 0 && (store.activeTool === 'pan' || isSpacePressed.value))) {
    // Middle click or pan tool or Space+LeftClick → start panning
    isPanning.value = true
    panStart.value = { x: e.clientX, y: e.clientY }
    return
  }

  if (e.button !== 0) return

  const worldPos = screenToWorld(e)

  switch (store.activeTool) {
    case 'road':
    case 'wall':
      if (store.isDrawingRoad) {
        store.continueRoadDraw(worldPos)
      } else {
        store.startRoadDraw(worldPos)
      }
      break

    case 'roundabout':
      store.addRoundabout(worldPos)
      // Done placing
      break

    case 'prefab_block':
      store.addPrefabBlock(worldPos, store.prefabWidth, store.prefabHeight)
      break

    case 'lot_draw':
      if (store.isDrawingLot) {
        store.addLotDrawPoint(worldPos)
      } else {
        store.startLotDraw()
        store.addLotDrawPoint(worldPos)
      }
      break

    case 'natural_lake':
    case 'natural_green':
    case 'natural_institutional':
      if (store.isDrawingNatural) {
        store.addNaturalPoint(worldPos)
      } else {
        const kind = store.activeTool.replace('natural_', '') as any
        store.startNaturalDraw(kind)
        store.addNaturalPoint(worldPos)
      }
      break

    case 'text': {
      const text = prompt('Digite o texto:')
      if (text && text.trim()) {
        const id = store.addTextLabel(worldPos, text.trim())
        store.select({ type: 'text', id })
      }
      break
    }

    case 'select':
      // Click on empty space → clear selection and start marquee
      if (!(e.target as HTMLElement).closest('.node-group, .lot-shape, .block-group, .road-path, .roundabout-circle, .natural-shape, .text-label-content, .gen-lots-btn, .vertex-handle')) {
        store.clearSelection()
        selectionRect.value = { a: worldPos, b: worldPos }
      }
      break
  }
}

function onMouseMove(e: MouseEvent) {
  const worldPos = screenToWorld(e)
  worldCursor.value = worldPos
  store.cursorPos = worldPos

  // Update snap indicator
  if ((store.activeTool === 'road' || store.activeTool === 'wall') && store.isDrawingRoad) {
    const lastId = store.roadDrawNodes[store.roadDrawNodes.length - 1] as string | undefined
    const snapResult = getSnapResult(worldPos, lastId)
    store.snapIndicator = snapResult ? snapResult.position : null
  } else {
    store.snapIndicator = null
  }

  if (isPanning.value) {
    const dx = e.clientX - panStart.value.x
    const dy = e.clientY - panStart.value.y
    panStart.value = { x: e.clientX, y: e.clientY }
    store.pan(dx, dy)
    return
  }

  if (selectionRect.value) {
    selectionRect.value.b = worldPos
    return
  }

  if (isDraggingSelection.value && lastDragWorldPos.value) {
    const delta = { x: worldPos.x - lastDragWorldPos.value.x, y: worldPos.y - lastDragWorldPos.value.y }
    if (delta.x !== 0 || delta.y !== 0) {
      hasDraggedSelection.value = true
      store.moveSelection(delta)
      lastDragWorldPos.value = worldPos
    }
    return
  }

  if (isDraggingLotVertex.value && dragLotId.value !== null && dragLotVertexIndex.value !== null) {
    store.moveLotVertex(dragLotId.value, dragLotVertexIndex.value, worldPos)
  }

  if (isDraggingLot.value && dragLotId.value !== null && dragLotLastPos.value !== null) {
    const delta = { x: worldPos.x - dragLotLastPos.value.x, y: worldPos.y - dragLotLastPos.value.y }
    if (delta.x !== 0 || delta.y !== 0) {
      store.moveLot(dragLotId.value, delta)
      dragLotLastPos.value = worldPos
    }
    return
  }

  if (isDraggingGridLine.value && dragGridIndex.value !== null && store.selectedBlock) {
    const dy = (e.clientY - dragGridStartPos.value.y) / store.viewZoom
    dragGridStartPos.value = { x: e.clientX, y: e.clientY }
    // Convert pixels to meters
    const deltaM = dy / store.pixelsPerMeter
    // Guard against race conditions if block is gone
    const block = store.blocks.get(store.selectedBlock.id)
    if (block && block.grid) {
      store.updateBlockGridDepth(block.id, dragGridIndex.value, deltaM)
    }
  }
}

function onMouseUp(e: MouseEvent) {
  if (isPanning.value) {
    isPanning.value = false
    return
  }

  if (selectionRect.value) {
    const rect = selectionRect.value
    const minX = Math.min(rect.a.x, rect.b.x)
    const maxX = Math.max(rect.a.x, rect.b.x)
    const minY = Math.min(rect.a.y, rect.b.y)
    const maxY = Math.max(rect.a.y, rect.b.y)

    // Selection logic (Nodes, Blocks, Edges)
    for (const node of store.nodes.values()) {
      if (node.position.x >= minX && node.position.x <= maxX && node.position.y >= minY && node.position.y <= maxY) {
        store.select({ type: 'node', id: node.id }, true, true)
      }
    }
    for (const block of store.blocks.values()) {
      const ct = centroid(block.polygon)
      if (ct.x >= minX && ct.x <= maxX && ct.y >= minY && ct.y <= maxY) {
        store.select({ type: 'block', id: block.id }, true, true)
      }
    }
    for (const edge of store.edges.values()) {
      const n1 = store.nodes.get(edge.from)
      const n2 = store.nodes.get(edge.to)
      if (n1 && n2) {
        const mid = { x: (n1.position.x + n2.position.x) / 2, y: (n1.position.y + n2.position.y) / 2 }
        if (mid.x >= minX && mid.x <= maxX && mid.y >= minY && mid.y <= maxY) {
          store.select({ type: 'edge', id: edge.id }, true, true)
        }
      }
    }
    for (const rab of store.roundabouts.values()) {
      if (rab.center.x >= minX && rab.center.x <= maxX && rab.center.y >= minY && rab.center.y <= maxY) {
        store.select({ type: 'roundabout', id: rab.id }, true, true)
      }
    }
    for (const nat of store.naturalElements.values()) {
      const ct = centroid(nat.polygon)
      if (ct.x >= minX && ct.x <= maxX && ct.y >= minY && ct.y <= maxY) {
        store.select({ type: 'natural', id: nat.id }, true, true)
      }
    }
    for (const txt of store.textLabels.values()) {
      if (txt.position.x >= minX && txt.position.x <= maxX && txt.position.y >= minY && txt.position.y <= maxY) {
        store.select({ type: 'text', id: txt.id }, true, true)
      }
    }

    selectionRect.value = null
    return
  }

  if (isDraggingSelection.value) {
    isDraggingSelection.value = false
    lastDragWorldPos.value = null
    if (hasDraggedSelection.value) {
      store.redetectBlocks()
    }
    hasDraggedSelection.value = false
  }

  if (isDraggingLotVertex.value) {
    isDraggingLotVertex.value = false
    dragLotId.value = null
    dragLotVertexIndex.value = null
  }

  if (isDraggingLot.value) {
    isDraggingLot.value = false
    dragLotId.value = null
    dragLotLastPos.value = null
  }

  if (isDraggingGridLine.value) {
    isDraggingGridLine.value = false
    dragGridIndex.value = null
    store.redetectBlocks()
  }
}

function onMouseLeave() {
  isPanning.value = false
  worldCursor.value = null
}

function onDblClick(e: MouseEvent) {
  if (store.isDrawingRoad) {
    store.finishRoadDraw()
  }
  if (store.isDrawingNatural) {
    store.finishNaturalDraw()
  }
  if (store.isDrawingLot) {
    store.finishLotDraw()
  }
}

function onContextMenu(e: MouseEvent) {
  if (store.isDrawingRoad) {
    store.finishRoadDraw()
  }
  if (store.isDrawingNatural) {
    store.finishNaturalDraw()
  }
  if (store.isDrawingLot) {
    store.finishLotDraw()
  }
}

// ─── Snap helper (sync) ─────────────────────────────────
import { snap } from '../../composables/lotEditor/topology/snapping'

function getSnapResult(worldPos: Vec2, excludeNodeId?: string) {
  const state = {
    nodes: store.nodes,
    edges: store.edges,
    roundabouts: store.roundabouts,
    blocks: store.blocks,
    lots: store.lots,
    naturalElements: store.naturalElements,
  }
  const exclude = excludeNodeId ? new Set([excludeNodeId]) : new Set<string>()
  return snap(worldPos, state as any, store.snapRadius, exclude)
}

// ─── Child events ────────────────────────────────────────
function onStartDragSelection(target: SelectionTarget, event: MouseEvent) {
  if (store.activeTool !== 'select' || !target) return
  
  if (!store.isSelected(target.type, target.id) && !event.shiftKey) {
    store.select(target)
  } else if (event.shiftKey && !store.isSelected(target.type, target.id)) {
    store.select(target, true)
  }

  store.pushUndo()
  isDraggingSelection.value = true
  lastDragWorldPos.value = screenToWorld(event)
}

function onSelectNode(nodeId: NodeId, e?: MouseEvent) {
  store.select({ type: 'node', id: nodeId }, e?.shiftKey)
}

function onStartDragNode(nodeId: NodeId, event: MouseEvent) {
  onStartDragSelection({ type: 'node', id: nodeId }, event)
}

function onSelectEdge(edgeId: EdgeId, e?: MouseEvent) {
  store.select({ type: 'edge', id: edgeId }, e?.shiftKey)
}

function onStartDragEdge(edgeId: EdgeId, event: MouseEvent) {
  onStartDragSelection({ type: 'edge', id: edgeId }, event)
}

function onSelectBlock(blockId: BlockId, e?: MouseEvent) {
  store.select({ type: 'block', id: blockId }, e?.shiftKey)
}

function onStartDragBlock(blockId: BlockId, event: MouseEvent) {
  onStartDragSelection({ type: 'block', id: blockId }, event)
}

function onSelectLot(lotId: LotId, e?: MouseEvent) {
  store.select({ type: 'lot', id: lotId }, e?.shiftKey)
}

function onDragLotVertex(lotId: LotId, index: number) {
  isDraggingLotVertex.value = true
  dragLotId.value = lotId
  dragLotVertexIndex.value = index
}

function onDragLot(lotId: LotId, e: MouseEvent) {
  store.pushUndo()
  store.select({ type: 'lot', id: lotId })
  isDraggingLot.value = true
  dragLotId.value = lotId
  dragLotLastPos.value = screenToWorld(e)
}

function onDragGridDepth(index: number, startPos: Vec2) {
  isDraggingGridLine.value = true
  dragGridIndex.value = index
  dragGridStartPos.value = startPos
}

function onSelectRoundabout(rabId: RoundaboutId, e?: MouseEvent) {
  store.select({ type: 'roundabout', id: rabId }, e?.shiftKey)
}

function onStartDragRoundabout(rabId: RoundaboutId, event: MouseEvent) {
  onStartDragSelection({ type: 'roundabout', id: rabId }, event)
}

function onSelectNatural(natId: NaturalElementId, e?: MouseEvent) {
  store.select({ type: 'natural', id: natId }, e?.shiftKey)
}

function onStartDragNatural(natId: NaturalElementId, event: MouseEvent) {
  onStartDragSelection({ type: 'natural', id: natId }, event)
}

function onSelectText(textId: string, e?: MouseEvent) {
  store.select({ type: 'text', id: textId }, e?.shiftKey)
}

function onStartDragText(textId: string, event: MouseEvent) {
  onStartDragSelection({ type: 'text', id: textId }, event)
}

function onEditText(textId: string) {
  const label = store.textLabels.get(textId)
  if (!label) return
  const newText = prompt('Editar texto:', label.text)
  if (newText !== null && newText.trim() !== '') {
    store.updateTextLabel(textId, { text: newText.trim() })
  }
}

function onGenerateLots(blockId: BlockId) {
  emit('showLotGenModal', blockId)
}

function onDragBezierHandle(edgeId: EdgeId, handleIndex: 1 | 2, dx: number, dy: number) {
  const edge = store.edges.get(edgeId)
  if (!edge) return
  const z = store.viewZoom
  const handle = handleIndex === 1 ? edge.curve.cp1 : edge.curve.cp2
  store.setEdgeCurveHandle(edgeId, handleIndex, {
    x: handle.x + dx / z,
    y: handle.y + dy / z,
  })
}

function onDragEnd() {
  store.redetectBlocks()
}
</script>

<style scoped>
.svg-viewport {
  flex: 1;
  overflow: hidden;
  cursor: crosshair;
  background: #e8e0d4;
  position: relative;
}

.svg-viewport[data-tool="select"] { cursor: default; }
.svg-viewport[data-tool="pan"], .svg-viewport.is-panning { cursor: grab; }
.svg-viewport[data-tool="road"] { cursor: crosshair; }
.svg-viewport[data-tool="wall"] { cursor: crosshair; }
.svg-viewport[data-tool="roundabout"] { cursor: crosshair; }
.svg-viewport.is-panning:active { cursor: grabbing; }

.edge-toolbar {
  position: absolute;
  display: flex;
  gap: 2px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 10;
  pointer-events: auto;
}
.edge-toolbar-btn {
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
  transition: all 0.15s;
}
.edge-toolbar-btn:hover {
  background: #f3f4f6;
  color: #374151;
}
.edge-toolbar-btn.active {
  background: #dbeafe;
  color: #2563eb;
  border-color: #93c5fd;
  font-weight: 600;
}
</style>
