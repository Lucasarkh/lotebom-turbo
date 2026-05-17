<template>
  <UiModal :modelValue="visible" @update:modelValue="!$event && $emit('close')" title="Gerar grade de lotes" size="md">
    <p class="text-sm text-p-text-secondary mb-4">Crie uma grade de lotes automaticamente. Os lotes serão colocados a partir da posição (0, 0) no mapa.</p>

    <div class="grid grid-cols-2 gap-3 mb-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-p-text-secondary">Colunas</label>
        <input v-model.number="cols" type="number" min="1" max="50"
          class="border border-p-border rounded-md px-2.5 py-1.5 text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-p-text-secondary">Linhas</label>
        <input v-model.number="rows" type="number" min="1" max="50"
          class="border border-p-border rounded-md px-2.5 py-1.5 text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-p-text-secondary">Tipo de lote</label>
        <select v-model="lotTileId"
          class="border border-p-border rounded-md px-2.5 py-1.5 text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15">
          <option value="lot-small">Lote pequeno (2x2)</option>
          <option value="lot-medium">Lote médio (2x3)</option>
          <option value="lot-large">Lote grande (3x3)</option>
          <option value="lot-wide">Lote largo (3x2)</option>
          <option value="lot-commercial">Lote comercial (3x4)</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-p-text-secondary">Prefixo</label>
        <input v-model="prefix" type="text" placeholder="Q1-L"
          class="border border-p-border rounded-md px-2.5 py-1.5 text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-p-text-secondary">Posição X inicial</label>
        <input v-model.number="startX" type="number"
          class="border border-p-border rounded-md px-2.5 py-1.5 text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-p-text-secondary">Posição Y inicial</label>
        <input v-model.number="startY" type="number"
          class="border border-p-border rounded-md px-2.5 py-1.5 text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
    </div>

    <div class="bg-p-overlay p-2.5 rounded-md text-sm text-p-text-secondary text-center mb-3">
      <span>{{ cols * rows }} lotes ({{ cols }}x{{ rows }})</span>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="secondary" @click="$emit('close')">Cancelar</UiButton>
        <UiButton variant="primary" @click="generate">Gerar lotes</UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getTileById } from '../../composables/map/types'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  generate: [config: {
    cols: number
    rows: number
    tileId: string
    prefix: string
    startX: number
    startY: number
  }]
}>()

const cols = ref(5)
const rows = ref(4)
const lotTileId = ref('lot-small')
const prefix = ref('Q1-L')
const startX = ref(0)
const startY = ref(0)

function generate() {
  emit('generate', {
    cols: cols.value,
    rows: rows.value,
    tileId: lotTileId.value,
    prefix: prefix.value,
    startX: startX.value,
    startY: startY.value,
  })
  emit('close')
}
</script>
