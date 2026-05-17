<template>
  <div class="max-w-[800px]">
    <!-- Loading -->
    <UiLoadingState v-if="loading" text="Carregando assinatura..." />

    <!-- Error -->
    <UiAlert v-else-if="error" variant="error">
      {{ error }}
    </UiAlert>

    <!-- Content -->
    <div v-else-if="status" class="space-y-4">
      <!-- Billing Warning Banner -->
      <UiAlert v-if="isGracePeriod" variant="warning" title="Pagamento pendente">
        <p class="text-sm">
          Regularize o pagamento até
          <strong>{{ gracePeriodFormatted }}</strong> para evitar o bloqueio.
        </p>
      </UiAlert>

      <!-- Blocked Banner -->
      <UiAlert v-if="isBlocked" variant="error" title="Acesso bloqueado por inadimplência">
        <p class="text-sm">
          Entre em contato com o suporte para regularizar sua situação.
        </p>
      </UiAlert>

      <!-- Summary Card -->
      <UiCard>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center md:border-r border-p-border">
            <div class="text-xs text-p-text-muted">Valor Mensal</div>
            <div class="text-2xl font-bold text-p-accent mt-1">{{ totalFormatted }}</div>
          </div>
          <div class="text-center md:border-r border-p-border">
            <div class="text-xs text-p-text-muted">Próximo Vencimento</div>
            <div class="text-lg font-semibold text-p-text mt-1">{{ nextDueDateFormatted }}</div>
          </div>
          <div class="text-center md:border-r border-p-border">
            <div class="text-xs text-p-text-muted">Status</div>
            <div class="mt-1">
              <UiBadge :variant="statusBadgeVariant" size="md">{{ statusLabel }}</UiBadge>
            </div>
          </div>
          <div class="text-center">
            <div class="text-xs text-p-text-muted">Projetos</div>
            <div class="text-lg font-semibold text-p-text mt-1">{{ status.activeProjectCount }} / {{ status.maxProjects }}</div>
          </div>
        </div>
      </UiCard>

      <!-- Active Projects -->
      <UiCard padding="none">
        <div class="flex justify-between items-center px-4 py-3 border-b border-p-border bg-p-raised/50 rounded-t-xl">
          <h6 class="text-sm font-semibold text-p-text m-0">Projetos Cobrados</h6>
          <UiBadge variant="primary">{{ (status.projects || []).length }} projeto(s)</UiBadge>
        </div>
        <UiTable>
          <template #head>
            <th class="px-4 py-3 text-left text-xs font-medium text-p-text-muted uppercase tracking-wider">Projeto</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-p-text-muted uppercase tracking-wider">Tier</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-p-text-muted uppercase tracking-wider">Valor/mês</th>
          </template>
          <tr v-for="proj in (status.projects || [])" :key="proj.projectId" class="hover:bg-p-overlay/50 transition-colors">
            <td class="px-4 py-3 text-sm text-p-text">
              {{ proj.projectName }}
            </td>
            <td class="px-4 py-3 text-center">
              <UiBadge v-if="proj.isFree" variant="success">Grátis</UiBadge>
              <UiBadge v-else variant="primary">#{{ proj.tierNumber }}</UiBadge>
            </td>
            <td class="px-4 py-3 text-right text-sm text-p-text">
              <template v-if="proj.isFree">R$ 0,00</template>
              <template v-else>{{ formatCents(proj.effectivePriceCents) }}</template>
            </td>
          </tr>
          <tr v-if="!(status.projects || []).length">
            <td colspan="3" class="px-4 py-8 text-center text-sm text-p-text-muted">
              Nenhum projeto cobrável
            </td>
          </tr>
        </UiTable>
      </UiCard>

      <!-- Actions -->
      <div class="flex gap-2">
        <UiButton variant="outline" @click="openPortal">
          Gerenciar Pagamento
        </UiButton>
        <UiButton variant="secondary" @click="fetchStatus">
          Atualizar
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBilling } from '~/composables/useBilling';

const {
  status,
  loading,
  error,
  fetchStatus,
  openPortal,
  totalFormatted,
  nextDueDateFormatted,
  isGracePeriod,
  isBlocked,
} = useBilling();

onMounted(() => {
  fetchStatus();
});

const gracePeriodFormatted = computed(() => {
  if (!status.value?.gracePeriodEnd) return '';
  return new Date(status.value.gracePeriodEnd).toLocaleDateString('pt-BR');
});

const statusLabel = computed(() => {
  if (!status.value) return '';
  const map: Record<string, string> = {
    OK: 'Em dia',
    GRACE_PERIOD: 'Pendente',
    INADIMPLENTE: 'Inadimplente',
    CANCELLED: 'Cancelado',
  };
  return map[status.value.billingStatus] || status.value.billingStatus;
});

const statusBadgeVariant = computed(() => {
  if (!status.value) return 'neutral' as const;
  const map: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    OK: 'success',
    GRACE_PERIOD: 'warning',
    INADIMPLENTE: 'danger',
    CANCELLED: 'neutral',
  };
  return map[status.value.billingStatus] || 'neutral';
});

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
</script>
