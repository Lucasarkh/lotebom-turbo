<template>
  <UiModal :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" :title="isEdit ? 'Editar hotspot' : 'Novo hotspot'" size="md">
    <form @submit.prevent="handleSubmit">
      <!-- Type -->
      <div class="mb-3.5">
        <label class="block text-[13px] font-semibold text-p-text mb-1.5">Tipo *</label>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="t in HOTSPOT_TYPES"
            :key="t.value"
            type="button"
            :class="[
              'flex flex-col items-center gap-0.5 py-2 px-1.5 border-[1.5px] rounded-lg cursor-pointer text-xs font-semibold text-p-text transition-all hover:border-p-text-muted hover:bg-p-overlay',
              form.type === t.value ? 'font-bold' : 'border-p-border bg-p-elevated'
            ]"
            :style="form.type === t.value ? { borderColor: t.color, background: t.color + '18' } : {}"
            @click="form.type = t.value"
          >
            <span class="text-xl">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Title -->
      <div class="mb-3.5">
        <label class="block text-[13px] font-semibold text-p-text mb-1.5">Título *</label>
        <input v-model="form.title" required placeholder="Ex: Lote 12"
          class="w-full px-2.5 py-2 border-[1.5px] border-p-border rounded-lg text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent transition-colors" />
      </div>

      <!-- Label (shown above pin) -->
      <div class="mb-3.5">
        <label class="block text-[13px] font-semibold text-p-text mb-1.5">Rótulo sobre o pino</label>
        <div class="flex gap-2 items-center">
          <input v-model="form.label" placeholder="Ex: L-12"
            class="flex-1 px-2.5 py-2 border-[1.5px] border-p-border rounded-lg text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent transition-colors" />
          <label class="flex items-center gap-1.5 text-[13px] cursor-pointer shrink-0 text-p-text-secondary">
            <input type="checkbox" v-model="form.labelEnabled" class="accent-p-accent" />
            Exibir
          </label>
        </div>
      </div>

      <!-- Lot status (only for LOTE) -->
      <div v-if="form.type === 'LOTE'" class="mb-3.5">
        <label class="block text-[13px] font-semibold text-p-text mb-1.5">Status do lote</label>
        <select v-model="form.loteStatus"
          class="w-full px-2.5 py-2 border-[1.5px] border-p-border rounded-lg text-sm bg-p-raised text-p-text appearance-auto focus:outline-none focus:border-p-accent transition-colors">
          <option value="AVAILABLE">Disponível</option>
          <option value="RESERVED">Reservado</option>
          <option value="SOLD">Vendido</option>
        </select>
      </div>

      <div v-if="form.type === 'LOTE'" class="mb-3.5">
        <label class="block text-[13px] font-semibold text-p-text mb-1.5">Identificação do lote no painel</label>
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="lotInfo.block"
            placeholder="Quadra (ex: B)"
            class="px-2.5 py-2 border-[1.5px] border-p-border rounded-lg text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent transition-colors"
          />
          <input
            v-model="lotInfo.lotNumber"
            placeholder="Lote nº (ex: 31)"
            class="px-2.5 py-2 border-[1.5px] border-p-border rounded-lg text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent transition-colors"
          />
        </div>
        <p class="text-[11px] font-semibold text-p-accent mt-1.5">
          Esses campos sao sincronizados automaticamente com a ficha do lote no painel.
        </p>
      </div>

      <!-- Hint about automatic creation -->
      <div v-if="!isEdit" class="mb-3.5">
        <p v-if="form.type === 'LOTE'" class="text-[11px] font-semibold text-emerald-500 mt-1">
          <i class="bi bi-stars" aria-hidden="true"></i> Hotspots do tipo Lote ganham automaticamente uma página pública e ficha técnica para edição de fotos, preços e detalhes.
        </p>
        <p v-else class="text-[11px] text-p-text-muted mt-1">
          <i class="bi bi-info-circle-fill" aria-hidden="true"></i> Hotspots informativos (portarias, áreas comuns, etc) não possuem página individual própria.
        </p>
      </div>

      <!-- Label offsets -->
      <details class="mt-1">
        <summary class="block text-[13px] font-semibold text-p-text mb-1.5 cursor-pointer"><i class="bi bi-gear-fill" aria-hidden="true"></i> Avançado - offset do rótulo</summary>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label class="block text-[13px] font-semibold text-p-text mb-1.5">Offset X (px)</label>
            <input v-model.number="form.labelOffsetX" type="number"
              class="w-full px-2.5 py-2 border-[1.5px] border-p-border rounded-lg text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent transition-colors" />
          </div>
          <div>
            <label class="block text-[13px] font-semibold text-p-text mb-1.5">Offset Y (px)</label>
            <input v-model.number="form.labelOffsetY" type="number"
              class="w-full px-2.5 py-2 border-[1.5px] border-p-border rounded-lg text-sm bg-p-raised text-p-text focus:outline-none focus:border-p-accent transition-colors" />
          </div>
        </div>
      </details>

      <!-- Error -->
      <div v-if="error" class="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-[13px] mt-2">{{ error }}</div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="$emit('update:modelValue', false)">
          Cancelar
        </UiButton>
        <UiButton variant="primary" :disabled="saving" @click="handleSubmit">
          {{ saving ? 'Salvando...' : (isEdit ? 'Salvar' : 'Criar hotspot') }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type {
  PlantHotspot,
  PlantHotspotType,
  PlantHotspotLinkType,
  LotStatus,
  CreateHotspotPayload,
} from '~/composables/plantMap/types'
import {
  HOTSPOT_TYPE_COLORS,
  HOTSPOT_TYPE_ICONS,
  HOTSPOT_TYPE_LABELS,
} from '~/composables/plantMap/types'

const props = defineProps<{
  modelValue: boolean
  hotspot?: PlantHotspot | null
  defaultType?: PlantHotspotType
  /** Pre-fill x/y when creating a new hotspot by clicking */
  initialX?: number
  initialY?: number
  saving?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', payload: CreateHotspotPayload): void
}>()

const isEdit = computed(() => !!props.hotspot)

// ── Form state ────────────────────────────────────────────
const defaultForm = (): CreateHotspotPayload => ({
  type: (props.defaultType ?? 'LOTE') as PlantHotspotType,
  title: '',
  x: props.initialX ?? 0.5,
  y: props.initialY ?? 0.5,
  label: '',
  labelEnabled: true,
  labelOffsetX: 0,
  labelOffsetY: -24,
  linkType: 'NONE' as PlantHotspotLinkType,
  linkId: '',
  linkUrl: '',
  loteStatus: undefined,
  metaJson: undefined,
})

const form = ref<CreateHotspotPayload>(defaultForm())
const lotInfo = ref({ block: '', lotNumber: '' })

const extractLotInfoFromMeta = (meta: unknown) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { block: '', lotNumber: '' }
  }

  const maybeLotInfo = (meta as Record<string, any>).lotInfo
  if (!maybeLotInfo || typeof maybeLotInfo !== 'object' || Array.isArray(maybeLotInfo)) {
    return { block: '', lotNumber: '' }
  }

  return {
    block: typeof maybeLotInfo.block === 'string' ? maybeLotInfo.block : '',
    lotNumber: typeof maybeLotInfo.lotNumber === 'string' ? maybeLotInfo.lotNumber : '',
  }
}

