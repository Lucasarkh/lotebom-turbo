<template>
  <div v-if="meta.totalPages > 1" class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-p-border pt-4 sm:flex-row">
    <div class="text-sm text-p-text-secondary">
      Exibindo <strong class="text-p-text">{{ meta.itemCount }}</strong> de <strong class="text-p-text">{{ meta.totalItems }}</strong> registros
    </div>
    <div class="flex items-center gap-2">
      <button
        class="rounded-lg border border-p-border bg-p-elevated px-3 py-2 text-sm text-p-text-secondary transition-colors hover:border-p-accent hover:text-p-accent disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="meta.currentPage === 1"
        @click="changePage(meta.currentPage - 1)"
      >
        &laquo; Anterior
      </button>

      <div class="flex gap-1">
        <button
          v-for="page in displayedPages"
          :key="page"
          class="min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          :class="page === meta.currentPage
            ? 'border-p-accent bg-p-accent text-white'
            : 'border-p-border bg-p-elevated text-p-text-secondary hover:border-p-accent hover:text-p-accent'"
          :disabled="typeof page !== 'number'"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
      </div>

      <button
        class="rounded-lg border border-p-border bg-p-elevated px-3 py-2 text-sm text-p-text-secondary transition-colors hover:border-p-accent hover:text-p-accent disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="meta.currentPage === meta.totalPages"
        @click="changePage(meta.currentPage + 1)"
      >
        Próximo &raquo;
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  meta: {
    type: Object,
    required: true,
    default: () => ({
      totalItems: 0,
      itemCount: 0,
      itemsPerPage: 10,
      totalPages: 0,
      currentPage: 1
    })
  }
})

const emit = defineEmits(['change'])

const changePage = (page) => {
  if (typeof page !== 'number') return
  if (page >= 1 && page <= props.meta.totalPages && page !== props.meta.currentPage) {
    emit('change', page)
  }
}

const displayedPages = computed(() => {
  const total = props.meta.totalPages
  const current = props.meta.currentPage
  const delta = 2
  const range = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) range.push(i)
    return range
  }

  range.push(1)

  if (current > delta + 2) {
    range.push('...')
  }

  const start = Math.max(2, current - delta)
  const end = Math.min(total - 1, current + delta)

  for (let i = start; i <= end; i++) {
    range.push(i)
  }

  if (current < total - delta - 1) {
    range.push('...')
  }

  range.push(total)

  return range
})
</script>
