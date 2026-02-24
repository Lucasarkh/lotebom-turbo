<template>
  <span :class="['badge', badgeClass]">
    {{ label }}
  </span>
</template>

<script setup>
const props = defineProps({
  status: { type: String, required: true }
})

const badgeClass = computed(() => ({
  NEW: 'badge-info',
  CONTACTED: 'badge-warning',
  QUALIFIED: 'badge-primary',
  NEGOTIATING: 'badge-warning',
  RESERVATION: 'badge-warning',
  UNDER_REVIEW: 'badge-info',
  WAITING_DOCS: 'badge-warning',
  WAITING_PAYMENT: 'badge-warning',
  WON: 'badge-success',
  LOST: 'badge-danger',
  CANCELLED: 'badge-neutral',
  REVERSED: 'badge-danger',
}[props.status] || 'badge-neutral'))

const label = computed(() => ({
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  NEGOTIATING: 'Negociando',
  RESERVATION: 'Reserva Solic.',
  UNDER_REVIEW: 'Em Análise',
  WAITING_DOCS: 'Aguard. Docs',
  WAITING_PAYMENT: 'Aguard. Pagto',
  WON: 'Convertido',
  LOST: 'Perdido',
  CANCELLED: 'Cancelado',
  REVERSED: 'Estornado',
}[props.status] || props.status))
</script>
