import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/integrations-supabase/client';
import type { Json } from '@/integrations/integrations-supabase/types';

interface TrackEventOptions {
  module: string;
  eventType: string;
  metadata?: Record<string, Json>;
}

// Debounce tracking to avoid excessive database writes
const DEBOUNCE_MS = 500;

export function useAnalytics(module: string) {
  const lastEventRef = useRef<{ type: string; time: number } | null>(null);
  const sessionId = useRef<string>(getOrCreateSessionId());

  const trackEvent = useCallback(
    async (eventType: string, metadata?: Record<string, Json>) => {
      // Debounce rapid consecutive events of the same type
      const now = Date.now();
      if (
        lastEventRef.current &&
        lastEventRef.current.type === eventType &&
        now - lastEventRef.current.time < DEBOUNCE_MS
      ) {
        return;
      }
      lastEventRef.current = { type: eventType, time: now };

      try {
        await supabase.from('interaction_events').insert([{
          module,
          event_type: eventType,
          session_id: sessionId.current,
          metadata: (metadata || {}) as Json,
        }]);
      } catch (error) {
        // Silently fail - analytics should not break the app
        console.debug('Analytics tracking failed:', error);
      }
    },
    [module]
  );

  const trackSliderChange = useCallback(
    (parameterName: string, value: number) => {
      trackEvent('slider_change', { parameter: parameterName, value });
    },
    [trackEvent]
  );

  const trackTabChange = useCallback(
    (tabName: string) => {
      trackEvent('tab_change', { tab: tabName });
    },
    [trackEvent]
  );

  const trackButtonClick = useCallback(
    (buttonName: string) => {
      trackEvent('button_click', { button: buttonName });
    },
    [trackEvent]
  );

  const trackModelView = useCallback(() => {
    trackEvent('model_view');
  }, [trackEvent]);

  return {
    trackEvent,
    trackSliderChange,
    trackTabChange,
    trackButtonClick,
    trackModelView,
  };
}

function getOrCreateSessionId(): string {
  const storageKey = 'physiology_session_id';
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}
