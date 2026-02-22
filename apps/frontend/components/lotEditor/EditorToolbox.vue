<template>
  <div class="toolbox">
    <div class="toolbox-header">
      <span class="toolbox-title">Ferramentas</span>
    </div>

    <div class="toolbox-section">
      <div class="tool-group-label">Básico</div>
      <button
        v-for="tool in basicTools"
        :key="tool.id"
        class="tool-btn"
        :class="{ active: activeTool === tool.id }"
        :title="tool.label"
        @click="emit('selectTool', tool.id)"
      >
        <span class="tool-icon" v-html="tool.icon"></span>
        <span class="tool-label">{{ tool.label }}</span>
        <span v-if="tool.shortcut" class="tool-shortcut">{{ tool.shortcut }}</span>
      </button>
    </div>

    <div class="toolbox-section">
      <div class="tool-group-label">Construção</div>
      <button
        v-for="tool in buildTools"
        :key="tool.id"
        class="tool-btn"
        :class="{ active: activeTool === tool.id }"
        :title="tool.label"
        @click="emit('selectTool', tool.id)"
      >
        <span class="tool-icon" v-html="tool.icon"></span>
        <span class="tool-label">{{ tool.label }}</span>
        <span v-if="tool.shortcut" class="tool-shortcut">{{ tool.shortcut }}</span>
      </button>
    </div>

    <div class="toolbox-section">
      <div class="tool-group-label">Natureza</div>
      <button
        v-for="tool in natureTools"
        :key="tool.id"
        class="tool-btn"
        :class="{ active: activeTool === tool.id }"
        :title="tool.label"
        @click="emit('selectTool', tool.id)"
      >
        <span class="tool-icon" v-html="tool.icon"></span>
        <span class="tool-label">{{ tool.label }}</span>
        <span v-if="tool.shortcut" class="tool-shortcut">{{ tool.shortcut }}</span>
      </button>
    </div>

    <!-- Road width slider -->
    <div v-if="activeTool === 'road'" class="toolbox-section active-config">
      <div class="slider-row">
        <div class="slider-header">
           <label class="slider-label">Largura da Rua</label>
           <span class="slider-value">{{ (roadWidth / 10).toFixed(1) }}m</span>
        </div>
        <input
          type="range"
          :value="roadWidth"
          min="40"
          max="200"
          step="10"
          class="tool-slider"
          @input="emit('setRoadWidth', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <!-- Wall width slider -->
    <div v-if="activeTool === 'wall'" class="toolbox-section active-config">
      <div class="slider-row">
        <div class="slider-header">
           <label class="slider-label">Espessura do Muro</label>
           <span class="slider-value">{{ (wallWidth / 10).toFixed(1) }}m</span>
        </div>
        <input
          type="range"
          :value="wallWidth"
          min="2"
          max="20"
          step="1"
          class="tool-slider"
          @input="emit('setWallWidth', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="field-hint">Muros delimitam quadras como ruas</div>
    </div>

    <!-- Roundabout controls -->
    <div v-if="activeTool === 'roundabout'" class="toolbox-section active-config">
      <div class="slider-row">
        <div class="slider-header">
          <label class="slider-label">Raio</label>
          <span class="slider-value">{{ roundaboutRadius }}px</span>
        </div>
        <input
          type="range"
          :value="roundaboutRadius"
          min="30"
          max="120"
          step="5"
          class="tool-slider"
          @input="emit('setRoundaboutRadius', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="slider-row">
         <div class="slider-header">
           <label class="slider-label">Conexões</label>
           <span class="slider-value">{{ roundaboutPorts }}</span>
        </div>
        <input
          type="range"
          :value="roundaboutPorts"
          min="3"
          max="8"
          step="1"
          class="tool-slider"
          @input="emit('setRoundaboutPorts', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <!-- Prefab dimensions -->
    <div v-if="activeTool === 'prefab_block'" class="toolbox-section active-config">
      <div class="tool-group-label">Dimensões da Quadra</div>
      <div class="flex gap-2 mb-2">
        <div class="flex-1">
          <label class="text-[9px] uppercase font-bold text-gray-400 mb-1 block">Larg (m)</label>
          <input
            type="number"
            :value="prefabWidth"
            class="field-input text-xs w-full"
            @input="emit('setPrefabWidth', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="flex-1">
          <label class="text-[9px] uppercase font-bold text-gray-400 mb-1 block">Alt (m)</label>
          <input
            type="number"
            :value="prefabHeight"
            class="field-input text-xs w-full"
            @input="emit('setPrefabHeight', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </div>
      <div class="field-hint">Clique no mapa para criar</div>
    </div>

    <!-- Text tool controls -->
    <div v-if="activeTool === 'text'" class="toolbox-section active-config">
      <div class="slider-row">
        <div class="slider-header">
          <label class="slider-label">Tamanho do Texto</label>
          <span class="slider-value">{{ textFontSize }}px</span>
        </div>
        <input
          type="range"
          :value="textFontSize"
          min="8"
          max="72"
          step="2"
          class="tool-slider"
          @input="emit('setTextFontSize', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="color-row">
        <label class="slider-label">Cor</label>
        <input
          type="color"
          :value="textColor"
          class="color-picker-input"
          @input="emit('setTextColor', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="field-hint hint-margin">Clique para inserir. Dbl-click para editar.</div>
    </div>

    <div class="toolbox-divider"></div>

    <!-- Actions -->
    <div class="toolbox-section">
      <div class="tool-group-label">Ações</div>
      <button class="tool-btn" :disabled="!canUndo" @click="emit('undo')" title="Desfazer (Ctrl+Z)">
        <span class="tool-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></span>
        <span class="tool-label">Desfazer</span>
        <span class="tool-shortcut">^Z</span>
      </button>
      <button class="tool-btn" :disabled="!canRedo" @click="emit('redo')" title="Refazer (Ctrl+Y)">
        <span class="tool-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></span>
        <span class="tool-label">Refazer</span>
        <span class="tool-shortcut">^Y</span>
      </button>
      <button class="tool-btn danger" @click="emit('deleteSelected')" title="Excluir selecionado (Del)">
        <span class="tool-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span>
        <span class="tool-label">Excluir</span>
        <span class="tool-shortcut">⌫</span>
      </button>
    </div>

    <!-- Settings section -->
    <div class="toolbox-section">
      <div class="tool-group-label">Configurações</div>
      
      <div class="config-card">
        <label class="config-label">Escala (Pixels / Metro)</label>
        <div class="config-input-row">
          <input 
            type="number" 
            :value="pixelsPerMeter" 
            class="config-input"
            min="1" 
            max="1000"
            @input="emit('setPixelsPerMeter', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="config-unit">px/m</span>
        </div>
        <p class="field-hint">Ex: 10 ou 100. Define a precisão métrica do mapa.</p>
      </div>

      <div class="toggle-list">
        <label class="toggle-row">
          <div class="toggle-switch">
            <input type="checkbox" :checked="autoFrame" @change="emit('setAutoFrame', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-dot"></span>
          </div>
          <span class="toggle-text">Auto Enquadramento</span>
        </label>
        
        <label class="toggle-row">
          <div class="toggle-switch">
            <input type="checkbox" :checked="autoSnap" @change="emit('setAutoSnap', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-dot"></span>
          </div>
          <span class="toggle-text">Auto Grudar (Snap)</span>
        </label>
      </div>
    </div>

    <!-- Theme -->
    <div class="toolbox-section">
      <div class="tool-group-label">Tema do Mapa</div>
      <div class="theme-grid">
        <button
          v-for="t in themeOptions"
          :key="t.name"
          class="theme-btn"
          :class="{ active: currentTheme === t.name }"
          @click="emit('setTheme', t.name)"
        >
          <div class="theme-preview" :class="'theme-' + t.name"></div>
          <span class="theme-label">{{ t.label }}</span>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="toolbox-footer">
      <div class="stats-container">
        <div class="stats-header">Estatísticas</div>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-val">{{ stats.edges || 0 }}</span>
            <span class="stat-lab">Ruas</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">{{ stats.blocks || 0 }}</span>
            <span class="stat-lab">Quadras</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">{{ stats.lots || 0 }}</span>
            <span class="stat-lab">Lotes</span>
          </div>
        </div>
        
        <div class="stats-divider"></div>

        <div class="area-stats">
          <div class="area-vendavel-group">
            <span class="area-label">Área Vendável</span>
            <div class="area-value-row">
               <span class="area-num">{{ (stats.totalArea / (props.pixelsPerMeter * props.pixelsPerMeter || 100)).toLocaleString('pt-BR') }}</span>
               <span class="area-unit">m²</span>
            </div>
          </div>
          <div class="hectare-badge">
             {{ (stats.totalArea / ((props.pixelsPerMeter * props.pixelsPerMeter || 100) * 10000)).toLocaleString('pt-BR', { minimumFractionDigits: 3 }) }} <span class="hectare-unit">hectares</span>
          </div>
        </div>
      </div>
      
      <div class="footer-actions">
        <button 
          class="clear-btn" 
          title="Limpar Tudo (Cuidado!)"
          @click="confirmClear"
        >
          <span class="tool-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></span>
          Limpar Projeto
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EditorTool } from '../../composables/lotEditor/store'
import type { ThemeName } from '../../composables/lotEditor/themes'

