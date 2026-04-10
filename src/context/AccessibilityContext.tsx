'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FontPreference } from '@/types/accessibility';

const STORAGE_KEY = 'typerfocus_font_preference';

interface AccessibilityContextValue {
  fontPreference: FontPreference;
  setFontPreference: (pref: FontPreference) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  fontPreference: 'default',
  setFontPreference: () => {},
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontPreference, setFontPrefState] = useState<FontPreference>('default');

  // Load preference on mount
  useEffect(() => {
    // Read from localStorage first for instant render
    const stored = localStorage.getItem(STORAGE_KEY) as FontPreference | null;
    if (stored === 'opendyslexic') setFontPrefState(stored);

    // Then try to load from Supabase profile
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('font_preference')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.font_preference) {
            const pref = data.font_preference as FontPreference;
            setFontPrefState(pref);
            localStorage.setItem(STORAGE_KEY, pref);
          }
        });
    });
  }, []);

  // Apply data-font attribute to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontPreference);
  }, [fontPreference]);

  const setFontPreference = useCallback((pref: FontPreference) => {
    // Optimistic update
    setFontPrefState(pref);
    localStorage.setItem(STORAGE_KEY, pref);

    // Persist to Supabase
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .upsert({ id: user.id, font_preference: pref, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.error('Failed to save font preference:', error);
        });
    });
  }, []);

  return (
    <AccessibilityContext.Provider value={{ fontPreference, setFontPreference }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
