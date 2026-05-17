<template>
  <div
    class="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-p-border bg-p-elevated transition-all hover:-translate-y-1 hover:border-p-accent hover:shadow-lg"
    @click="$emit('click')"
  >
    <div class="relative h-36 bg-p-overlay">
      <img
        v-if="project.bannerImageUrl"
        :src="project.bannerImageUrl"
        :alt="project.name"
        loading="eager"
        decoding="async"
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-p-overlay to-p-elevated">
        <span class="text-3xl text-p-text-muted"><i class="bi bi-building-gear" aria-hidden="true"></i></span>
      </div>
      <div v-if="project.status === 'PUBLISHED'" class="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        Publicado
      </div>
    </div>
    <div class="flex flex-1 flex-col p-4">
      <h3 class="text-lg font-bold text-p-text">{{ project.name }}</h3>
      <p class="mt-1 font-mono text-sm text-p-text-muted">/{{ project.slug }}</p>
      <div class="mt-auto flex items-center justify-between border-t border-p-border pt-3">
        <span v-if="showDate" class="text-xs text-p-text-muted">{{ formatDate(project.createdAt) }}</span>
        <div class="flex gap-3 text-sm font-medium text-p-text-secondary">
          <span title="Leads"><i class="bi bi-people-fill" aria-hidden="true"></i> {{ project._count?.leads || 0 }}</span>
          <span title="Elementos"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> {{ project._count?.mapElements || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type ProjectCardItem = {
  name: string
  slug: string
  createdAt?: string | Date | null
  bannerImageUrl?: string | null
  status?: string | null
  _count?: {
    leads?: number
    mapElements?: number
  } | null
}

defineProps<{
  project: ProjectCardItem
  showDate?: boolean
}>()

defineEmits(['click'])

const formatDate = (d: string | Date | null | undefined) => formatDateToBrasilia(d)
</script>
