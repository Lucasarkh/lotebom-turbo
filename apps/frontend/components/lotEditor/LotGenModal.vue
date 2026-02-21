<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Gerar Lotes na Quadra</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <p class="modal-desc">Escolha o modo de subdivisão da quadra.</p>

        <!-- Mode selector -->
        <div class="gen-mode">
          <button
            class="mode-btn"
            :class="{ active: mode === 'dimensions' }"
            @click="mode = 'dimensions'"
          >
            📐 Testada &amp; Profundidade
          </button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'grid' }"
            @click="mode = 'grid'"
          >
            🔲 Linhas &amp; Colunas
          </button>
        </div>

        <!-- Mode A: Frontage + Depth -->
        <template v-if="mode === 'dimensions'">
          <div class="field">
            <label>Testada (Largura do Lote)</label>
            <div class="slider-row">
              <input type="number" v-model.number="frontage" min="1" step="0.5" class="num-input" />
              <span class="m-label">m</span>
            </div>
            <p class="field-hint">A quantidade de colunas será calculada automaticamente pelo perímetro da quadra.</p>
          </div>

          <div class="field">
            <label>Profundidade (Comprimento do Lote)</label>
            <div class="slider-row">
              <input type="number" v-model.number="depth" min="1" step="0.5" class="num-input" />
              <span class="m-label">m</span>
            </div>
          </div>

          <div class="field">
            <label>Linhas</label>
            <p class="field-hint">Use 2 para lotes "costa com costa"</p>
            <div class="slider-row">
              <input type="number" v-model.number="rows" min="1" max="10" class="num-input" />
            </div>
          </div>
        </template>

        <!-- Mode B: Rows + Columns -->
        <template v-else>
          <div class="field">
            <label>Colunas</label>
            <p class="field-hint">Divide o perímetro da frente da quadra igualmente.</p>
            <div class="slider-row">
              <input type="number" v-model.number="gridCols" min="1" max="50" class="num-input" />
            </div>
          </div>

          <div class="field">
            <label>Linhas</label>
            <p class="field-hint">Use 2 para lotes "costa com costa". A profundidade será calculada automaticamente.</p>
            <div class="slider-row">
              <input type="number" v-model.number="gridRows" min="1" max="10" class="num-input" />
            </div>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="emit('close')">Cancelar</button>
        <button class="btn-generate" @click="generate">Gerar Lotes</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { BlockId } from '../../composables/lotEditor/topology/types'

const props = defineProps<{
  blockId: BlockId
}>()

const emit = defineEmits<{
  generate: [blockId: BlockId, options: any]
  close: []
}>()

const mode = ref<'dimensions' | 'grid'>('dimensions')

// Mode A: dimensions
const frontage = ref(10)
const depth = ref(25)
const rows = ref(1)

// Mode B: grid
const gridCols = ref(5)
const gridRows = ref(1)

function generate() {
  if (mode.value === 'dimensions') {
    emit('generate', props.blockId, {
      mode: 'dimensions',
      frontage: frontage.value,
      depth: depth.value,
      rows: rows.value,
      cols: 0, // auto-calculate from frontage
    })
  } else {
    emit('generate', props.blockId, {
      mode: 'grid',
      frontage: 0, // auto-calculate from cols
      depth: 0, // auto-calculate from rows
      rows: gridRows.value,
      cols: gridCols.value,
    })
  }
}
</script>

<style scoped>
.field {
  margin-bottom: 20px;
}
.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}
.field-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: -4px;
  margin-bottom: 6px;
}
.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.num-input {
  width: 80px;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
}
.m-label {
  font-weight: 600;
  color: #64748b;
}
.divider {
  height: 1px;
  background: #f1f5f9;
  margin: 16px 0;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--gray-100);
}

.modal-header h3 {
  font-size: 16px;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gray-400);
  font-size: 18px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--gray-100);
}

.modal-body {
  padding: 20px;
}

.modal-desc {
  font-size: 13px;
  color: var(--gray-500);
  margin-bottom: 16px;
}

.gen-mode {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.mode-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-600);
  transition: all 0.15s ease;
}

.mode-btn:hover {
  background: var(--gray-50);
}

.mode-btn.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.field {
  margin-bottom: 12px;
}

.field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-500);
  margin-bottom: 8px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gen-slider {
  flex: 1;
  accent-color: var(--primary);
}

.slider-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--gray-700);
  min-width: 48px;
  text-align: right;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--gray-100);
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--gray-600);
}

.btn-cancel:hover {
  background: var(--gray-50);
}

.btn-generate {
  padding: 8px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s ease;
}

.btn-generate:hover {
  background: var(--primary-hover);
}
</style>
