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
  border: none;
  border-radius: 6px;
  background: rgba(59, 92, 63, 0.65);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(6px);
  white-space: nowrap;
}

.timeline-btn:hover {
  background: rgba(59, 92, 63, 0.85);
}

.timeline-btn--active {
  background: rgba(59, 92, 63, 0.95);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
  font-weight: 700;
}
</style>
