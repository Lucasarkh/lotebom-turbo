<template>
  <div
    class="block-panel"
    data-panel
    v-if="block"
    @keydown.stop="handlePanelKeydown"
  >
    <div class="panel-header">
      <h3>Quadra Selecionada</h3>
      <button class="close-btn" @click="emit('close')" title="Fechar">✕</button>
    </div>

    <div class="panel-body">
      <div class="stat-group">
        <div class="stat">
          <span class="label">Área:</span>
          <span class="value">{{ (polygonArea(block.polygon) / (store.pixelsPerMeter ** 2)).toFixed(2) }} m²</span>
        </div>
        <div class="stat">
          <span class="label">Status:</span>
          <span class="value">{{ block.status === 'detected' ? 'Vazia' : 'Com Lotes' }}</span>
        </div>
      </div>

      <!-- Validation warnings -->
      <div v-if="validationError" class="validation-warning">
        <span class="warn-icon">⚠️</span>
        <span class="warn-text">{{ validationError }}</span>
      </div>

      <div class="actions">
        <button
          v-if="block.status === 'detected'"
          class="btn-primary full-width"
          :disabled="!!validationError"
          @click="emit('generateLots', block.id)"
        >
          🏗️ Gerar Grade de Lotes
        </button>
        <template v-else>
          <button
            class="btn-outline full-width"
            :disabled="!!validationError"
            @click="emit('generateLots', block.id)"
          >
            📝 Editar Grade de Lotes
          </button>
          <button
            class="btn-add-lot full-width"
            style="margin-top: 8px;"
            @click="onAddLot"
          >
            ➕ Adicionar Lote
          </button>
        </template>
        
        <button class="btn-danger full-width" style="margin-top: 10px;" @click="store.deleteSelected">
          🗑️ Excluir Quadra
        </button>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLoteamentoStore } from '~/composables/lotEditor/store'
import type { Block } from '~/composables/lotEditor/topology/types'
import { polygonArea } from '~/composables/lotEditor/geometry/polygon'
import { isSimplePolygon, normalizePolygon } from '~/composables/lotEditor/geometry/clipping'

const props = defineProps<{
  block: Block | null
  count: number
}>()

const emit = defineEmits(['close', 'generateLots'])
const store = useLoteamentoStore()

const validationError = computed(() => {
  if (!props.block) return null
  const poly = props.block.polygon
  if (poly.length < 3) return 'Quadra inválida: menos de 3 vértices.'
  
  const normalized = normalizePolygon(poly)
  if (!normalized || normalized.length < 3) return 'Quadra inválida: polígono degenerado (vértices duplicados ou colineares).'
  
  if (!isSimplePolygon(normalized)) {
    return 'Quadra inválida (auto-interseção). Ajuste o contorno das ruas para corrigir.'
  }
  
  if (!(props.block.sides && props.block.sides.length >= 3)) {
    return 'Quadra sem lados detectados. Verifique se a quadra está cercada por ruas.'
  }
  
  return null
})

function onAddLot() {
  if (!props.block) return
  const newId = store.addLotToBlock(props.block.id)
  if (newId) {
    store.select({ type: 'lot', id: newId })
  }
}

function handlePanelKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') {
    e.stopPropagation()
  }
}
</script>

<style scoped>
.block-panel {
  position: fixed;
  right: 20px;
  top: 80px;
  width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  border: 1px solid #e2e8f0;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.panel-body {
  padding: 16px;
  overflow-y: auto;
}

.stat-group {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat {
  flex: 1;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.stat .label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 4px;
}

.stat .value {
  font-weight: 600;
  color: #1e293b;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-outline {
  background: white;
  color: #2563eb;
  border: 1px solid #2563eb;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.full-width {
  width: 100%;
}

.shortcuts-tip {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px dashed #e2e8f0;
  font-size: 0.8125rem;
  color: #64748b;
}

.multi-actions p {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 16px;
}

.validation-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  margin-bottom: 16px;
}

.warn-icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.warn-text {
  font-size: 0.8125rem;
  color: #92400e;
  line-height: 1.4;
}

.btn-primary:disabled,
.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-add-lot {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #86efac;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add-lot:hover {
  background: #dcfce7;
  border-color: #4ade80;
}
</style>
