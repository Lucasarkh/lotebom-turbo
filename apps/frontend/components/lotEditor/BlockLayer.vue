<template>
  <g class="block-layer">
    <g
      v-for="block in blockList"
      :key="block.id"
      class="block-group"
      @mouseenter="hoveredBlock = block.id"
      @mouseleave="hoveredBlock = null"
    >
      <!-- Block fill -->
      <path
        :d="blockPath(block)"
        :fill="block.status === 'lots_generated' ? 'transparent' : theme.blockFill"
        :stroke="isSelected(block.id) ? '#3b82f6' : theme.blockStroke"
        :stroke-width="isSelected(block.id) ? 3 : 1"
        :stroke-dasharray="isSelected(block.id) ? 'none' : (block.status === 'lots_generated' ? '4 3' : 'none')"
        :class="{ 'block-hover': hoveredBlock === block.id && block.status !== 'lots_generated' }"
        @click="e => { if (activeTool === 'select') { e.stopPropagation(); emit('selectBlock', block.id, e) } }"
        @mousedown="e => { if (activeTool === 'select') { e.stopPropagation(); emit('startDragBlock', block.id, e) } }"
        style="cursor: pointer;"
      />

      <!-- Block label (only if not too crowded) -->
      <text
        v-if="block.status === 'detected'"
        :x="blockCenter(block).x"
        :y="blockCenter(block).y"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="theme.labelColor"
        font-size="11"
        font-weight="600"
        opacity="0.6"
        pointer-events="none"
      >
        Quadra
      </text>

      <!-- "Generate lots" button -->
      <g
        v-if="block.status === 'detected' && hoveredBlock === block.id"
        :transform="`translate(${blockCenter(block).x}, ${blockCenter(block).y + 18})`"
        class="gen-lots-btn"
        @mousedown.stop
        @mouseup.stop
        @click.stop="emit('generateLots', block.id)"
      >
        <!-- Transparent hit area expansion -->
        <rect x="-60" y="-18" width="120" height="36" fill="transparent" />
        <rect x="-50" y="-12" width="100" height="24" rx="12"
              fill="#2563eb" opacity="0.9" />
        <text x="0" y="1" text-anchor="middle" dominant-baseline="central"
              fill="#fff" font-size="10" font-weight="600"
              pointer-events="none">
          Gerar Lotes
        </text>
      </g>
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Block, BlockId } from '../../composables/lotEditor/topology/types'
import type { ThemeColors } from '../../composables/lotEditor/themes'
import { polygonToSVGPath, centroid } from '../../composables/lotEditor/geometry/polygon'
import type { Vec2 } from '../../composables/lotEditor/geometry/types'

const props = defineProps<{
  blocks: Map<string, Block>
  theme: ThemeColors
  selectedTargets: { type: string, id: string }[]
  activeTool: string
}>()

const emit = defineEmits<{
  selectBlock: [id: BlockId, event: MouseEvent]
  startDragBlock: [id: BlockId, event: MouseEvent]
  generateLots: [id: BlockId]
}>()

function isSelected(id: BlockId) {
  return props.selectedTargets.some(t => t.type === 'block' && t.id === id)
}

const hoveredBlock = ref<BlockId | null>(null)

const blockList = computed(() => Array.from(props.blocks.values()))

function blockPath(block: Block): string {
  return polygonToSVGPath(block.polygon)
}

function blockCenter(block: Block): Vec2 {
  return centroid(block.polygon)
}
</script>

<style scoped>
.block-hover {
  filter: brightness(1.05);
}
.gen-lots-btn {
  cursor: pointer;
}
.gen-lots-btn:hover rect {
  opacity: 1;
}
</style>
