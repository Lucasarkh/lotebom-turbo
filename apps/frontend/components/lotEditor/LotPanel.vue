<template>
  <div class="lot-panel" v-if="lot">
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
          <button
            class="status-btn available"
            :class="{ active: lot.status === 'available' }"
            @click="update('status', 'available')"
          >
            Disponível
          </button>
          <button
            class="status-btn reserved"
            :class="{ active: lot.status === 'reserved' }"
            @click="update('status', 'reserved')"
          >
            Reservado
          </button>
          <button
            class="status-btn sold"
            :class="{ active: lot.status === 'sold' }"
            @click="update('status', 'sold')"
          >
            Vendido
          </button>
        </div>
      </div>

      <!-- Area -->
      <div class="field">
        <label>Área</label>
        <div class="field-value">{{ (lot.area / 100).toFixed(1) }} m²</div>
      </div>

      <!-- Frontage -->
      <div class="field" v-if="lot.frontage > 0">
        <label>Testada (Calculada)</label>
        <div class="field-value">{{ (lot.frontage / 10).toFixed(2) }} m</div>
      </div>

      <!-- Real-world Metadata -->
      <div class="field-group">
        <label class="group-label">Medidas para Contrato</label>
        <div class="field-row">
          <div class="field half">
            <label>Testada (m)</label>
            <input
              type="number"
              :value="lot.manualFrontage ?? ''"
              @input="update('manualFrontage', Number(($event.target as HTMLInputElement).value) || null)"
              class="field-input"
              placeholder="Ex: 10.00"
            />
          </div>
          <div class="field half">
            <label>Prof. (m)</label>
            <input
              type="number"
              :value="lot.manualDepth ?? ''"
              @input="update('manualDepth', Number(($event.target as HTMLInputElement).value) || null)"
              class="field-input"
              placeholder="Ex: 25.00"
            />
          </div>
        </div>
      </div>

      <!-- Price -->
      <div class="field">
        <label>Preço (R$)</label>
        <input
          type="number"
          :value="lot.price ?? ''"
          @input="update('price', Number(($event.target as HTMLInputElement).value) || null)"
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

      <!-- Delete -->
      <button class="btn-danger full-width" style="margin-top: 12px;" @click="emit('deleteLot')">
        🗑️ Excluir Lote
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Lot, LotId } from '../../composables/lotEditor/topology/types'

const props = defineProps<{
  lot: Lot | null
}>()

const emit = defineEmits<{
  update: [lotId: LotId, field: string, value: any]
  close: []
  deleteLot: []
}>()

function update(field: string, value: any) {
  if (!props.lot) return
  emit('update', props.lot.id, field, value)
}
</script>

<style scoped>
.lot-panel {
  width: 280px;
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
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--gray-800);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gray-400);
  font-size: 16px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--gray-100);
  color: var(--gray-700);
}

.panel-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 4px;
}

.field-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--gray-800);
  outline: none;
  transition: border-color 0.15s ease;
}

.field-input:focus {
  border-color: var(--primary);
}

.field-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--gray-800);
  outline: none;
  resize: vertical;
  font-family: var(--font-sans);
  transition: border-color 0.15s ease;
}

.field-textarea:focus {
  border-color: var(--primary);
}

.field-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-700);
}

.status-buttons {
  display: flex;
  gap: 4px;
}

.status-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.15s ease;
  color: var(--gray-500);
}

.status-btn.available.active {
  background: var(--success-light);
  border-color: var(--success);
  color: var(--success);
}

.status-btn.reserved.active {
  background: var(--warning-light);
  border-color: var(--warning);
  color: var(--warning);
}

.status-btn.sold.active {
  background: var(--danger-light);
  border-color: var(--danger);
  color: var(--danger);
}

.status-btn:hover:not(.active) {
  background: var(--gray-50);
}
</style>
