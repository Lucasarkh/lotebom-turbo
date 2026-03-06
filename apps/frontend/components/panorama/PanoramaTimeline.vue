<template>
  <div class="panorama-timeline">
    <button
      v-for="snap in snapshots"
      :key="snap.id"
      class="timeline-btn"
      :class="{ 'timeline-btn--active': snap.id === activeSnapshotId }"
      @click="$emit('select', snap)"
    >
      {{ snap.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { PanoramaSnapshot } from '~/composables/panorama/types'

defineProps<{
  snapshots: PanoramaSnapshot[]
  activeSnapshotId?: string
}>()

defineEmits<{
  select: [snap: PanoramaSnapshot]
}>()
</script>

<style scoped>
.panorama-timeline {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.timeline-btn {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 6px;
  background: rgba(7, 19, 40, 0.86);
  color: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(6px);
  white-space: nowrap;
}

.timeline-btn:hover {
  background: rgba(21, 43, 78, 0.95);
  border-color: rgba(255, 255, 255, 0.5);
}

.timeline-btn--active {
  background: #2563eb;
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.4);
  font-weight: 700;
}
</style>
