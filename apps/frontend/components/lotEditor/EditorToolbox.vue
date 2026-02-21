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
      </button>
    </div>

    <!-- Road width slider -->
    <div v-if="activeTool === 'road'" class="toolbox-section">
      <div class="tool-group-label">Largura da Rua (m)</div>
      <div class="slider-row">
        <input
          type="range"
          :value="roadWidth"
          min="40"
          max="200"
          step="10"
          class="tool-slider"
          @input="emit('setRoadWidth', Number(($event.target as HTMLInputElement).value))"
        />
        <span class="slider-value">{{ (roadWidth / 10).toFixed(1) }}m</span>
      </div>
    </div>

    <!-- Wall width slider -->
    <div v-if="activeTool === 'wall'" class="toolbox-section">
      <div class="tool-group-label">Espessura do Muro (m)</div>
      <div class="slider-row">
        <input
          type="range"
          :value="wallWidth"
          min="2"
          max="20"
          step="1"
          class="tool-slider"
          @input="emit('setWallWidth', Number(($event.target as HTMLInputElement).value))"
        />
        <span class="slider-value">{{ (wallWidth / 10).toFixed(1) }}m</span>
      </div>
      <div class="field-hint" style="margin-left: 10px;">Muros delimitam quadras como ruas</div>
    </div>

    <!-- Roundabout controls -->
    <div v-if="activeTool === 'roundabout'" class="toolbox-section">
      <div class="tool-group-label">Rotatória</div>
      <div class="slider-row">
        <label class="slider-label">Raio</label>
        <input
          type="range"
          :value="roundaboutRadius"
          min="30"
          max="120"
          step="5"
          class="tool-slider"
          @input="emit('setRoundaboutRadius', Number(($event.target as HTMLInputElement).value))"
        />
        <span class="slider-value">{{ roundaboutRadius }}px</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">Conexões</label>
        <input
          type="range"
          :value="roundaboutPorts"
          min="3"
          max="8"
          step="1"
          class="tool-slider"
          @input="emit('setRoundaboutPorts', Number(($event.target as HTMLInputElement).value))"
        />
        <span class="slider-value">{{ roundaboutPorts }}</span>
      </div>
    </div>

    <!-- Prefab dimensions -->
    <div v-if="activeTool === 'prefab_block'" class="toolbox-section">
      <div class="tool-group-label">Dimensões da Quadra</div>
      <div class="slider-row">
        <label class="slider-label">Larg. (m)</label>
        <input
          type="number"
          :value="prefabWidth"
          class="field-input text-xs"
          @input="emit('setPrefabWidth', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="slider-row">
        <label class="slider-label">Alt. (m)</label>
        <input
          type="number"
          :value="prefabHeight"
          class="field-input text-xs"
          @input="emit('setPrefabHeight', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="field-hint" style="margin-left: 10px;">Clique no mapa para criar</div>
    </div>

    <!-- Text tool controls -->
    <div v-if="activeTool === 'text'" class="toolbox-section">
      <div class="tool-group-label">Texto</div>
      <div class="slider-row">
        <label class="slider-label">Tamanho</label>
        <input
          type="range"
          :value="textFontSize"
          min="8"
          max="72"
          step="2"
          class="tool-slider"
          @input="emit('setTextFontSize', Number(($event.target as HTMLInputElement).value))"
        />
        <span class="slider-value">{{ textFontSize }}px</span>
      </div>
      <div class="slider-row">
        <label class="slider-label">Cor</label>
        <input
          type="color"
          :value="textColor"
          class="field-input"
          style="width: 40px; height: 28px; padding: 1px; cursor: pointer;"
          @input="emit('setTextColor', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="field-hint" style="margin-left: 10px;">Clique no mapa para inserir. Dbl-click para editar.</div>
    </div>

    <div class="toolbox-divider"></div>

    <!-- Actions -->
    <div class="toolbox-section">
      <div class="tool-group-label">Ações</div>
      <button class="tool-btn action-btn" :disabled="!canUndo" @click="emit('undo')" title="Desfazer">
        <span class="tool-icon">↩</span>
        <span class="tool-label">Desfazer</span>
      </button>
      <button class="tool-btn action-btn" :disabled="!canRedo" @click="emit('redo')" title="Refazer">
        <span class="tool-icon">↪</span>
        <span class="tool-label">Refazer</span>
      </button>
      <button class="tool-btn action-btn danger" @click="emit('deleteSelected')" title="Excluir selecionado">
        <span class="tool-icon">✕</span>
        <span class="tool-label">Excluir</span>
      </button>
    </div>

    <!-- Theme -->
    <div class="toolbox-section">
      <div class="tool-group-label">Configurações</div>
      <div class="field-row mb-2">
        <label class="text-xs text-gray-500 font-medium block mb-1">Escala (Pixels / Metro)</label>
        <div class="flex gap-2">
          <input 
            type="number" 
            :value="pixelsPerMeter" 
            class="field-input text-xs flex-1"
            min="1" 
            max="1000"
            @input="emit('setPixelsPerMeter', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="text-xs text-gray-400 self-center">px/m</span>
        </div>
        <p class="field-hint text-xs mt-1">Ex: 10 = 10px per meter (Most projects: 10 or 100)</p>
      </div>
      <label class="toggle-row">
        <input type="checkbox" :checked="autoFrame" @change="emit('setAutoFrame', ($event.target as HTMLInputElement).checked)" />
        <span class="toggle-label text-xs">Auto Enquadramento</span>
      </label>
      <label class="toggle-row mt-1">
        <input type="checkbox" :checked="autoSnap" @change="emit('setAutoSnap', ($event.target as HTMLInputElement).checked)" />
        <span class="toggle-label text-xs">Auto Grudar</span>
      </label>
    </div>

    <!-- Theme -->
    <div class="toolbox-section">
      <div class="tool-group-label">Tema</div>
      <div class="theme-btns">
        <button
          v-for="t in themeOptions"
          :key="t.name"
          class="theme-btn"
          :class="{ active: currentTheme === t.name }"
          @click="emit('setTheme', t.name)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="toolbox-footer">
      <div class="stat-row">
        <span>Ruas:</span> <span>{{ stats.edges }}</span>
      </div>
      <div class="stat-row">
        <span>Quadras:</span> <span>{{ stats.blocks }}</span>
      </div>
      <div class="stat-row">
        <span>Lotes:</span> <span>{{ stats.lots }}</span>
      </div>
      <div class="stat-row pt-2" style="border-top: 1px dotted #e5e7eb; margin-top: 6px; padding-top: 6px;">
        <span>Área Vendável:</span>
      </div>
      <div class="stat-row">
         <span class="text-xs">{{ (stats.totalArea / (props.pixelsPerMeter * props.pixelsPerMeter || 100)).toLocaleString('pt-BR') }} m²</span>
      </div>
      <div class="stat-row">
         <span class="text-xs font-bold">{{ (stats.totalArea / ((props.pixelsPerMeter * props.pixelsPerMeter || 100) * 10000)).toLocaleString('pt-BR', { minimumFractionDigits: 3 }) }} ha</span>
      </div>
      
      <button 
        class="tool-btn danger mt-4" 
        style="margin-top: 12px; border: 1px solid #fee2e2;"
        title="Limpar Tudo (Cuidado!)"
        @click="confirmClear"
      >
        <span class="tool-icon">🗑️</span>
        Limpar Tudo
      </button>
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
  { id: 'select' as EditorTool, label: 'Selecionar', icon: '⊹' },
  { id: 'pan' as EditorTool, label: 'Mover mapa', icon: '✥' },
]

