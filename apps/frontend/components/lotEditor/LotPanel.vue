<template>
  <div
    class="lot-panel"
    data-panel
    v-if="lot"
    @keydown="handlePanelKeydown"
  >
    <div class="panel-header">
      <h3>{{ lot.label }}</h3>
      <button class="close-btn" @click="emit('close')" title="Fechar">✕</button>
    </div>

    <div class="panel-body">
      <!-- Label -->
      <div class="field">
        <label>Nome do Lote</label>
        <input
          type="text"
          :value="lot.label"
          @input="update('label', ($event.target as HTMLInputElement).value)"
          class="field-input"
        />
      </div>

      <!-- Status -->
      <div class="field">
        <label>Status</label>
        <div class="status-buttons">
          <button class="status-btn available" :class="{ active: lot.status === 'available' }" @click="update('status', 'available')">Disponível</button>
          <button class="status-btn reserved"  :class="{ active: lot.status === 'reserved' }"  @click="update('status', 'reserved')">Reservado</button>
          <button class="status-btn sold"      :class="{ active: lot.status === 'sold' }"      @click="update('status', 'sold')">Vendido</button>
        </div>
      </div>

      <!-- Effective Area -->
      <div class="field" @click.stop>
        <label>Área Oficial (m²)</label>
        <div class="flex gap-2">
          <input
            type="number"
            step="0.01"
            :value="lot.manualAreaM2 ?? (contractAreaM2 ?? pixelAreaM2).toFixed(2)"
            class="field-input flex-1 area-highlight-input"
            :class="{ 'manual-active': lot.manualAreaM2 != null }"
            @input="update('manualAreaM2', parseFloatOrNull(($event.target as HTMLInputElement).value))"
            placeholder="0.00"
          />
          <button 
            v-if="lot.manualAreaM2 != null" 
            class="btn-reset-area" 
            title="Usar cálculo automático"
            @click="update('manualAreaM2', null)"
          >↺</button>
        </div>
        
        <div class="area-source mt-2">
          <div v-if="lot.manualAreaM2 != null" class="source-item text-blue-600">
            <span class="dot blue"></span>
            Valor inserido manualmente (Sobrepõe cálculos)
          </div>
          <div v-else-if="contractAreaM2 !== null" class="source-item text-green-600 font-medium">
            <span class="dot green"></span>
            Calculada pelas medidas dos lados ({{ contractAreaM2.toFixed(2) }} m²)
          </div>
          <div v-else class="source-item text-gray-500">
            <span class="dot gray"></span>
            Estimada pelo desenho no mapa ({{ pixelAreaM2.toFixed(1) }} m²)
          </div>
        </div>
      </div>

      <!-- Override switch -->
      <div v-if="lot.manualAreaM2 == null" class="field override-field">
        <label class="checkbox-container">
          <input
            type="checkbox"
            :checked="lot.ignoreDrawingArea"
            @change="update('ignoreDrawingArea', ($event.target as HTMLInputElement).checked)"
          />
          <span class="checkmark"></span>
          <span class="checkbox-label">Forçar cálculo pelas medidas</span>
        </label>
        <p class="field-hint">Ignora distorções do desenho e usa o produto das médias das medidas.</p>
      </div>

      <!-- Frontage -->
      <div class="field" @click.stop>
        <label>Testada / Frente (m)</label>
        <div class="flex gap-2">
          <input
            type="number"
            step="0.01"
            :value="lot.manualFrontage ?? estimatedMeters(frontEdgeIndex).toFixed(2)"
            class="field-input flex-1 area-highlight-input"
            :class="{ 'manual-active': lot.manualFrontage != null }"
            @input="update('manualFrontage', parseFloatOrNull(($event.target as HTMLInputElement).value))"
            placeholder="0.00"
          />
          <button 
            v-if="lot.manualFrontage != null" 
            class="btn-reset-area" 
            title="Usar cálculo automático"
            @click="update('manualFrontage', null)"
          >↺</button>
        </div>
        <p class="field-hint" v-if="lot.manualFrontage == null">Estimado pelo desenho do lado {{ frontEdgeIndex + 1 }}.</p>
        <p class="field-hint text-blue-600 font-medium" v-else>Valor manual (Sobrepõe cálculos).</p>
      </div>

      <!-- ─── Side Measurements ─────────────────────── -->
      <div class="field-group">
        <div class="group-header">
          <span class="group-label">Lados do Lote</span>
          <span class="side-count">{{ sideMetrics.length }} lados</span>
        </div>

        <!-- Calculated area badge -->
        <div v-if="contractAreaM2 !== null" class="contract-area-badge">
          <span class="contract-area-label">Área pelos lados</span>
          <span class="contract-area-value">{{ contractAreaM2.toFixed(2) }} m²</span>
        </div>
        <div v-else-if="sidesWithMeters > 0" class="sides-progress">
          <span>{{ sidesWithMeters }} de {{ sideMetrics.length }} lados definidos para calcular área</span>
        </div>

        <!-- Side rows -->
        <div
          v-for="(side, i) in sideMetrics"
          :key="i"
          :ref="(el) => setSideRowRef(el, i)"
          class="side-row"
          :class="{ 'side-front': i === frontEdgeIndex, 'side-active': props.activeVertexIndex === i }"
        >
          <!-- Side color badge -->
          <div class="side-badge" :style="{ background: sideColor(i) }">{{ i + 1 }}</div>

          <!-- Label + estimated length -->
          <div class="side-info">
            <div class="side-label-row">
              <input
                v-if="editingLabelIndex === i"
                type="text"
                :value="side.label"
                class="side-label-input"
                ref="labelInputRef"
                @input="updateSideLabel(i, ($event.target as HTMLInputElement).value)"
                @blur="editingLabelIndex = -1"
                @keydown.enter="editingLabelIndex = -1"
                @keydown.escape="resetSideLabel(i); editingLabelIndex = -1"
                @click.stop
              />
              <button
                v-else
                class="side-label-btn"
                :title="'Renomear: ' + side.label"
                @click.stop="startEditLabel(i)"
              >
                {{ side.label || `Lado ${i + 1}` }}
                <span class="edit-icon">✎</span>
              </button>
            </div>
            <span class="side-est">~{{ estimatedMeters(i).toFixed(2) }} m</span>
          </div>

          <!-- Meters input -->
          <div class="side-meters">
            <input
              type="number"
              step="0.01"
              min="0"
              :value="side.meters ?? ''"
              :placeholder="estimatedMeters(i).toFixed(2)"
              class="side-input"
              @input="updateSideMeters(i, parseFloatOrNull(($event.target as HTMLInputElement).value))"
              @click.stop
            />
            <span class="side-unit">m</span>
          </div>

          <!-- Vertex actions -->
          <div class="side-actions">
            <button
              class="side-action-btn add-btn"
              title="Adicionar ponto após este lado"
              @click.stop="emit('addVertex', i)"
            >+</button>
            <button
              class="side-action-btn del-btn"
              :disabled="sideMetrics.length <= 3"
              :title="sideMetrics.length <= 3 ? 'Mínimo 3 pontos' : 'Remover este ponto'"
              @click.stop="emit('removeVertex', i)"
            >×</button>
          </div>
        </div>

        <p v-if="sideMetrics.length === 0" class="empty-sides">
          Nenhum lado detectado.
        </p>
      </div>

      <!-- Price -->
      <div class="field">
        <label>Preço (R$)</label>
        <input
          type="number"
          :value="lot.price ?? ''"
          @input="update('price', parseFloatOrNull(($event.target as HTMLInputElement).value))"
          class="field-input"
          placeholder="0.00"
        />
      </div>

      <!-- Conditions -->
      <div class="field">
        <label>Condições</label>
        <input
          type="text"
          :value="lot.conditions"
          @input="update('conditions', ($event.target as HTMLInputElement).value)"
          class="field-input"
          placeholder="À vista, parcelado..."
        />
      </div>

      <!-- Notes -->
      <div class="field">
        <label>Observações</label>
        <textarea
          :value="lot.notes"
          @input="update('notes', ($event.target as HTMLTextAreaElement).value)"
          class="field-textarea"
          rows="3"
          placeholder="Notas sobre o lote..."
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="btn-action duplicate-btn" @click="emit('duplicateLot')" title="Duplicar lote (Ctrl+D)">📋 Duplicar</button>
        <button class="btn-action create-btn"    @click="emit('createLot')"    title="Criar novo lote na quadra">➕ Novo Lote</button>
      </div>

      <!-- Delete -->
      <button class="btn-danger full-width" style="margin-top: 4px;" @click="emit('deleteLot')">🗑️ Excluir Lote</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { Lot, LotId, SideMetric } from '../../composables/lotEditor/topology/types'