const buildMetaJsonWithLotInfo = () => {
  const baseMeta =
    form.value.metaJson && typeof form.value.metaJson === 'object' && !Array.isArray(form.value.metaJson)
      ? { ...form.value.metaJson }
      : {}

  const block = lotInfo.value.block.trim()
  const lotNumber = lotInfo.value.lotNumber.trim()

  if (form.value.type === 'LOTE' && (block || lotNumber)) {
    baseMeta.lotInfo = {
      block: block || undefined,
      lotNumber: lotNumber || undefined,
    }
  } else {
    delete baseMeta.lotInfo
  }

  return Object.keys(baseMeta).length ? baseMeta : undefined
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.hotspot) {
      const currentLotInfo = extractLotInfoFromMeta(props.hotspot.metaJson)
      form.value = {
        type: props.hotspot.type,
        title: props.hotspot.title,
        x: props.hotspot.x,
        y: props.hotspot.y,
        label: props.hotspot.label ?? '',
        labelEnabled: props.hotspot.labelEnabled,
        labelOffsetX: props.hotspot.labelOffsetX,
        labelOffsetY: props.hotspot.labelOffsetY,
        linkType: props.hotspot.linkType,
        linkId: props.hotspot.linkId ?? '',
        linkUrl: props.hotspot.linkUrl ?? '',
        loteStatus: props.hotspot.loteStatus ?? undefined,
        metaJson: props.hotspot.metaJson ?? undefined,
      }
      lotInfo.value = currentLotInfo
    } else {
      form.value = defaultForm()
      if (props.initialX !== undefined) form.value.x = props.initialX
      if (props.initialY !== undefined) form.value.y = props.initialY
      form.value.type = props.defaultType ?? 'LOTE'
      lotInfo.value = { block: '', lotNumber: '' }
    }
  },
  { immediate: true },
)

const handleSubmit = () => {
  const payload: CreateHotspotPayload = {
    ...form.value,
    label: form.value.label || undefined,
    linkId: form.value.linkId || undefined,
    linkUrl: form.value.linkUrl || undefined,
    loteStatus: (form.value.loteStatus as string) === '' ? undefined : form.value.loteStatus,
    metaJson: buildMetaJsonWithLotInfo(),
  }
  emit('save', payload)
}

// Type selector options
const HOTSPOT_TYPES = Object.entries(HOTSPOT_TYPE_LABELS).map(([value, label]) => ({
  value: value as PlantHotspotType,
  label,
  icon: HOTSPOT_TYPE_ICONS[value as PlantHotspotType],
  color: HOTSPOT_TYPE_COLORS[value as PlantHotspotType],
}))
</script>
