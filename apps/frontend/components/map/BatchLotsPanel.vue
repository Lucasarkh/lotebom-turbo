<template>
  <div class="p-2 text-xs">
    <h4 class="text-[0.85rem] font-bold text-p-text mb-1">Dados dos Lotes</h4>
    <p class="text-[0.72rem] text-p-text-secondary mb-2.5">Preencha os dados de todos os lotes de uma vez.</p>

    <div v-if="lots.length === 0" class="text-center text-p-text-muted p-5 text-[0.75rem]">
      <p>Nenhum lote no mapa.</p>
    </div>

    <div v-else class="border border-p-border rounded-md overflow-hidden">
      <div class="grid grid-cols-[80px_100px_80px_60px] border-b border-p-border bg-p-overlay font-semibold text-[0.68rem] text-p-text-secondary uppercase">
        <span class="px-1.5 py-1">Cód.</span>
        <span class="px-1.5 py-1">Status</span>
        <span class="px-1.5 py-1">Preço</span>
        <span class="px-1.5 py-1">Área</span>
      </div>
      <div
        v-for="lot in lots"
        :key="lot.id"
        :class="[
          'grid grid-cols-[80px_100px_80px_60px] items-center border-b border-p-border last:border-b-0 cursor-pointer',
          lot.id === selectedId ? 'bg-p-accent/10' : ''
        ]"
        @click="lot.id && $emit('select', lot.id)"
      >
        <span class="px-1.5 py-1">
          <input
            type="text"
            :value="lot.code || ''"
            placeholder="Q1-L01"
            class="w-full border border-transparent bg-transparent text-[0.72rem] px-1 py-0.5 rounded focus:border-p-accent focus:outline-none focus:bg-p-elevated"
            @change="updateLot(lot.id!, 'code', ($event.target as HTMLInputElement).value)"
          />
        </span>
        <span class="px-1.5 py-1">
          <select
            :value="lot.metaJson?.lotStatus ?? 'AVAILABLE'"
            class="w-full border border-transparent bg-transparent text-[0.72rem] px-1 py-0.5 rounded focus:border-p-accent focus:outline-none focus:bg-p-elevated"
            @change="updateLotMeta(lot.id!, 'lotStatus', ($event.target as HTMLSelectElement).value)"
          >
            <option value="AVAILABLE">Disponível</option>
            <option value="RESERVED">Reservado</option>
            <option value="SOLD">Vendido</option>
          </select>
        </span>
        <span class="px-1.5 py-1">
          <input
            type="number"
            :value="lot.metaJson?.price ?? ''"
            placeholder="0"
            class="w-full border border-transparent bg-transparent text-[0.72rem] px-1 py-0.5 rounded focus:border-p-accent focus:outline-none focus:bg-p-elevated"
            @change="updateLotMeta(lot.id!, 'price', Number(($event.target as HTMLInputElement).value))"
          />
        </span>
        <span class="px-1.5 py-1">
          <input
            type="number"
            :value="lot.metaJson?.area ?? ''"
            placeholder="m²"
            class="w-full border border-transparent bg-transparent text-[0.72rem] px-1 py-0.5 rounded focus:border-p-accent focus:outline-none focus:bg-p-elevated"
            @change="updateLotMeta(lot.id!, 'area', Number(($event.target as HTMLInputElement).value))"
          />
        </span>
      </div>
    </div>

    <div class="mt-2.5">
      <UiButton variant="secondary" size="sm" class="w-full" @click="$emit('autoName')">
        Numerar automaticamente
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MapElementData } from '../../composables/map/types'

const props = defineProps<{
  elements: MapElementData[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  update: [id: string, patch: Partial<MapElementData>]
  autoName: []
}>()

const lots = computed(() => props.elements.filter((e) => e.type === 'LOT'))

function updateLot(id: string, key: string, value: any) {
  emit('update', id, { [key]: value } as any)
}

function updateLotMeta(id: string, key: string, value: any) {
  const lot = lots.value.find((l) => l.id === id)
  if (!lot) return
  emit('update', id, { metaJson: { ...lot.metaJson, [key]: value } })
}
</script>
