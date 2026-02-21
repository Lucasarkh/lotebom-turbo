<template>
  <div class="tile-preview" :style="{ width: size + 'px', height: size + 'px' }">
    <v-stage :config="{ width: size, height: size }">
      <v-layer>
        <template v-for="(shape, i) in shapes" :key="i">
          <v-rect v-if="shape.type === 'rect'" :config="shape.config" />
          <v-circle v-if="shape.type === 'circle'" :config="shape.config" />
          <v-line v-if="shape.type === 'line'" :config="shape.config" />
          <v-arc v-if="shape.type === 'arc'" :config="shape.config" />
          <v-text v-if="shape.type === 'text'" :config="shape.config" />
          <v-ellipse v-if="shape.type === 'ellipse'" :config="shape.config" />
          <v-ring v-if="shape.type === 'ring'" :config="shape.config" />
        </template>
      </v-layer>
    </v-stage>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderTilePreview } from '../../composables/map/tiles'

const props = defineProps<{
  tileId: string
  size: number
}>()

const shapes = computed(() => renderTilePreview(props.tileId, props.size))
</script>

<style scoped>
.tile-preview {
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
</style>
