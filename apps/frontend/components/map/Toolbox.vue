<template>
  <aside class="toolbox">
    <!-- Mode buttons -->
    <div class="toolbox-modes">
      <button
        v-for="m in modes"
        :key="m.id"
        :class="['mode-btn', { active: editorMode === m.id }]"
        :title="m.tooltip"
        @click="$emit('setMode', m.id)"
      >
        <svg class="mode-svg" viewBox="0 0 20 20" fill="currentColor" v-html="m.svg" />
        <span class="mode-label">{{ m.label }}</span>
      </button>
    </div>

    <div class="toolbox-divider" />

    <!-- Rotation control -->
    <div v-if="editorMode === 'place'" class="rotation-bar">
      <button class="rotate-btn" @click="$emit('rotate')" title="Rotacionar (R)">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M15.312 11.424a5.5 5.5 0 01-9.379 2.341L4.22 15.478a.75.75 0 01-1.06-1.06l2.5-2.5a.75.75 0 011.06 0l2.5 2.5a.75.75 0 11-1.06 1.06l-1.075-1.074A4 4 0 0013.82 11.48l1.492-.057zM4.688 8.576a5.5 5.5 0 019.379-2.341l1.713-1.713a.75.75 0 011.06 1.06l-2.5 2.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 111.06-1.06l1.075 1.074A4 4 0 006.18 8.52l-1.492.057z"/></svg>
        Girar
      </button>
      <span class="rotation-value">{{ placementRotation }}°</span>
    </div>

    <!-- Tile palette -->
    <div class="tile-categories">
      <div v-for="cat in categories" :key="cat.id" class="tile-category">
        <button class="cat-header" @click="toggleCategory(cat.id)">
          <span class="cat-chevron" :class="{ open: expandedCats.has(cat.id) }">▸</span>
          <span class="cat-label">{{ cat.label }}</span>
        </button>
        <Transition name="fold">
          <div v-show="expandedCats.has(cat.id)" class="cat-tiles">
            <button
              v-for="tile in cat.tiles"
              :key="tile.id"
              :class="['tile-btn', { active: activeTileId === tile.id }]"
              :title="tile.description"
              @click="selectTile(tile.id)"
            >
              <TilePreview :tileId="tile.id" :size="32" />
              <span class="tile-name">{{ tile.name }}</span>
              <span class="tile-size">{{ tile.gridW }}×{{ tile.gridH }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <div class="toolbox-divider" />

    <!-- Quick actions -->
    <div class="quick-actions">
      <button class="action-btn" @click="$emit('undo')" title="Desfazer (Ctrl+Z)">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clip-rule="evenodd"/></svg>
        Desfazer
      </button>
      <button class="action-btn" @click="$emit('redo')" title="Refazer (Ctrl+Y)">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75H9.25a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.085l5.5-5.25a.75.75 0 000-1.085l-5.5-5.25a.75.75 0 00-1.06.025z" clip-rule="evenodd"/></svg>
        Refazer
      </button>
      <button class="action-btn save-btn" @click="$emit('save')" title="Salvar (Ctrl+S)">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z"/></svg>
        Salvar
      </button>
    </div>

    <!-- Hint -->
    <div class="toolbox-hint">
      <span v-if="editorMode === 'select'">Clique para selecionar. Arraste para mover. <kbd>Ctrl</kbd>+clique = multi-seleção. <kbd>Espaço</kbd> = mover mapa.</span>
      <span v-else-if="editorMode === 'place'">Clique no mapa para posicionar. <kbd>R</kbd> = girar. <kbd>Esc</kbd> = cancelar.</span>
      <span v-else-if="editorMode === 'pan'">Arraste para navegar. Roda do mouse = zoom.</span>
      <span v-else-if="editorMode === 'erase'">Clique em um elemento para removê-lo.</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TilePreview from './TilePreview.vue'
import type { EditorMode, TileCategory } from '../../composables/map/types'
import { TILE_CATALOG, TILE_CATEGORIES } from '../../composables/map/types'

defineProps<{
  editorMode: EditorMode
  activeTileId: string | null
  placementRotation: number
}>()

const emit = defineEmits<{
  setMode: [mode: EditorMode]
  selectTile: [tileId: string]
  rotate: []
  undo: []
  redo: []
  save: []
}>()

const modes: { id: EditorMode; label: string; tooltip: string; svg: string }[] = [
  { id: 'place', label: 'Colocar', tooltip: 'Colocar peça (B)', svg: '<path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"/><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z"/>' },
  { id: 'select', label: 'Selecionar', tooltip: 'Selecionar (V)', svg: '<path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10.75 5.66V14a.75.75 0 01-1.5 0V5.66L7.3 7.76a.75.75 0 11-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-5.25 9.25a.75.75 0 01.75.75v2.25c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V13a.75.75 0 011.5 0v2.25A1.75 1.75 0 0114.25 17H5.75A1.75 1.75 0 014 15.25V13a.75.75 0 01.75-.75z" clip-rule="evenodd"/>' },
  { id: 'pan', label: 'Mover', tooltip: 'Mover mapa (H / Espaço)', svg: '<path d="M8 2a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 2zm0 12a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 14zm6-6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0114 8zM2 8.75A.75.75 0 012.75 8h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 012 8.75zm12 0a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75z"/>' },
  { id: 'erase', label: 'Apagar', tooltip: 'Apagar (X)', svg: '<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022 1.005 11.27A2.75 2.75 0 007.769 20h4.462a2.75 2.75 0 002.75-2.78l1.005-11.27.148.023a.75.75 0 10.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM7.5 3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.19a40.516 40.516 0 00-5 0v-.19z" clip-rule="evenodd"/>' },
]

interface CategoryGroup {
  id: string
  label: string
  tiles: typeof TILE_CATALOG
}

const categories = computed<CategoryGroup[]>(() => {
  return TILE_CATEGORIES.map((c) => ({
    id: c.key,
    label: c.label,
    tiles: TILE_CATALOG.filter((t) => t.category === c.key),
  }))
})

const expandedCats = ref(new Set<string>(TILE_CATEGORIES.map((c) => c.key)))

function toggleCategory(id: string) {
  if (expandedCats.value.has(id)) expandedCats.value.delete(id)
  else expandedCats.value.add(id)
}

function selectTile(tileId: string) {
  emit('selectTile', tileId)
  emit('setMode', 'place')
}
</script>

<style scoped>
.toolbox {
  display: flex;
  flex-direction: column;
  width: 210px;
  min-width: 210px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  overflow-x: hidden;
  font-size: 0.78rem;
}

/* Modes */
.toolbox-modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 8px 8px 4px;
}
.mode-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 0.72rem;
  color: #374151;
  transition: all 0.12s;
}
.mode-btn:hover { background: #f9fafb; }
.mode-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
.mode-svg { width: 15px; height: 15px; flex-shrink: 0; }
.mode-label { white-space: nowrap; }

/* Rotation */
.rotation-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 8px; background: #eff6ff; border-radius: 6px; margin: 0 8px 4px;
}
.rotate-btn {
  display: flex; align-items: center; gap: 4px;
  border: none; background: transparent; cursor: pointer; font-size: 0.72rem;
  color: #3b82f6; padding: 3px 6px; border-radius: 4px;
}
.rotate-btn:hover { background: rgba(59,130,246,0.1); }
.rotation-value { font-size: 0.68rem; color: #6b7280; font-family: 'SF Mono', Monaco, monospace; }

.toolbox-divider { height: 1px; background: #e5e7eb; margin: 4px 8px; }

/* Categories */
.tile-categories { flex: 1; overflow-y: auto; }
.tile-category { margin-bottom: 1px; }
.cat-header {
  display: flex; align-items: center; gap: 5px; width: 100%;
  padding: 6px 10px; background: transparent; border: none; cursor: pointer;
  font-size: 0.72rem; font-weight: 600; color: #4b5563; text-align: left;
}
.cat-header:hover { background: #f9fafb; }
.cat-chevron { font-size: 0.6rem; color: #9ca3af; transition: transform 0.15s; }
.cat-chevron.open { transform: rotate(90deg); }
.cat-label { flex: 1; }

.cat-tiles { padding: 1px 6px 4px; }
.tile-btn {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 3px 5px; border: 1px solid transparent; background: transparent;
  border-radius: 5px; cursor: pointer; transition: all 0.1s; text-align: left;
}
.tile-btn:hover { background: #f9fafb; border-color: #e5e7eb; }
.tile-btn.active { background: #eff6ff; border-color: #3b82f6; }
.tile-name { flex: 1; font-size: 0.7rem; color: #374151; }
.tile-size { font-size: 0.6rem; color: #9ca3af; font-family: 'SF Mono', Monaco, monospace; }

/* Quick actions */
.quick-actions { padding: 6px 8px; display: flex; flex-direction: column; gap: 3px; }
.action-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  background: transparent; border: 1px solid #e5e7eb;
  border-radius: 6px; cursor: pointer; font-size: 0.72rem; color: #374151;
}
.action-btn:hover { background: #f9fafb; }
.save-btn { font-weight: 600; }
.save-btn:hover { background: #f0fdf4; border-color: #4ade80; }

/* Hint */
.toolbox-hint {
  padding: 8px 10px;
  font-size: 0.65rem;
  color: #9ca3af;
  line-height: 1.45;
  border-top: 1px solid #f3f4f6;
  margin-top: auto;
}
.toolbox-hint kbd {
  display: inline-block;
  padding: 0 4px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  font-size: 0.6rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: #6b7280;
}

/* Transitions */
.fold-enter-active, .fold-leave-active { transition: all 0.2s; overflow: hidden; }
.fold-enter-from, .fold-leave-to { max-height: 0; opacity: 0; }
.fold-enter-to, .fold-leave-from { max-height: 600px; opacity: 1; }
</style>
