import { defineStore } from 'pinia';

export const useTrackingStore = defineStore('tracking', () => {
  const sessionId = ref<string | null>(null);
  const currentProjectSlug = ref<string | null>(null);
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
      if (id) {
        localStorage.setItem('tracking_session_id', id);
      } else {
        localStorage.removeItem('tracking_session_id');
      }
    }
  };

  const setCurrentProjectSlug = (slug: string | null) => {
    currentProjectSlug.value = slug;
    if (process.client) {
      if (slug) {
        localStorage.setItem('tracking_project_slug', slug);
      } else {
        localStorage.removeItem('tracking_project_slug');
      }
    }
  };

  const loadFromStorage = () => {
    if (process.client) {
      const stored = localStorage.getItem('tracking_session_id');
      if (stored) sessionId.value = stored;
      
      const storedSlug = localStorage.getItem('tracking_project_slug');
      if (storedSlug) currentProjectSlug.value = storedSlug;
    }
  };

  return {
    sessionId,
    currentProjectSlug,
    utmParams,
    isInitialized,
    setSessionId,
    setCurrentProjectSlug,
    loadFromStorage,
  };
});
