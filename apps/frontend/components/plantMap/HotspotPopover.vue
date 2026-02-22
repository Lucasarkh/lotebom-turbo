<template>
  <!-- Absolute positioned popover anchored to the hotspot pin -->
  <Teleport to="body">
    <Transition name="popover">
      <div
        v-if="hotspot"
        class="plant-popover"
        :style="popoverStyle"
        role="dialog"
        :aria-label="`Info: ${hotspot.title}`"
        @click.stop
      >
        <!-- Close button -->
        <button class="plant-popover__close" aria-label="Fechar" @click="$emit('close')">
          ✕
        </button>

        <!-- Type badge -->
        <div class="plant-popover__badge" :style="{ background: badgeColor }">
          <span>{{ typeIcon }}</span>
          <span>{{ typeLabel }}</span>
        </div>

        <!-- Title -->
        <h3 class="plant-popover__title">{{ hotspot.title }}</h3>

        <!-- Lot status pill -->
        <div
          v-if="hotspot.type === 'LOTE' && hotspot.loteStatus"
          class="plant-popover__status"
          :style="{ background: statusColor + '22', color: statusColor, borderColor: statusColor }"
        >
          {{ statusLabel }}
        </div>

        <!-- Description -->
        <p v-if="hotspot.description" class="plant-popover__desc">
          {{ hotspot.description }}
        </p>

        <!-- Meta fields -->
        <div v-if="hotspot.metaJson && Object.keys(hotspot.metaJson).length" class="plant-popover__meta">
          <div
            v-for="(val, key) in hotspot.metaJson"
            :key="key"
            class="plant-popover__meta-row"
          >
            <span class="plant-popover__meta-key">{{ key }}</span>
            <span class="plant-popover__meta-val">{{ val }}</span>
          </div>
        </div>

        <!-- CTA -->
        <button
          v-if="ctaLink"
          class="plant-popover__cta"
          @click="handleCta"
        >
          Ver detalhes →
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { PlantHotspot } from '~/composables/plantMap/types'
import {
  HOTSPOT_TYPE_COLORS,
  HOTSPOT_TYPE_ICONS,
  HOTSPOT_TYPE_LABELS,
  LOT_STATUS_COLORS,
  LOT_STATUS_LABELS,
} from '~/composables/plantMap/types'

const props = defineProps<{
  hotspot: PlantHotspot | null
  /** Anchor position in viewport coordinates (px) */
  anchorX: number
  anchorY: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()

const badgeColor = computed(() =>
  props.hotspot ? HOTSPOT_TYPE_COLORS[props.hotspot.type] : '#6b7280',
)
const typeIcon = computed(() =>
  props.hotspot ? HOTSPOT_TYPE_ICONS[props.hotspot.type] : '',
)
const typeLabel = computed(() =>
  props.hotspot ? HOTSPOT_TYPE_LABELS[props.hotspot.type] : '',
)
const statusColor = computed(() =>
  props.hotspot?.loteStatus ? LOT_STATUS_COLORS[props.hotspot.loteStatus] : '#6b7280',
)
const statusLabel = computed(() =>
  props.hotspot?.loteStatus ? LOT_STATUS_LABELS[props.hotspot.loteStatus] : '',
)

const ctaLink = computed(() => {
  if (!props.hotspot) return null
  const { linkType, linkId, linkUrl } = props.hotspot
  if (linkType === 'LOTE_PAGE' && linkId) return `/lotes/${linkId}`
  if (linkType === 'PROJECT_PAGE' && linkId) return `/${linkId}`
  if (linkType === 'CUSTOM_URL' && linkUrl) return linkUrl
  return null
})

const handleCta = () => {
  if (!ctaLink.value) return
  const link = ctaLink.value
  if (link.startsWith('http')) {
    window.open(link, '_blank', 'noopener')
  } else {
    router.push(link)
  }
}

// Position the popover above/to the right of anchor, clamped to viewport
const POPOVER_W = 240
const POPOVER_OFFSET = 16

const popoverStyle = computed(() => {
  if (!import.meta.client) return {}
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = props.anchorX + POPOVER_OFFSET
  let top = props.anchorY - 80

  // Prevent overflow right
  if (left + POPOVER_W > vw - 8) left = props.anchorX - POPOVER_W - POPOVER_OFFSET
  // Prevent overflow top
  if (top < 8) top = props.anchorY + POPOVER_OFFSET
  // Prevent overflow bottom
  if (top + 300 > vh - 8) top = vh - 310

  return {
    position: 'fixed' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${POPOVER_W}px`,
    zIndex: 9999,
  }
})
</script>

<style scoped>
.plant-popover {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
  padding: 16px;
  min-width: 220px;
  border: 1px solid rgba(0,0,0,0.06);
}

.plant-popover__close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}
.plant-popover__close:hover { background: #f3f4f6; color: #111; }

.plant-popover__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}

.plant-popover__title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  padding-right: 20px;
}

.plant-popover__status {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 20px;
  border: 1.5px solid;
  margin-bottom: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.plant-popover__desc {
  font-size: 13px;
  color: #374151;
  margin: 0 0 10px;
  line-height: 1.5;
}

.plant-popover__meta {
  background: #f9fafb;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 10px;
}
.plant-popover__meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  gap: 8px;
  padding: 2px 0;
}
.plant-popover__meta-key {
  color: #6b7280;
  text-transform: capitalize;
}
.plant-popover__meta-val {
  font-weight: 600;
  color: #111827;
}

.plant-popover__cta {
  display: block;
  width: 100%;
  background: #1d4ed8;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: center;
  margin-top: 4px;
}
.plant-popover__cta:hover { background: #1e40af; }

/* Transition */
.popover-enter-active, .popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.popover-enter-from, .popover-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>
