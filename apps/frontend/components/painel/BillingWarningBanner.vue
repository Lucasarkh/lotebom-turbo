<template>
  <Transition name="slide-down">
    <div
      v-if="showBanner"
      class="sticky top-0 z-[1050] text-sm font-medium"
      :class="isBlocked
        ? 'bg-p-danger-subtle text-p-danger border-b border-p-danger/30'
        : 'bg-p-warning-subtle text-p-warning border-b border-p-warning/30'"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between py-2 px-4">
        <div class="flex items-center gap-2">
          <svg v-if="isBlocked" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{{ message }}</span>
        </div>
        <NuxtLink to="/painel/pagamentos">
          <UiButton size="sm" variant="secondary">Resolver</UiButton>
        </NuxtLink>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useBilling } from '~/composables/useBilling';

const { status, fetchStatus, isGracePeriod, isBlocked } = useBilling();

onMounted(() => {
  fetchStatus();
});

const showBanner = computed(() => isGracePeriod.value || isBlocked.value);

const message = computed(() => {
  if (isBlocked.value)
    return 'Acesso bloqueado por inadimplência. Regularize sua situação.';
  if (isGracePeriod.value && status.value?.gracePeriodEnd) {
    const date = new Date(status.value.gracePeriodEnd).toLocaleDateString('pt-BR');
    return `Pagamento pendente. Regularize até ${date} para evitar bloqueio.`;
  }
  return '';
});
</script>