const buildTools = [
  { id: 'road' as EditorTool, label: 'Criar Rua', icon: '━' },
  { id: 'wall' as EditorTool, label: 'Criar Muro', icon: '▮' },
  { id: 'roundabout' as EditorTool, label: 'Rotatória', icon: '◎' },
  { id: 'prefab_block' as EditorTool, label: 'Quadra Pronta', icon: '▤' },
  { id: 'lot_draw' as EditorTool, label: 'Desenhar Lote', icon: '◰' },
  { id: 'text' as EditorTool, label: 'Texto', icon: 'T' },
]

const natureTools = [
  { id: 'natural_lake' as EditorTool, label: 'Lago', icon: '◈' },
  { id: 'natural_green' as EditorTool, label: 'Área Verde', icon: '▧' },
  { id: 'natural_institutional' as EditorTool, label: 'Institucional', icon: '▣' },
]

const themeOptions = [
  { name: 'maquete' as ThemeName, label: 'Maquete' },
  { name: 'minimal' as ThemeName, label: 'Minimal' },
  { name: 'clean' as ThemeName, label: 'Clean' },
]
</script>

<style scoped>
.toolbox {
  width: 200px;
  background: #fff;
  border-right: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  user-select: none;
}

.toolbox-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--gray-100);
}

.toolbox-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--gray-700);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toolbox-section {
  padding: 8px 10px;
}

.tool-group-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--gray-600);
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: var(--gray-50);
  color: var(--gray-800);
}

.tool-btn.active {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 600;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.danger:hover {
  background: var(--danger-light);
  color: var(--danger);
}

.tool-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.tool-label {
  white-space: nowrap;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.slider-label {
  font-size: 11px;
  color: var(--gray-500);
  min-width: 50px;
}

.tool-slider {
  flex: 1;
  height: 4px;
  accent-color: var(--primary);
}

.slider-value {
  font-size: 11px;
  color: var(--gray-500);
  min-width: 36px;
  text-align: right;
}

.toolbox-divider {
  height: 1px;
  background: var(--gray-100);
  margin: 4px 10px;
}

.theme-btns {
  display: flex;
  gap: 4px;
}

.theme-btn {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--gray-600);
  transition: all 0.15s ease;
}

.theme-btn:hover {
  background: var(--gray-50);
}

.theme-btn.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.toolbox-footer {
  margin-top: auto;
  padding: 12px 14px;
  border-top: 1px solid var(--gray-100);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--gray-400);
  line-height: 1.8;
}
</style>