const SIDE_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706',
  '#7c3aed', '#0891b2', '#be185d', '#65a30d',
]

const props = defineProps<{
  lot: Lot | null
  /** Editor pixels-per-meter setting (default 10) */
  pixelsPerMeter?: number
  /** Index of the vertex currently being dragged on canvas */
  activeVertexIndex?: number | null
}>()

const emit = defineEmits<{
  update: [lotId: LotId, field: string, value: any]
  close: []
  deleteLot: []
  duplicateLot: []
  createLot: []
  removeVertex: [index: number]
  addVertex: [afterIndex: number]
}>()

const editingLabelIndex = ref(-1)
const labelInputRef = ref<HTMLInputElement | null>(null)
const sideRowRefs = ref<HTMLElement[]>([])

function setSideRowRef(el: any, i: number) {
  if (el) sideRowRefs.value[i] = el
}

watch(() => props.activeVertexIndex, (idx) => {
  if (idx == null) return
  nextTick(() => {
    sideRowRefs.value[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
})

function sideColor(i: number): string {
  return SIDE_COLORS[i % SIDE_COLORS.length] ?? '#6b7280'
}

function update(field: string, value: any) {
  if (!props.lot) return
  emit('update', props.lot.id, field, value)
}

function parseFloatOrNull(v: string): number | null {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

// ─── Geometry helpers ──────────────────────────────────

const ppm = computed(() => props.pixelsPerMeter ?? 10)

/** Pixel length of each polygon edge */
const edgeLengths = computed<number[]>(() => {
  const lot = props.lot
  if (!lot || lot.polygon.length < 2) return []
  return lot.polygon.map((p, i) => {
    const q = lot.polygon[(i + 1) % lot.polygon.length]!
    return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
  })
})

/** Index of the "front" edge – closest pixel length to lot.frontage */
const frontEdgeIndex = computed<number>(() => {
  const lot = props.lot
  if (!lot) return 0
  const lengths = edgeLengths.value
  let bestIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < lengths.length; i++) {
    const d = Math.abs(lengths[i]! - lot.frontage)
    if (d < bestDiff) { bestDiff = d; bestIdx = i }
  }
  return bestIdx
})

/** Auto-label based on polygon shape and front edge */
function autoLabel(index: number): string {
  if (!props.lot) return `Lado ${index + 1}`
  const n = props.lot.polygon.length
  const offset = (index - frontEdgeIndex.value + n) % n
  if (n === 4) return (['Frente', 'Lado Dir.', 'Fundo', 'Lado Esq.'] as const)[offset] ?? `Lado ${index + 1}`
  if (n === 3) return (['Frente', 'Lado Dir.', 'Lado Esq.'] as const)[offset]  ?? `Lado ${index + 1}`
  return offset === 0 ? 'Frente' : `Lado ${index + 1}`
}

/** Estimated real-world length via pixels-per-meter */
function estimatedMeters(index: number): number {
  return (edgeLengths.value[index] ?? 0) / ppm.value
}

/** Normalized sideMetrics – one entry per polygon edge */
const sideMetrics = computed<SideMetric[]>(() => {
  const lot = props.lot
  if (!lot || lot.polygon.length < 2) return []
  const n = lot.polygon.length
  return Array.from({ length: n }, (_, i) => ({
    label: lot.sideMetrics?.[i]?.label ?? autoLabel(i),
    meters: lot.sideMetrics?.[i]?.meters ?? null,
  }))
})

/** Area in m² from pixel area + ppm */
const pixelAreaM2 = computed(() => {
  if (!props.lot) return 0
  return props.lot.area / (ppm.value * ppm.value)
})

/**
 * Area calculated from user-defined side lengths.
 * Requires ≥50% of sides to have values for a reliable estimate.
 */
const contractAreaM2 = computed<number | null>(() => {
  const lot = props.lot
  if (!lot) return null
  const poly = lot.polygon
  if (poly.length < 2) return null
  
  const lengths = edgeLengths.value
  const sm = sideMetrics.value

  // Check if we have all 4 meters for a 4-sided lot (most common case)
  const m = sm.map(s => s.meters)
  if (sm.length === 4 && m.every(v => v !== null && v > 0)) {
    // Standard Brazilian real estate area for irregular quadrilaterals:
    // (Pair 1 & 3 average) * (Pair 2 & 4 average)
    return ((m[0]! + m[2]!) / 2) * ((m[1]! + m[3]!) / 2)
  }

  const scales: (number | null)[] = lengths.map((len, j) => {
    const meterVal = sm[j]?.meters
    return (meterVal != null && meterVal > 0 && len > 0) ? meterVal / len : null
  })

  // Need at least 50% of sides defined for a reliable estimate
  const validScales = scales.filter((s): s is number => s !== null)
  const minRequired = Math.max(1, Math.ceil(sm.length * 0.5))
  if (validScales.length < minRequired) return null

  // Special logic for 4-sided lots to handle aspect ratio corrections when partial sides are given
  if (sm.length === 4) {
    const getAvg = (a: number | null, b: number | null) => {
      if (a != null && b != null) return (a + b) / 2
      return a ?? b ?? null
    }
    const sw = getAvg(scales[0]!, scales[2]!)
    const sd = getAvg(scales[1]!, scales[3]!)
    if (sw != null && sd != null) return lot.area * sw * sd
  }

  // Fallback to geometric mean
  const product = validScales.reduce((a, b) => a * b, 1)
  const geometricMean = Math.pow(product, 1 / validScales.length)
  return lot.area * geometricMean * geometricMean
})

const sidesWithMeters = computed(() =>
  sideMetrics.value.filter(s => s.meters != null && s.meters > 0).length
)

// ─── Event handlers ───────────────────────────────────

function handlePanelKeydown(e: KeyboardEvent) {
  // Always stop propagation for potentially destructive keys (Delete, Backspace)
  // or keys that trigger tools (V, R, etc.) when the focus is inside the panel.
  // We allow 'Escape' to bubble so it can close the panel via the global listener.
  if (e.key !== 'Escape') {
    e.stopPropagation()
  }
}

// ─── Side edit handlers ───────────────────────────────

function updateSideMeters(index: number, meters: number | null) {
  const sm = sideMetrics.value.map(s => ({ ...s }))
  sm[index] = { ...sm[index]!, meters }
  update('sideMetrics', sm)
}

function updateSideLabel(index: number, label: string) {
  const sm = sideMetrics.value.map(s => ({ ...s }))
  sm[index] = { ...sm[index]!, label }
  update('sideMetrics', sm)
}

function resetSideLabel(index: number) {
  const sm = sideMetrics.value.map(s => ({ ...s }))
  sm[index] = { label: autoLabel(index), meters: sm[index]?.meters ?? null }
  update('sideMetrics', sm)
}

async function startEditLabel(index: number) {
  editingLabelIndex.value = index
  await nextTick()
  if (Array.isArray(labelInputRef.value)) {
    (labelInputRef.value[0] as HTMLInputElement | undefined)?.focus()
  } else {
    labelInputRef.value?.focus()
  }
}
</script>

<style scoped>
.lot-panel {
  width: 304px;
  background: #fff;
  border-left: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--gray-100);
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}
.panel-header h3 { font-size: 14px; font-weight: 700; color: var(--gray-800); margin: 0; }
.close-btn { background: none; border: none; cursor: pointer; color: var(--gray-400); font-size: 16px; padding: 2px 6px; border-radius: var(--radius-sm); }
.close-btn:hover { background: var(--gray-100); color: var(--gray-700); }
.panel-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 14px; }

.field label { display: block; font-size: 11px; font-weight: 600; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
.field-input { width: 100%; padding: 8px 10px; border: 1px solid var(--gray-200); border-radius: var(--radius-md); font-size: 13px; color: var(--gray-800); outline: none; box-sizing: border-box; transition: border-color 0.15s; }
.field-input:focus { border-color: var(--primary); }
.field-textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--gray-200); border-radius: var(--radius-md); font-size: 13px; color: var(--gray-800); outline: none; resize: vertical; font-family: var(--font-sans); box-sizing: border-box; transition: border-color 0.15s; }
.field-textarea:focus { border-color: var(--primary); }
.field-value { font-size: 14px; font-weight: 600; color: var(--gray-700); }
.area-highlight { font-size: 18px; font-weight: 800; color: var(--primary); letter-spacing: -0.2px; margin-top: 1px; }
.area-source { margin-top: 4px; display: flex; flex-direction: column; gap: 4px; }
.source-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--gray-400); font-style: italic; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.dot.blue { background: #3b82f6; }
.manual-active { border-color: #3b82f6; background-color: #eff6ff; font-weight: 700; color: #1d4ed8; }

.btn-reset-area, .btn-reset-frontage {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-md);
  padding: 0 10px;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  transition: all 0.2s;
}
.btn-reset-area:hover, .btn-reset-frontage:hover {
  background: #e2e8f0;
  color: #334155;
}

.override-field { border-top: 1px dashed var(--gray-100); padding-top: 12px; }
.checkbox-container { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; margin-bottom: 2px !important; }
.checkbox-container input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
.checkmark { height: 16px; width: 16px; background-color: #fff; border: 1px solid var(--gray-200); border-radius: 4px; position: relative; transition: all 0.2s; }
.checkbox-container:hover input ~ .checkmark { border-color: var(--primary); }
.checkbox-container input:checked ~ .checkmark { background-color: var(--primary); border-color: var(--primary); }
.checkmark:after { content: ""; position: absolute; display: none; left: 5px; top: 2px; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.checkbox-container input:checked ~ .checkmark:after { display: block; }
.checkbox-label { font-size: 12px; font-weight: 600; color: var(--gray-700); text-transform: none !important; margin: 0 !important; letter-spacing: 0 !important; }

.status-buttons { display: flex; gap: 4px; }
.status-btn { flex: 1; padding: 6px 8px; border: 1px solid var(--gray-200); border-radius: var(--radius-sm); background: none; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.15s; color: var(--gray-500); }
.status-btn.available.active { background: var(--success-light); border-color: var(--success); color: var(--success); }
.status-btn.reserved.active  { background: var(--warning-light); border-color: var(--warning); color: var(--warning); }
.status-btn.sold.active      { background: var(--danger-light);  border-color: var(--danger);  color: var(--danger); }
.status-btn:hover:not(.active) { background: var(--gray-50); }

/* ─── Side measurements ─── */
.field-group { display: flex; flex-direction: column; gap: 8px; }
.group-header { display: flex; align-items: center; justify-content: space-between; }
.group-label { font-size: 11px; font-weight: 700; color: var(--gray-700); text-transform: uppercase; letter-spacing: 0.4px; }
.side-count { font-size: 10px; color: var(--gray-400); background: var(--gray-100); padding: 2px 7px; border-radius: 10px; }

.contract-area-badge { display: flex; justify-content: space-between; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 7px 10px; }
.contract-area-label { font-size: 10px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.3px; }
.contract-area-value { font-size: 13px; font-weight: 700; color: #1d4ed8; }
.sides-progress { font-size: 10px; color: var(--gray-400); text-align: center; padding: 4px 0; font-style: italic; }

.side-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  transition: border-color 0.15s;
}
.side-row:hover { border-color: var(--gray-300); }
.side-row.side-front { border-color: #bfdbfe; background: #f0f7ff; }
.side-row.side-active { border-color: #f59e0b; background: #fffbeb; outline: 2px solid #fcd34d; outline-offset: -1px; }

.side-badge { width: 20px; height: 20px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.side-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.side-label-row { display: flex; align-items: center; }
.side-label-btn { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--gray-700); padding: 0; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; display: flex; align-items: center; gap: 3px; }
.side-label-btn:hover { color: var(--primary); }
.edit-icon { font-size: 10px; color: var(--gray-400); opacity: 0; transition: opacity 0.15s; }
.side-label-btn:hover .edit-icon { opacity: 1; }
.side-label-input { font-size: 12px; font-weight: 600; color: var(--gray-700); border: 1px solid var(--primary); border-radius: 4px; padding: 1px 6px; outline: none; width: 100%; max-width: 110px; }
.side-est { font-size: 10px; color: var(--gray-400); }

.side-meters { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.side-input { width: 60px; padding: 5px 6px; border: 1px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 12px; color: var(--gray-800); outline: none; text-align: right; transition: border-color 0.15s; }
.side-input:focus { border-color: var(--primary); }
.side-unit { font-size: 11px; color: var(--gray-400); font-weight: 600; }

.side-actions { display: flex; gap: 3px; flex-shrink: 0; margin-left: 2px; }
.side-action-btn { width: 20px; height: 20px; border-radius: 4px; border: 1px solid var(--gray-200); background: var(--gray-50); cursor: pointer; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0; transition: all 0.15s; }
.add-btn { color: #2563eb; border-color: #bfdbfe; }
.add-btn:hover { background: #eff6ff; border-color: #93c5fd; }
.del-btn { color: #dc2626; border-color: #fecaca; }
.del-btn:hover:not(:disabled) { background: #fef2f2; border-color: #f87171; }
.del-btn:disabled { color: var(--gray-300); cursor: not-allowed; border-color: var(--gray-100); }

.empty-sides { font-size: 12px; color: var(--gray-400); text-align: center; padding: 8px 0; margin: 0; }

/* ─── Actions ─── */
.action-buttons { display: flex; gap: 6px; margin-top: 4px; }
.btn-action { flex: 1; padding: 8px 10px; border: 1px solid var(--gray-200); border-radius: var(--radius-md); background: var(--gray-50); cursor: pointer; font-size: 12px; font-weight: 600; color: var(--gray-700); transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 4px; }
.btn-action:hover { background: var(--gray-100); border-color: var(--gray-300); }
.duplicate-btn:hover { background: #dbeafe; border-color: #93c5fd; color: #2563eb; }
.create-btn:hover    { background: #dcfce7; border-color: #86efac; color: #16a34a; }

.btn-danger { width: 100%; padding: 8px 12px; background: none; border: 1px solid var(--danger); color: var(--danger); border-radius: var(--radius-md); cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s; }
.btn-danger:hover { background: var(--danger-light); }
.full-width { width: 100%; }
</style>
