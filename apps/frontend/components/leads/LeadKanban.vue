<template>
  <div class="flex gap-4 overflow-x-auto pb-6 min-h-[60vh] items-start">
    <div v-for="column in columns" :key="column.status" class="min-w-[250px] w-[280px] shrink-0 bg-p-raised rounded-xl flex flex-col max-h-[80vh]">
      <div class="p-4 flex justify-between items-center border-b border-p-border sticky top-0 bg-p-raised z-10 rounded-t-xl">
        <h3 class="text-sm m-0 text-p-text">{{ column.label }}</h3>
        <UiBadge>{{ column.leads.length }}</UiBadge>
      </div>
      <div class="p-3 overflow-y-auto flex-1">
        <div
          v-for="lead in column.leads"
          :key="lead.id"
          class="bg-p-elevated rounded-lg p-4 mb-3 shadow-md cursor-pointer transition-transform duration-150 border border-p-border relative hover:-translate-y-0.5 hover:border-p-accent"
          @click="$emit('select', lead)"
        >
          <div class="font-semibold text-[0.9375rem] text-p-text line-clamp-2">{{ lead.name }}</div>
          <div class="flex justify-between text-xs text-p-text-muted mt-2">
            <span>{{ lead.project?.name || '—' }}</span>
            <span>{{ formatDateToBrasilia(lead.createdAt) }}</span>
          </div>
          <div v-if="lead.realtorLink" class="mt-3 pt-2 border-t border-p-border text-xs text-p-text-secondary">
            <i class="bi bi-person-fill" aria-hidden="true"></i> {{ lead.realtorLink.name }}
          </div>
          <span v-if="lead.isRecurrent" class="absolute -top-1.5 right-2.5 bg-amber-500 text-white text-[0.625rem] font-bold px-1.5 py-0.5 rounded shadow-sm">Recorrente</span>
          <span v-if="lead.aiChatTranscript" class="absolute -top-1.5 right-20 bg-indigo-500 text-white text-[0.625rem] font-bold px-1.5 py-0.5 rounded shadow-sm">IA</span>
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
