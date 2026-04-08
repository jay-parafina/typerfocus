'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export type GenJobStatus = 'running' | 'ready' | 'error' | 'refused';

export type GenJob = {
  id: string;
  topicLabel: string;
  status: GenJobStatus;
  startedAt: number;
  result?: { topicId: string; anyTruncated: boolean };
  error?: string;
  refusalMessage?: string;
};

type GenerationContextValue = {
  job: GenJob | null;
  startGeneration: (formData: FormData, topicLabel: string) => boolean;
  dismiss: () => void;
};

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<GenJob | null>(null);

  const startGeneration = useCallback(
    (formData: FormData, topicLabel: string) => {
      // Only one job at a time. If something is already running, refuse.
      if (job?.status === 'running') return false;

      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      setJob({
        id,
        topicLabel,
        status: 'running',
        startedAt: Date.now(),
      });

      // Fire-and-forget. The fetch must be created here in the event handler
      // (not in a useEffect) so it survives the unmount of /dashboard/generate.
      // NOTE: a hard refresh or tab close will still abort this request and the
      // user will not be notified — accepted limitation of the in-memory design.
      fetch('/api/generate', { method: 'POST', body: formData })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));

          if (data?.refused) {
            setJob({
              id,
              topicLabel,
              status: 'refused',
              startedAt: Date.now(),
              refusalMessage: data.message,
            });
            return;
          }

          if (data?.error || !res.ok) {
            setJob({
              id,
              topicLabel,
              status: 'error',
              startedAt: Date.now(),
              error: data?.error ?? 'Something went sideways — want to try again?',
            });
            return;
          }

          setJob({
            id,
            topicLabel,
            status: 'ready',
            startedAt: Date.now(),
            result: {
              topicId: data.topic.id,
              anyTruncated: Boolean(data.anyTruncated),
            },
          });
        })
        .catch(() => {
          setJob({
            id,
            topicLabel,
            status: 'error',
            startedAt: Date.now(),
            error: 'Something went sideways — want to try again?',
          });
        });

      return true;
    },
    [job],
  );

  const dismiss = useCallback(() => {
    setJob((current) => (current?.status === 'running' ? current : null));
  }, []);

  return (
    <GenerationContext.Provider value={{ job, startGeneration, dismiss }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return ctx;
}
