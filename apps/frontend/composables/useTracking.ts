import { useTrackingStore } from '../stores/tracking';
import { usePublicApi } from './usePublicApi';

export const useTracking = () => {
  const store = useTrackingStore();
  const api = usePublicApi();
  const route = useRoute();

  const initTracking = async (params: { 
    tenantId?: string; 
    projectId?: string;
    tenantSlug?: string;
    projectSlug?: string;
    realtorCode?: string;
  }) => {
    if (store.isInitialized) return;

    store.loadFromStorage();
    
    // If we already have a session ID from storage, we don't need to create a new one
    // This prevents creating a new session record on every page reload
    if (store.sessionId) {
      store.isInitialized = true;
      return;
    }
    
    const query = route.query;
    const utms = {
      utmSource: query.utm_source as string,
      utmMedium: query.utm_medium as string,
      utmCampaign: query.utm_campaign as string,
      utmContent: query.utm_content as string,
      utmTerm: query.utm_term as string,
      realtorCode: params.realtorCode || (query.c as string),
      referrer: document.referrer || undefined,
    };

    try {
      const response = await api.post('/tracking/session', {
        ...params,
        ...utms,
      });

      if (response && response.id) {
        store.setSessionId(response.id);
        store.isInitialized = true;
      }
    } catch (error) {
      console.error('Failed to init tracking', error);
    }
  };

  const trackEvent = async (event: {
    type: string;
    category?: string;
    action?: string;
    label?: string;
    value?: number;
    metadata?: any;
    path?: string;
  }) => {
    if (!store.sessionId) return;

    try {
      await api.post('/tracking/event', {
        sessionId: store.sessionId,
        ...event,
        path: event.path || route.fullPath,
      });
    } catch (error) {
      // Fail silently to not disrupt the user
      // console.error('Failed to track event', error);
    }
  };

  const trackPageView = (params?: { category?: string; label?: string; path?: string }) => {
    return trackEvent({
      type: 'PAGE_VIEW',
      ...params,
    });
  };

  const trackLotClick = (lotCode: string, metadata?: any) => {
    return trackEvent({
      type: 'CLICK',
      category: 'LOT',
      action: 'VIEW_DETAILS',
      label: lotCode,
      metadata,
    });
  };

  const trackRealtorClick = (realtorName: string, realtorCode: string) => {
    return trackEvent({
      type: 'CLICK',
      category: 'REALTOR_LINK',
      action: 'OPEN_LINK',
      label: `${realtorName} (${realtorCode})`,
    });
  };

  const trackToolUse = (toolName: string, action: string = 'USE') => {
    return trackEvent({
      type: 'TOOL_USE',
      category: 'MAP_TOOL',
      action: action,
      label: toolName,
    });
  };

  const trackClick = (label: string, category: string = 'GENERAL_CLICK') => {
    return trackEvent({
      type: 'CLICK',
      category,
      label,
    });
  };

  return {
    initTracking,
    trackEvent,
    trackPageView,
    trackLotClick,
    trackRealtorClick,
    trackToolUse,
    trackClick,
  };
};
