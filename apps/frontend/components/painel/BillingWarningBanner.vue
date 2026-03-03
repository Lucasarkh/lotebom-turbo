<template>
  <Transition name="slide-down">
    <div
      v-if="showBanner"
      class="billing-warning-banner"
      :class="bannerClass"
    >
      <div class="container d-flex align-items-center justify-content-between py-2">
        <div class="d-flex align-items-center gap-2">
          <i :class="iconClass"></i>
          <span>{{ message }}</span>
        </div>
        <NuxtLink to="/painel/pagamentos" class="btn btn-sm btn-light">
          Resolver
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

const bannerClass = computed(() => {
  if (isBlocked.value) return 'banner-danger';
  if (isGracePeriod.value) return 'banner-warning';
  return '';
});

const iconClass = computed(() => {
  if (isBlocked.value) return 'fas fa-ban';
  return 'fas fa-exclamation-triangle';
});

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

<style scoped>
.billing-warning-banner {
  position: sticky;
  top: 0;
  z-index: 1050;
  font-size: 0.875rem;
  font-weight: 500;
}

.banner-warning {
  background: #fff3cd;
  color: #856404;
  border-bottom: 1px solid #ffc107;
}

.banner-danger {
  background: #f8d7da;
  color: #842029;
  border-bottom: 1px solid #dc3545;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
