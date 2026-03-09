'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { chunkArticle, chunksToPhphrases, getArticleStats } from '@/lib/chunker';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { PhraseDisplay } from '@/components/PhraseDisplay';

// ─── Page ──────────────────────────────────────────────────────────────────

type View = 'input' | 'typing';

export default function ReadPage() {
  const [view, setView] = useState<View>('input');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [chunks, setChunks] = useState<string[]>([]);

  function handleStart() {
    const c = chunkArticle(rawText);
    if (c.length === 0) return;
    setChunks(c);
    setView('typing');
  }

  if (view === 'typing') {
    return (
      <ReadSession
        key={chunks[0] + chunks.length} // reset engine if chunks change
        title={title.trim() || 'Untitled'}
        chunks={chunks}
        onBack={() => setView('input')}
      />
    );
  }

  return (
    <InputView
      title={title}
      rawText={rawText}
      onTitleChange={setTitle}
      onTextChange={setRawText}
      onStart={handleStart}
    />
  );
}

// ─── InputView ─────────────────────────────────────────────────────────────

interface InputViewProps {
  title: string;
  rawText: string;
  onTitleChange: (v: string) => void;
  onTextChange: (v: string) => void;
  onStart: () => void;
}

function InputView({ title, rawText, onTitleChange, onTextChange, onStart }: InputViewProps) {
  const stats = useMemo(() => getArticleStats(rawText), [rawText]);
  const hasText = rawText.trim().length > 0;

  // Submit on Cmd/Ctrl+Enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && hasText) onStart();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hasText, onStart]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-16">
      {/* Back */}
      <div className="w-full max-w-2xl mb-10">
        <Link href="/" className="text-sm hover:text-[#d1d0c5] transition-colors" style={{ color: '#646669' }}>
          ← home
        </Link>
      </div>

      <div className="w-full max-w-2xl">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-light mb-1" style={{ color: '#d1d0c5' }}>
            Read by Typing
          </h1>
          <p className="text-sm" style={{ color: '#646669' }}>
            Paste any article or text and type through it.
          </p>
        </div>

        {/* Title field */}
        <input
          type="text"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Title (optional)"
          spellCheck={false}
          className="w-full rounded px-4 py-2 mb-3 text-sm outline-none transition-colors"
          style={{
            backgroundColor: '#2c2e31',
            color: '#d1d0c5',
            border: '1px solid transparent',
            fontFamily: 'inherit',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#646669')}
          onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
        />

        {/* Textarea */}
        <textarea
          value={rawText}
          onChange={e => onTextChange(e.target.value)}
          placeholder="Paste an article, essay, or any text you want to read by typing..."
          spellCheck={false}
          rows={12}
          className="w-full rounded px-4 py-3 text-sm outline-none resize-y transition-colors"
          style={{
            backgroundColor: '#2c2e31',
            color: '#d1d0c5',
            border: '1px solid transparent',
            fontFamily: 'inherit',
            lineHeight: '1.7',
            minHeight: '220px',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#646669')}
          onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
        />

        {/* Live stats */}
        <div
          className="flex gap-6 mt-3 mb-6 text-xs transition-opacity"
          style={{ color: '#646669', opacity: hasText ? 1 : 0 }}
        >
          <span>
            <span style={{ color: '#d1d0c5' }}>{stats.wordCount.toLocaleString()}</span> words
          </span>
          <span>
            <span style={{ color: '#d1d0c5' }}>{stats.chunkCount}</span> phrases
          </span>
          <span>
            ~<span style={{ color: '#d1d0c5' }}>{stats.estimatedMinutes}</span> min to type
          </span>
        </div>

        {/* Start button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onStart}
            disabled={!hasText}
            className="px-6 py-2 rounded text-sm font-medium transition-opacity"
            style={{
              backgroundColor: '#e2b714',
              color: '#323437',
              opacity: hasText ? 1 : 0.35,
              cursor: hasText ? 'pointer' : 'not-allowed',
            }}
          >
            Start Typing
          </button>
          <span className="text-xs" style={{ color: '#3d3f42' }}>
            or ⌘ + enter
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── ReadSession ────────────────────────────────────────────────────────────

interface ReadSessionProps {
  title: string;
  chunks: string[];
  onBack: () => void;
}

function ReadSession({ title, chunks, onBack }: ReadSessionProps) {
  const sessionStartRef = useRef(Date.now());

  const phrases = useMemo(() => chunksToPhphrases(chunks), [chunks]);

  const { state, nextPhrase } = useTypingEngine(phrases, {
    onPhraseComplete: () => {}, // read sessions aren't persisted
    onEscape: onBack,
  });

  const isComplete = state.phraseIndex >= phrases.length;
  const currentPhrase = phrases[state.phraseIndex];

  // ── Completion stats ───────────────────────────────────────────────
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

  // ── Module complete screen ─────────────────────────────────────────
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
            <StatBlock label="avg wpm"    value={String(avgWpm)} />
            <StatBlock label="accuracy"   value={`${avgAccuracy}%`} />
            <StatBlock label="words"      value={totalWords.toLocaleString()} />
            <StatBlock label="time"       value={totalTimeLabel} />
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#e2b714', color: '#323437' }}
            >
              paste another
            </button>
            <Link
              href="/"
              className="px-6 py-2 rounded text-sm border transition-colors hover:border-[#d1d0c5] hover:text-[#d1d0c5]"
              style={{ borderColor: '#646669', color: '#646669' }}
            >
              home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Typing screen ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ userSelect: 'none', cursor: 'default' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <button
          onClick={onBack}
          className="text-sm transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
        >
          ← back
        </button>
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
          {state.phraseIndex + 1} / {phrases.length}
        </span>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-3xl">
          {/* Article title — subtle, above typing area */}
          <p
            className="text-center text-xs uppercase tracking-widest mb-8"
            style={{ color: '#3d3f42' }}
          >
            {title}
          </p>

          {state.phase === 'phrase-done' ? (
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
          esc — back &nbsp;&nbsp;·&nbsp;&nbsp; tab + enter — restart phrase
        </span>
      </div>
    </div>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────────

function PhraseDoneFlash({
  wpm,
  accuracy,
  onSkip,
}: {
  wpm: number;
  accuracy: number;
  onSkip: () => void;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center gap-16 mb-6">
        <StatBlock label="wpm"      value={String(wpm)} />
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
