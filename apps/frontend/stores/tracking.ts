import { defineStore } from 'pinia';

export const useTrackingStore = defineStore('tracking', () => {
  const sessionId = ref<string | null>(null);
  const utmParams = ref({
    source: null as string | null,
    medium: null as string | null,
    campaign: null as string | null,
    content: null as string | null,
    term: null as string | null,
    referrer: null as string | null,
  });

  const isInitialized = ref(false);

  const setSessionId = (id: string) => {
    sessionId.value = id;
    if (process.client) {
      localStorage.setItem('tracking_session_id', id);
    }
  };

  const loadFromStorage = () => {
    if (process.client) {
      const stored = localStorage.getItem('tracking_session_id');
      if (stored) sessionId.value = stored;
    }
  };

  return {
    sessionId,
    utmParams,
    isInitialized,
    setSessionId,
    loadFromStorage,
  };
});
