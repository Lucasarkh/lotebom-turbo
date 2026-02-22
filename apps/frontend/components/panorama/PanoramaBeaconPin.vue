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

<style scoped>
.panorama-beacon {
  position: absolute;
  transform: translate(-50%, -100%);
  cursor: pointer;
  z-index: 10;
  pointer-events: auto;
  transition: transform 0.15s ease;
}

.panorama-beacon:hover {
  transform: translate(-50%, -100%) scale(1.05);
  z-index: 20;
}

.beacon--dragging {
  cursor: grabbing;
  z-index: 30;
  opacity: 0.85;
}

/* Stem line */
.beacon-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 28px;
  background: white;
  opacity: 0.9;
}

/* Label box */
.beacon-label {
  position: relative;
  bottom: 28px;
  white-space: nowrap;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.3;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  transform: translateX(-50%);
  left: 50%;
}

/* ─── Styles ──────────────────────────────────────────── */

.beacon-style--default .beacon-label {
  background: rgba(59, 92, 63, 0.88);
  color: #fff;
  backdrop-filter: blur(6px);
}

.beacon-style--highlight .beacon-label {
  background: rgba(184, 134, 11, 0.92);
  color: #fff;
  backdrop-filter: blur(6px);
}

.beacon-style--subtle .beacon-label {
  background: rgba(255, 255, 255, 0.75);
  color: #1e293b;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.4);
}

.beacon-style--subtle .beacon-stem {
  background: rgba(255, 255, 255, 0.6);
}
</style>
