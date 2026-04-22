'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { chunksToPhphrases } from '@/lib/chunker';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { PhraseDisplay } from '@/components/PhraseDisplay';

interface ReadingSession {
  id: string;
  title: string;
  phrases: { text: string; order: number }[];
  phrase_count: number;
}

export default function ReadPracticePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('reading_sessions')
        .select('id, title, phrases, phrase_count')
        .eq('id', sessionId)
        .single();

      if (!data) {
        router.push('/dashboard');
        return;
      }

      setSession(data);
      setLoading(false);
    }

    load();
  }, [sessionId, router]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#646669' }}>
        loading...
      </div>
    );
  }

  const chunks = session.phrases.map((p) => p.text);

  return (
    <ReadSession
      key={sessionId}
      title={session.title}
      chunks={chunks}
      onBack={() => router.push('/dashboard')}
    />
  );
}

// ─── ReadSession (self-contained for this page) ─────────────────────────────

function ReadSession({ title, chunks, onBack }: { title: string; chunks: string[]; onBack: () => void }) {
  const sessionStartRef = useRef(Date.now());
  const phrases = useMemo(() => chunksToPhphrases(chunks), [chunks]);

  const { state, nextPhrase, reviewPrev, reviewNext } = useTypingEngine(phrases, {
    onPhraseComplete: () => {},
    onEscape: onBack,
  });

  const reviewingPhrase =
    state.reviewIndex !== null ? phrases[state.reviewIndex] : null;
  const isReviewing = reviewingPhrase !== null;
  const isComplete = state.phraseIndex >= phrases.length && !isReviewing;
  const currentPhrase = phrases[state.phraseIndex];
  const displayedIndex = isReviewing ? (state.reviewIndex as number) : state.phraseIndex;
  const prevDisabled = isReviewing ? state.reviewIndex === 0 : state.phraseIndex === 0;

  const avgWpm = state.results.length
    ? Math.round(state.results.reduce((s, r) => s + r.wpm, 0) / state.results.length)
    : 0;
  const avgAccuracy = state.results.length
    ? Math.round(state.results.reduce((s, r) => s + r.accuracy, 0) / state.results.length)
    : 0;
  const totalWords = chunks.join(' ').split(/\s+/).filter(Boolean).length;
  const totalSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
  const totalTimeLabel =
    totalSeconds < 60
      ? `${totalSeconds}s`
      : `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <p className="text-xs uppercase tracking-widest mb-6" style={{ color: '#646669' }}>
            article complete
          </p>
          <h2 className="text-2xl font-light mb-12" style={{ color: '#d1d0c5' }}>
            {title}
          </h2>

          <div className="flex justify-center gap-10 mb-14 flex-wrap">
            <StatBlock label="avg wpm" value={String(avgWpm)} />
            <StatBlock label="accuracy" value={`${avgAccuracy}%`} />
            <StatBlock label="words" value={totalWords.toLocaleString()} />
            <StatBlock label="time" value={totalTimeLabel} />
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#e2b714', color: '#323437' }}
            >
              back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ userSelect: 'none', cursor: 'default' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="text-sm transition-colors hover:text-[#d1d0c5]"
            style={{ color: '#646669' }}
          >
            ← back
          </button>
          <button
            onClick={reviewPrev}
            disabled={prevDisabled}
            aria-label="Review previous phrase"
            aria-keyshortcuts="ArrowLeft"
            className="text-sm transition-colors hover:text-[#d1d0c5] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: '#646669' }}
          >
            ◀ prev phrase
          </button>
        </div>
        <span className="text-sm" style={{ color: '#646669' }}>
          read by typing
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full" style={{ height: '2px', backgroundColor: '#2c2e31' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${(state.phraseIndex / phrases.length) * 100}%`,
            backgroundColor: '#e2b714',
          }}
        />
      </div>

      {/* Chunk counter */}
      <div className="flex justify-center pt-5">
        <span className="tabular-nums text-sm" style={{ color: '#646669' }}>
          {displayedIndex + 1} / {phrases.length}
        </span>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-3xl">
          <p
            className="text-center text-xs uppercase tracking-widest mb-8"
            style={{ color: '#3d3f42' }}
          >
            {title}
          </p>

          {reviewingPhrase ? (
            <ReviewView
              text={reviewingPhrase.text}
              reviewIndex={state.reviewIndex as number}
              total={phrases.length}
              onResume={reviewNext}
            />
          ) : state.phase === 'phrase-done' ? (
            <PhraseDoneFlash
              wpm={state.phraseWpm}
              accuracy={state.phraseAccuracy}
              onSkip={nextPhrase}
            />
          ) : (
            <PhraseDisplay
              text={currentPhrase.text}
              typedAt={state.typedAt}
              cursorPos={state.cursorPos}
              cursorKey={state.cursorKey}
            />
          )}
        </div>
      </div>

      {/* Hints */}
      <div className="flex justify-center pb-8">
        <span className="text-xs" style={{ color: '#3d3f42' }}>
          esc — back &nbsp;&nbsp;·&nbsp;&nbsp; ← prev phrase &nbsp;&nbsp;·&nbsp;&nbsp; tab + enter — restart phrase
        </span>
      </div>
    </div>
  );
}

function ReviewView({
  text,
  reviewIndex,
  total,
  onResume,
}: {
  text: string;
  reviewIndex: number;
  total: number;
  onResume: () => void;
}) {
  return (
    <div className="text-center">
      <div
        role="status"
        aria-live="polite"
        className="text-xs uppercase tracking-widest mb-6"
        style={{ color: '#e2b714' }}
      >
        reviewing phrase {reviewIndex + 1} of {total}
      </div>
      <p
        className="content-text text-center mb-8"
        style={{ fontSize: '1.5rem', lineHeight: '2.2rem', color: '#d1d0c5' }}
      >
        {text}
      </p>
      <button
        onClick={onResume}
        aria-label="Resume typing"
        aria-keyshortcuts="ArrowRight"
        className="text-sm transition-colors hover:text-[#d1d0c5]"
        style={{ color: '#646669' }}
      >
        resume →
      </button>
    </div>
  );
}

function PhraseDoneFlash({ wpm, accuracy, onSkip }: { wpm: number; accuracy: number; onSkip: () => void }) {
  return (
    <div className="text-center">
      <div className="flex justify-center gap-16 mb-6">
        <StatBlock label="wpm" value={String(wpm)} />
        <StatBlock label="accuracy" value={`${accuracy}%`} />
      </div>
      <button
        onClick={onSkip}
        className="text-sm transition-colors hover:text-[#d1d0c5]"
        style={{ color: '#646669' }}
      >
        next phrase in 1.5 s &nbsp;·&nbsp; enter to skip
      </button>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-4xl font-light" style={{ color: '#e2b714' }}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#646669' }}>
        {label}
      </div>
    </div>
  );
}
