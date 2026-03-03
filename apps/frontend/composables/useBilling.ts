import { useApi } from './useApi';

export interface SubscriptionFeature {
  featureCode: string;
  isActive: boolean;
  customPriceCents: number | null;
  catalogName: string;
  priceCents: number;
}

export interface SubscriptionStatus {
  tenantId: string;
  tenantName: string;
  billingStatus: 'OK' | 'GRACE_PERIOD' | 'INADIMPLENTE' | 'CANCELLED';
  stripeCustomerId: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  features: SubscriptionFeature[];
  totalMonthlyCents: number;
  gracePeriodEnd: string | null;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'boleto' | 'pix';
  brand: string;
  last4: string | null;
  expMonth?: number;
  expYear?: number;
}

export const useBilling = () => {
  const { fetchApi } = useApi();

  const status = ref<SubscriptionStatus | null>(null);
  const paymentMethods = ref<PaymentMethod[]>([]);
  const invoices = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchStatus = async () => {
    loading.value = true;
    error.value = null;
    try {
      status.value = await fetchApi('/billing/status');
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      paymentMethods.value = await fetchApi('/billing/payment-methods');
    } catch (e: any) {
      error.value = e.message;
    }
  };

  const fetchInvoices = async () => {
    try {
      invoices.value = await fetchApi('/billing/invoices');
    } catch (e: any) {
      error.value = e.message;
    }
  };

  const openCheckout = async (successUrl?: string, cancelUrl?: string) => {
    try {
      const result = await fetchApi('/billing/checkout', {
        method: 'POST',
        body: { successUrl, cancelUrl },
      });
      if (result?.url) {
        window.location.href = result.url;
      }
      return result;
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  };

  const openPortal = async () => {
    try {
      const result = await fetchApi('/billing/portal', { method: 'POST' });
      if (result?.url) {
        window.location.href = result.url;
      }
      return result;
    } catch (e: any) {
      error.value = e.message;
      throw e;
    }
  };

  // Check billing warning headers on any API response
  const billingWarning = ref<string | null>(null);

  const checkBillingHeaders = (headers: Headers) => {
    const warning = headers.get('X-Billing-Warning');
    if (warning) {
      billingWarning.value = warning;
    }
  };

  // Computed helpers
  const totalFormatted = computed(() => {
    if (!status.value) return 'R$ 0,00';
    return formatCents(status.value.totalMonthlyCents);
  });

  const nextDueDate = computed(() => {
    if (!status.value?.subscription?.currentPeriodEnd) return null;
    return new Date(status.value.subscription.currentPeriodEnd);
  });

  const nextDueDateFormatted = computed(() => {
    if (!nextDueDate.value) return '—';
    return nextDueDate.value.toLocaleDateString('pt-BR');
  });

  const isGracePeriod = computed(
    () => status.value?.billingStatus === 'GRACE_PERIOD',
  );

  const isBlocked = computed(
    () =>
      status.value?.billingStatus === 'INADIMPLENTE' ||
      status.value?.billingStatus === 'CANCELLED',
  );

  const activeFeatures = computed(
    () => status.value?.features.filter((f) => f.isActive) || [],
  );

  return {
    // State
    status,
    paymentMethods,
    invoices,
    loading,
    error,
    billingWarning,

    // Actions
    fetchStatus,
    fetchPaymentMethods,
    fetchInvoices,
    openCheckout,
    openPortal,
    checkBillingHeaders,

    // Computed
    totalFormatted,
    nextDueDate,
    nextDueDateFormatted,
    isGracePeriod,
    isBlocked,
    activeFeatures,
  };
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
