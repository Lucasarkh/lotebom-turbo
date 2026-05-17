<template>
  <aside v-if="element" class="w-[260px] min-w-[260px] bg-p-elevated border-l border-p-border overflow-y-auto p-3 text-[0.8rem]">
    <h3 class="text-[0.9rem] font-bold text-p-text mb-3">Propriedades</h3>

    <!-- Tile info -->
    <div class="mb-3.5 pb-3 border-b border-p-border">
      <div class="flex justify-between items-center py-0.5">
        <span class="text-p-text-muted text-[0.72rem]">Tipo</span>
        <span class="text-p-text font-medium">{{ tileName }}</span>
      </div>
      <div class="flex justify-between items-center py-0.5">
        <span class="text-p-text-muted text-[0.72rem]">ID</span>
        <span class="font-mono text-[0.7rem] text-p-text-muted">{{ element.id?.slice(0, 8) }}</span>
      </div>
    </div>

    <!-- Position -->
    <div class="mb-3.5 pb-3 border-b border-p-border">
      <h4 class="text-[0.72rem] font-semibold text-p-text-secondary uppercase tracking-wider mb-2">Posição</h4>
      <div class="grid grid-cols-2 gap-2 mb-1.5">
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">X</label>
          <input type="number" :value="element.geometryJson.x" @change="updateGeometry('x', $event)"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Y</label>
          <input type="number" :value="element.geometryJson.y" @change="updateGeometry('y', $event)"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 mb-1.5">
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Rotação</label>
          <input type="number" :value="element.geometryJson.rotation ?? 0" step="90" @change="updateGeometry('rotation', $event)"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
      </div>
    </div>

    <!-- Size -->
    <div class="mb-3.5 pb-3 border-b border-p-border">
      <h4 class="text-[0.72rem] font-semibold text-p-text-secondary uppercase tracking-wider mb-2">Tamanho</h4>
      <div class="grid grid-cols-2 gap-2 mb-1.5">
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Largura</label>
          <input type="number" :value="element.geometryJson.width" step="50" min="50" @change="updateGeometry('width', $event)"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Altura</label>
          <input type="number" :value="element.geometryJson.height" step="50" min="50" @change="updateGeometry('height', $event)"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
      </div>
    </div>

    <!-- Display options -->
    <div class="mb-3.5 pb-3 border-b border-p-border">
      <h4 class="text-[0.72rem] font-semibold text-p-text-secondary uppercase tracking-wider mb-2">Exibição</h4>
      <div class="mb-1.5">
        <label class="flex items-center gap-1.5 text-[0.72rem] text-p-text-secondary cursor-pointer">
          <input type="checkbox" :checked="element.metaJson?.showLabel ?? false" @change="updateMeta('showLabel', ($event.target as HTMLInputElement).checked)"
            class="accent-p-accent w-3.5 h-3.5 cursor-pointer" />
          Mostrar rótulo no mapa
        </label>
      </div>
      <div v-if="element.metaJson?.showLabel" class="mb-1.5">
        <label class="text-[0.68rem] text-p-text-secondary font-medium">Texto do rótulo</label>
        <input type="text" :value="element.name" @change="updateField('name', ($event.target as HTMLInputElement).value)"
          class="w-full border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
    </div>

    <!-- Lot-specific fields -->
    <div v-if="element.type === 'LOT'" class="mb-3.5 pb-3 border-b border-p-border">
      <h4 class="text-[0.72rem] font-semibold text-p-text-secondary uppercase tracking-wider mb-2">Dados do lote</h4>
      <div class="mb-1.5">
        <label class="text-[0.68rem] text-p-text-secondary font-medium">Código</label>
        <input type="text" :value="element.code" @change="updateField('code', ($event.target as HTMLInputElement).value)"
          class="w-full border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
      <div class="mb-1.5">
        <label class="text-[0.68rem] text-p-text-secondary font-medium">Nome</label>
        <input type="text" :value="element.name" @change="updateField('name', ($event.target as HTMLInputElement).value)"
          class="w-full border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
      <div class="mb-1.5">
        <label class="text-[0.68rem] text-p-text-secondary font-medium">Status</label>
        <select :value="element.metaJson?.lotStatus ?? 'AVAILABLE'" @change="updateMeta('lotStatus', ($event.target as HTMLSelectElement).value)"
          class="w-full border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15">
          <option value="AVAILABLE">Disponível</option>
          <option value="RESERVED">Reservado</option>
          <option value="SOLD">Vendido</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2 mb-1.5">
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Preço (R$)</label>
          <input type="number" :value="element.metaJson?.price ?? 0" @change="updateMeta('price', Number(($event.target as HTMLInputElement).value))"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Área (m²)</label>
          <input type="number" :value="element.metaJson?.area ?? 0" @change="updateMeta('area', Number(($event.target as HTMLInputElement).value))"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 mb-1.5">
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Frente (m)</label>
          <input type="number" :value="element.metaJson?.frontage ?? 0" @change="updateMeta('frontage', Number(($event.target as HTMLInputElement).value))"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Fundo (m)</label>
          <input type="number" :value="element.metaJson?.depth ?? 0" @change="updateMeta('depth', Number(($event.target as HTMLInputElement).value))"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
      </div>
      <div class="mb-1.5">
        <label class="text-[0.68rem] text-p-text-secondary font-medium">Inclinação</label>
        <select :value="element.metaJson?.slope ?? 'flat'" @change="updateMeta('slope', ($event.target as HTMLSelectElement).value)"
          class="w-full border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15">
          <option value="flat">Plano</option>
          <option value="gentle">Suave</option>
          <option value="moderate">Moderado</option>
          <option value="steep">Acentuado</option>
        </select>
      </div>
    </div>

    <!-- Label field -->
    <div v-if="element.type === 'LABEL'" class="mb-3.5 pb-3 border-b border-p-border">
      <h4 class="text-[0.72rem] font-semibold text-p-text-secondary uppercase tracking-wider mb-2">Rótulo</h4>
      <div class="mb-1.5">
        <label class="text-[0.68rem] text-p-text-secondary font-medium">Texto</label>
        <input type="text" :value="element.name" @change="updateField('name', ($event.target as HTMLInputElement).value)"
          class="w-full border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
      </div>
      <div class="grid grid-cols-2 gap-2 mb-1.5">
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Tamanho fonte</label>
          <input type="number" :value="element.styleJson?.fontSize ?? 14" @change="updateStyle('fontSize', Number(($event.target as HTMLInputElement).value))"
            class="border border-p-border rounded px-1.5 py-1 text-[0.75rem] text-p-text bg-p-raised focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/15" />
        </div>
        <div class="flex flex-col gap-0.5">
          <label class="text-[0.68rem] text-p-text-secondary font-medium">Cor</label>
          <input type="color" :value="element.styleJson?.fontColor ?? '#1e293b'" @change="updateStyle('fontColor', ($event.target as HTMLInputElement).value)"
            class="h-7 p-0.5 cursor-pointer border border-p-border rounded bg-p-raised" />
        </div>
      </div>
    </div>

    <!-- Delete -->
    <div>
      <button
        class="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-md cursor-pointer text-[0.75rem] font-medium transition-colors hover:bg-red-100"
        @click="element.id && $emit('delete', element.id)"
      >
        Excluir elemento
      </button>
    </div>
  </aside>

  <!-- Empty state -->
  <aside v-else class="w-[260px] min-w-[260px] bg-p-elevated border-l border-p-border overflow-y-auto p-3 text-[0.8rem] flex items-center justify-center">
    <div class="text-center text-p-text-muted p-5">
      <span class="text-2xl">?</span>
      <p class="mt-2 text-[0.75rem]">Selecione um elemento no mapa para ver suas propriedades</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MapElementData } from '../../composables/map/types'
import { getTileById } from '../../composables/map/types'

const props = defineProps<{
  element: MapElementData | null
}>()

const emit = defineEmits<{
  update: [id: string, patch: Partial<MapElementData>]
  delete: [id: string]
}>()

const tileName = computed(() => {
  if (!props.element) return ''
  const tileId = props.element.metaJson?.tileId
  if (tileId) {
    const tile = getTileById(tileId)
    return tile?.name ?? tileId
  }
  return props.element.type
})

function updateGeometry(key: string, event: Event) {
  if (!props.element?.id) return
  const val = Number((event.target as HTMLInputElement).value)
  emit('update', props.element.id, {
    geometryJson: { ...props.element.geometryJson, [key]: val },
  })
}

function updateField(key: keyof MapElementData, value: any) {
  if (!props.element?.id) return
  emit('update', props.element.id, { [key]: value } as any)
}

function updateMeta(key: string, value: any) {
  if (!props.element?.id) return
  emit('update', props.element.id, {
    metaJson: { ...props.element.metaJson, [key]: value },
  })
}

function updateStyle(key: string, value: any) {
  if (!props.element?.id) return
  emit('update', props.element.id, {
    styleJson: { ...props.element.styleJson, [key]: value },
  })
}
</script>