const props = defineProps<{
  activeTool: EditorTool
  roadWidth: number
  wallWidth: number
  roundaboutRadius: number
  roundaboutPorts: number
  prefabWidth: number
  prefabHeight: number
  textFontSize: number
  textColor: string
  canUndo: boolean
  canRedo: boolean
  autoFrame: boolean
  autoSnap: boolean
  currentTheme: ThemeName
  pixelsPerMeter: number
  stats: { nodes: number; edges: number; blocks: number; lots: number; totalArea: number }
}>()

const emit = defineEmits<{
  selectTool: [tool: EditorTool]
  setRoadWidth: [width: number]
  setWallWidth: [width: number]
  setRoundaboutRadius: [radius: number]
  setRoundaboutPorts: [ports: number]
  setPrefabWidth: [width: number]
  setPrefabHeight: [height: number]
  setTextFontSize: [size: number]
  setTextColor: [color: string]
  setAutoFrame: [enabled: boolean]
  setAutoSnap: [enabled: boolean]
  setPixelsPerMeter: [ppm: number]
  undo: []
  redo: []
  deleteSelected: []
  setTheme: [theme: ThemeName]
  clearAll: []
}>()

const confirmClear = () => {
  if (confirm('Deseja REALMENTE limpar todo o projeto? Esta ação não pode ser desfeita.')) {
    emit('clearAll')
  }
}

