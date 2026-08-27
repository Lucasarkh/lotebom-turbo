<template>
  <dl class="terrain-metrics">
    <div
      v-for="metric in metrics"
      :key="metric.label"
      class="terrain-metrics__item"
      :class="{ 'is-highlight': metric.highlight }"
    >
      <dt class="terrain-metrics__label">{{ metric.label }}</dt>
      <dd class="terrain-metrics__value">
        {{ metric.value }}
        <span v-if="metric.unit" class="terrain-metrics__unit">{{ metric.unit }}</span>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { TerrainSpec } from './lotTerrainPlan'

  const props = defineProps<{
    spec: TerrainSpec
    displayArea: string | null
    slopeText: string
  }>()

  const formatNumber = (value: number) =>
    Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)

  const metrics = computed(() => {
    const spec = props.spec
    const entries: Array<{ label: string; value: string; unit?: string; highlight?: boolean }> = []

    if (props.displayArea) {
      entries.push({ label: 'Área', value: props.displayArea, unit: 'm²', highlight: true })
    }
    entries.push({ label: 'Frente', value: formatNumber(spec.frontage), unit: 'm', highlight: true })
    entries.push({ label: 'Fundo', value: formatNumber(spec.backWidth), unit: 'm' })
    entries.push({ label: 'Lateral esq.', value: formatNumber(spec.sideLeft), unit: 'm' })
    entries.push({ label: 'Lateral dir.', value: formatNumber(spec.sideRight), unit: 'm' })
    entries.push({ label: 'Topografia', value: props.slopeText })

    return entries
  })
</script>

<style scoped>
  .terrain-metrics {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
  }

  .terrain-metrics__item {
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(102, 63, 29, 0.16);
    background: rgba(255, 252, 245, 0.68);
  }

  .terrain-metrics__item.is-highlight {
    border-color: rgba(173, 100, 39, 0.32);
    background: rgba(255, 240, 219, 0.92);
  }

  .terrain-metrics__label {
    margin: 0 0 2px;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6f4d2c;
  }

  .terrain-metrics__value {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 700;
    color: #4b2d18;
    font-variant-numeric: tabular-nums;
  }

  .terrain-metrics__unit {
    margin-left: 2px;
    font-size: 0.76rem;
    font-weight: 600;
    color: #6f4d2c;
  }

  @media (max-width: 900px) {
    .terrain-metrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 480px) {
    .terrain-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
