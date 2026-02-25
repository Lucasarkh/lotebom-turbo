<template>
  <div class="kanban-board">
    <div v-for="column in columns" :key="column.status" class="kanban-column">
      <div class="column-header">
        <h3>{{ column.label }}</h3>
        <span class="badge">{{ column.leads.length }}</span>
      </div>
      <div class="column-body">
        <div 
          v-for="lead in column.leads" 
          :key="lead.id" 
          class="lead-card"
          @click="$emit('select', lead)"
        >
          <div class="card-title">{{ lead.name }}</div>
          <div class="card-meta">
            <span class="project">{{ lead.project?.name || '—' }}</span>
            <span class="date">{{ formatDateToBrasilia(lead.createdAt) }}</span>
          </div>
          <div v-if="lead.realtorLink" class="card-footer">
            👤 {{ lead.realtorLink.name }}
          </div>
          <div v-if="lead.isRecurrent" class="badge-recurrent">Recorrente</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  leads: { type: Array, required: true }
})

const columns = computed(() => {
  const statuses = [
    { status: 'NEW', label: 'Novo' },
    { status: 'CONTACTED', label: 'Em Contato' },
    { status: 'QUALIFIED', label: 'Qualificado' },
    { status: 'NEGOTIATING', label: 'Negociando' },
    { status: 'RESERVATION', label: 'Reserva' },
    { status: 'WON', label: 'Convertido' }
  ]
  
  return statuses.map(s => ({
    ...s,
    leads: props.leads.filter(l => l.status === s.status)
  }))
})
</script>

<style scoped>
.kanban-board { display: flex; gap: var(--space-4); overflow-x: auto; padding-bottom: var(--space-6); min-height: 60vh; align-items: flex-start; }
.kanban-column { min-width: 250px; width: 280px; flex-shrink: 0; background: var(--gray-100); border-radius: var(--radius-lg); display: flex; flex-direction: column; max-height: 80vh; }
.column-header { padding: var(--space-4); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--gray-200); position: sticky; top: 0; background: var(--gray-100); z-index: 10; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
.column-header h3 { font-size: 0.875rem; margin: 0; }
.column-body { padding: var(--space-3); overflow-y: auto; flex: 1; }

.lead-card { background: white; border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); box-shadow: var(--shadow-sm); cursor: pointer; transition: transform var(--transition); border: 1px solid transparent; position: relative; }
.lead-card:hover { transform: translateY(-2px); border-color: var(--primary-hover); }
.card-title { font-weight: 600; font-size: 0.9375rem; color: var(--gray-900); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--gray-500); margin-top: var(--space-2); }
.card-footer { margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px solid var(--gray-100); font-size: 0.75rem; color: var(--gray-600); }

.badge-recurrent { position: absolute; top: -6px; right: 10px; background: var(--warning); color: white; font-size: 0.625rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
</style>
