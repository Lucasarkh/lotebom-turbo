<template>
  <div v-if="meta.totalPages > 1" class="pagination">
    <div class="pagination-info">
      Exibindo <strong>{{ meta.itemCount }}</strong> de <strong>{{ meta.totalItems }}</strong> registros
    </div>
    <div class="pagination-actions">
      <button 
        class="pagination-btn" 
        :disabled="meta.currentPage === 1" 
        @click="changePage(meta.currentPage - 1)"
      >
        &laquo; Anterior
      </button>
      
      <div class="pagination-pages">
        <button 
          v-for="page in displayedPages" 
          :key="page" 
          class="pagination-btn" 
          :class="{ active: page === meta.currentPage }"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
      </div>

      <button 
        class="pagination-btn" 
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

<style scoped>
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) 0;
  margin-top: var(--space-4);
  border-top: 1px solid var(--gray-200);
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--gray-600);
}

.pagination-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.pagination-pages {
  display: flex;
  gap: var(--space-1);
}

.pagination-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--gray-300);
  background: white;
  color: var(--gray-700);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  cursor: pointer;
  min-width: 2.5rem;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--primary, #2563eb);
  color: var(--primary, #2563eb);
  background: var(--primary-light, #eff6ff);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn.active {
  background: var(--primary, #2563eb);
  color: white;
  border-color: var(--primary, #2563eb);
}

.pagination-pages button[disabled] {
  border: none;
  background: transparent;
  cursor: default;
}
</style>