const basicTools = [
  { id: 'select' as EditorTool, label: 'Selecionar', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>', shortcut: 'V' },
  { id: 'pan' as EditorTool, label: 'Mover mapa', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>', shortcut: 'Espaço' },
]

const buildTools = [
  { id: 'road' as EditorTool, label: 'Criar Rua', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v22"/><path d="M14 2v22"/><path d="M10 8h4"/><path d="M10 16h4"/></svg>', shortcut: 'R' },
  { id: 'wall' as EditorTool, label: 'Criar Muro', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12"/><path d="M10 6v12"/><path d="M14 6v12"/><path d="M18 6v12"/></svg>', shortcut: 'M' },
  { id: 'roundabout' as EditorTool, label: 'Rotatória', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>', shortcut: 'C' },
  { id: 'prefab_block' as EditorTool, label: 'Quadra Pronta', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>', shortcut: 'B' },
  { id: 'lot_draw' as EditorTool, label: 'Desenhar Lote', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 17l4-4 4 4 4-4"/></svg>', shortcut: 'L' },
  { id: 'text' as EditorTool, label: 'Texto', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>', shortcut: 'T' },
]

const natureTools = [
  { id: 'natural_lake' as EditorTool, label: 'Lago', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>', shortcut: 'J' },
  { id: 'natural_green' as EditorTool, label: 'Área Verde', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M12 11.5V14"/><path d="M13.5 13H15"/><path d="M10.5 13H9"/><path d="M12 9V7"/></svg>', shortcut: 'G' },
  { id: 'natural_institutional' as EditorTool, label: 'Institucional', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', shortcut: 'I' },
]

const themeOptions = [
  { name: 'maquete' as ThemeName, label: 'Maquete' },
  { name: 'minimal' as ThemeName, label: 'Minimal' },
  { name: 'clean' as ThemeName, label: 'Clean' },
]
</script>

<style scoped>
.toolbox {
  width: 210px;
  background: #fff;
  border-right: 1px solid var(--gray-200, #e5e7eb);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  user-select: none;
  height: 100vh;
}

.toolbox-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--gray-100, #f3f4f6);
}

.toolbox-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--gray-700, #374151);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toolbox-section {
  padding: 10px 12px;
}

.toolbox-section.active-config {
  background: var(--primary-light, #f5f3ff);
  border-top: 1px solid var(--primary-100, #ede9fe);
  border-bottom: 1px solid var(--primary-100, #ede9fe);
  margin: 4px 0;
}

.tool-group-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--gray-400, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  padding-left: 2px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.color-picker-input {
  width: 100%;
  height: 24px;
  padding: 0;
  border: 1px solid var(--gray-300, #d1d5db);
  border-radius: 4px;
  cursor: pointer;
  background: none;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--gray-600, #4b5563);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  margin-bottom: 2px;
}

.tool-btn:hover {
  background: var(--gray-100, #f3f4f6);
  color: var(--gray-900, #111827);
}

.tool-btn.active {
  background: white;
  color: var(--primary, #6366f1);
  border-color: var(--primary-200, #c7d2fe);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

.tool-btn.active .tool-icon {
  color: var(--primary, #6366f1);
}

.tool-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  filter: grayscale(1);
}

.tool-btn.danger:hover {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fee2e2;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--gray-400, #9ca3af);
  transition: color 0.2s ease;
}

.tool-label {
  flex: 1;
  text-align: left;
  white-space: nowrap;
}

.tool-shortcut {
  font-size: 9px;
  font-weight: 600;
  color: var(--gray-400, #9ca3af);
  background: var(--gray-100, #f3f4f6);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: monospace;
  min-width: 18px;
  text-align: center;
  opacity: 0.8;
}

.tool-btn.active .tool-shortcut {
  background: var(--primary-50, #f5f3ff);
  color: var(--primary, #6366f1);
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  background: var(--gray-50, #f9fafb);
  padding: 8px;
  border-radius: 6px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-500, #6b7280);
  text-transform: uppercase;
}

.tool-slider {
  width: 100%;
  height: 4px;
  accent-color: var(--primary, #6366f1);
  cursor: pointer;
}

.slider-value {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary, #6366f1);
  background: white;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--gray-200, #e5e7eb);
}

.toolbox-divider {
  height: 1px;
  background: var(--gray-100, #f3f4f6);
  margin: 4px 12px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--gray-600, #4b5563);
}

.theme-btn:hover {
  border-color: var(--gray-300, #d1d5db);
  background: var(--gray-50, #f9fafb);
}

.theme-btn.active {
  border-color: var(--primary, #6366f1);
  background: var(--primary-light, #f5f3ff);
  color: var(--primary, #6366f1);
}

.theme-preview {
  width: 100%;
  height: 20px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.05);
}

.theme-maquete { background: #eab308; }
.theme-minimal { background: #f1f5f9; }
.theme-clean { background: #ffffff; border: 1px solid #e2e8f0; }

.toolbox-footer {
  margin-top: auto;
  padding: 20px 12px 12px;
  background: var(--gray-50, #f9fafb);
  border-top: 1px solid var(--gray-200, #e5e7eb);
}

.stats-container {
  background: white;
  border-radius: 10px;
  padding: 14px 12px;
  border: 1px solid var(--gray-200, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stats-header {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--gray-400, #9ca3af);
  margin-bottom: 12px;
  letter-spacing: 0.8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 4px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: var(--gray-50, #f9fafb);
  border-radius: 8px;
}

.stat-val {
  font-size: 14px;
  font-weight: 800;
  color: var(--gray-900, #111827);
}

.stat-lab {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--gray-400, #9ca3af);
  margin-top: 1px;
}

.stats-divider {
  height: 1px;
  background: var(--gray-100, #f3f4f6);
  margin: 12px 0;
  opacity: 0.5;
}

.area-stats {
  margin-top: 16px;
}

.area-vendavel-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.area-label {
  font-size: 9px;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--gray-400, #9ca3af);
  letter-spacing: 0.05em;
}

.area-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.area-num {
  font-size: 18px;
  font-weight: 900;
  color: var(--primary, #6366f1);
  line-height: 1;
}

.area-unit {
  font-size: 11px;
  font-weight: 800;
  color: var(--primary, #6366f1);
}

.hectare-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--gray-500, #6b7280);
  background: var(--gray-50, #f9fafb);
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--gray-100, #f3f4f6);
  display: inline-block;
}

.hectare-unit {
  font-size: 8px;
  text-transform: uppercase;
  opacity: 0.7;
}

.footer-actions {
  margin-top: 40px;
  padding-top: 16px;
  padding-bottom: 8px;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  background: white;
  border: 1px solid #fee2e2;
  border-radius: 8px;
  color: #ef4444;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
  transform: translateY(-1px);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.hint-margin {
  margin-top: 8px;
}

/* Config Styles */
.config-card {
  padding: 12px;
  background: var(--gray-50, #f9fafb);
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 8px;
  margin-bottom: 16px;
}

.config-label {
  font-size: 10px;
  display: block;
  font-weight: 800;
  color: var(--gray-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.config-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.config-input {
  width: 65px;
  padding: 5px 8px;
  border: 1px solid var(--gray-300, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--gray-900, #111827);
  background: white;
}

.config-unit {
  font-size: 10px;
  font-weight: 800;
  color: var(--gray-400, #9ca3af);
  text-transform: uppercase;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 2px 0;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-dot {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--gray-300, #d1d5db);
  transition: .2s;
  border-radius: 20px;
}

.toggle-dot:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s;
  border-radius: 50%;
}

input:checked + .toggle-dot {
  background-color: var(--primary, #6366f1);
}

input:checked + .toggle-dot:before {
  transform: translateX(16px);
}

.toggle-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--gray-700, #4b5563);
  user-select: none;
}

.field-hint {
  font-size: 10px;
  color: var(--gray-400, #9ca3af);
  margin-top: 8px;
  line-height: 1.4;
  font-style: italic;
}
</style>
