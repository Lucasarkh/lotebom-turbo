<template>
  <div
    class="panorama-beacon"
    :class="[`beacon-style--${beacon.style}`, { 'beacon--dragging': isDragging }]"
    :style="pinStyle"
    @mousedown.stop="onMouseDown"
    @click.stop="$emit('click', beacon)"
  >
    <div class="beacon-stem"></div>
    <div class="beacon-label">
      <span class="beacon-text">{{ beacon.title }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PanoramaBeacon } from '~/composables/panorama/types'

const props = defineProps<{
  beacon: PanoramaBeacon
  containerWidth: number
  containerHeight: number
  isDragging?: boolean
  editable?: boolean
}>()

const emit = defineEmits<{
  click: [beacon: PanoramaBeacon]
  dragStart: [beacon: PanoramaBeacon, e: MouseEvent]
}>()

const pinStyle = computed(() => ({
  left: `${props.beacon.x * 100}%`,
  top: `${props.beacon.y * 100}%`,
}))

function onMouseDown(e: MouseEvent) {
  if (props.editable) {
    emit('dragStart', props.beacon, e)
  }
}
</script>

<style>
.panorama-beacon {
  position: absolute;
  /* Ancoragem exata: transformamos apenas X para centralizar */
  transform: translateX(-50%);
  cursor: pointer;
  z-index: 10;
  pointer-events: auto;
  transition: transform 0.15s ease;
}

.panorama-beacon:hover {
  transform: translateX(-50%) scale(1.05);
  z-index: 20;
}

.beacon--dragging {
  cursor: grabbing;
  z-index: 30;
  opacity: 0.85;
}

/* Stem line - O pé do beacon agora é a âncora */
.panorama-beacon .beacon-stem, 
.pnlm-hotspot-base.custom-hotspot .beacon-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2.5px;
  height: 40px;
  background: white;
  opacity: 1;
}

/* Label box - Posicionada acima da haste */
.panorama-beacon .beacon-label, 
.pnlm-hotspot-base.custom-hotspot .beacon-label {
  position: absolute;
  bottom: 40px;
  white-space: nowrap;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.2;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transform: translateX(-50%);
  left: 50%;
  background: rgba(45, 65, 60, 0.95);
  color: #fff;
  backdrop-filter: blur(8px);
}

/* ─── Styles ──────────────────────────────────────────── */

.beacon-style--default .beacon-label {
  background: rgba(45, 65, 60, 0.95);
}

.beacon-style--highlight .beacon-label {
  background: rgba(184, 134, 11, 0.92);
}

.beacon-style--subtle .beacon-label {
  background: rgba(255, 255, 255, 0.75);
  color: #1e293b;
  border: 1px solid rgba(255,255,255,0.4);
}

.beacon-style--subtle .beacon-stem {
  background: rgba(255, 255, 255, 0.6);
}

/* Pannellum specific fixes: Garantindo que o hotspot não tenha tamanho próprio */
.pnlm-hotspot-base.custom-hotspot {
  background: none !important;
  cursor: pointer;
  width: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  border: none !important;
}
</style>
