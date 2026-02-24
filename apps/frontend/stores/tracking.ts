import { defineStore } from 'pinia';

export const useTrackingStore = defineStore('tracking', () => {
  const sessionId = useCookie<string | null>('tracking_session_id', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
  });

  const currentProjectSlug = useCookie<string | null>('tracking_project_slug', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
  });

  const utmParams = ref({
    source: null as string | null,
    medium: null as string | null,
    campaign: null as string | null,
    content: null as string | null,
    term: null as string | null,
    referrer: null as string | null,
  });

  const isInitialized = ref(false);

  const setSessionId = (id: string | null) => {
    sessionId.value = id;
  };

  const setCurrentProjectSlug = (slug: string | null) => {
    currentProjectSlug.value = slug;
  };

  const loadFromStorage = () => {
    // With useCookie, this is handled automatically on initialization
    // but we can keep it for explicit calls if needed, although it's redundant
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
