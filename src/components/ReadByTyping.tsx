'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { chunkArticle, chunksToPhphrases, getArticleStats } from '@/lib/chunker';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { PhraseDisplay } from '@/components/PhraseDisplay';
import Link from 'next/link';

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.txt,.md';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SavedSession {
  id: string;
  title: string;
  phrase_count: number;
  created_at: string;
}

// ─── Main component ─────────────────────────────────────────────────────────

type View = 'input' | 'typing';

export default function ReadByTyping({ backHref = '/', backLabel = '← home' }: { backHref?: string; backLabel?: string }) {
  const [view, setView] = useState<View>('input');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [chunks, setChunks] = useState<string[]>([]);
  const [truncationWarning, setTruncationWarning] = useState('');
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    fetch('/api/reading-sessions')
      .then((res) => res.ok ? res.json() : [])
      .then(setSavedSessions)
      .catch(() => {});
  }, []);

  async function handleStart(text: string, truncated: boolean) {
    const c = chunkArticle(text);
    if (c.length === 0) return;
    setChunks(c);

    if (truncated) {
      setTruncationWarning(
        'Your file was large and has been partially used. Only the first ~20 pages were included.'
      );
    }

    // Save to Supabase
    try {
      const phrases = c.map((text, i) => ({ text, order: i + 1 }));
      const res = await fetch('/api/reading-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || 'Untitled', phrases }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSessions((prev) => [
          { id: data.id, title: title.trim() || 'Untitled', phrase_count: c.length, created_at: new Date().toISOString() },
          ...prev,
        ]);
      }
    } catch {
      // Non-blocking — session still works even if save fails
    }

    setView('typing');
  }

  function handleBack() {
    setTruncationWarning('');
    setView('input');
  }

  if (view === 'typing') {
    return (
      <>
        {truncationWarning && (
          <div
            className="w-full max-w-3xl mx-auto mb-4 rounded-lg px-5 py-4 text-sm"
            style={{ backgroundColor: '#2c2e31', color: '#e2b714', border: '1px solid #e2b714' }}
          >
            {truncationWarning}
          </div>
        )}
        <ReadSession
          key={chunks[0] + chunks.length}
          title={title.trim() || 'Untitled'}
          chunks={chunks}
          onBack={handleBack}
          backHref={backHref}
          backLabel={backLabel}
        />
      </>
    );
  }

  return (
    <>
      <InputView
        title={title}
        rawText={rawText}
        onTitleChange={setTitle}
        onTextChange={setRawText}
        onStart={handleStart}
      />

      {/* Saved reading sessions */}
      {savedSessions.length > 0 && (
        <div className="w-full max-w-2xl mx-auto mt-10">
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: '#3d3f42' }}
          >
            saved readings
          </p>
          <div className="flex flex-col gap-2">
            {savedSessions.map((s) => (
              <ReadingSessionCard
                key={s.id}
                session={s}
                onDeleted={() => setSavedSessions((prev) => prev.filter((x) => x.id !== s.id))}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── ReadingSessionCard ────────────────────────────────────────────────────

function ReadingSessionCard({ session, onDeleted }: { session: SavedSession; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    const res = await fetch(`/api/reading-sessions/${session.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  return (
    <div className="group relative">
      <Link
        href={`/dashboard/read/${session.id}`}
        className="block"
      >
        <div
          className="rounded-lg px-5 py-4 border border-transparent transition-all duration-150 hover:border-[#4a4d51] hover:bg-[#303235]"
          style={{ backgroundColor: '#2c2e31' }}
        >
          <div className="flex items-baseline justify-between">
            <h3
              className="font-medium text-sm transition-colors group-hover:text-[#e2b714] truncate mr-4"
              style={{ color: '#d1d0c5' }}
            >
              {session.title}
            </h3>
            <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: '#646669' }}>
              {session.phrase_count} phrases
            </span>
          </div>
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); handleDelete(); }}
        onBlur={() => setConfirming(false)}
        className="absolute top-3 right-24 text-xs px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100"
        style={{
          color: confirming ? '#323437' : '#646669',
          backgroundColor: confirming ? '#ca4754' : 'transparent',
        }}
      >
        {confirming ? 'confirm' : 'delete'}
      </button>
    </div>
  );
}

// ─── InputView ─────────────────────────────────────────────────────────────

interface InputViewProps {
  title: string;
  rawText: string;
  onTitleChange: (v: string) => void;
  onTextChange: (v: string) => void;
  onStart: (text: string, truncated: boolean) => void;
}

function InputView({ title, rawText, onTitleChange, onTextChange, onStart }: InputViewProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [extractedTruncated, setExtractedTruncated] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeText = uploadedFile ? extractedText : rawText;
  const stats = useMemo(() => getArticleStats(activeText), [activeText]);
  const hasText = activeText.trim().length > 0;
  const canStart = hasText && !extracting;

  const handleStartClick = useCallback(() => {
    if (!canStart) return;
    onStart(activeText, extractedTruncated);
  }, [canStart, activeText, extractedTruncated, onStart]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canStart) handleStartClick();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canStart, handleStartClick]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploadedFile(file);
    setExtractError('');
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      setExtractedText(data.text);
      setExtractedTruncated(data.truncated);
      if (!title) onTitleChange(data.source.replace(/\.\w+$/, ''));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Failed to extract file');
      setUploadedFile(null);
      setExtractedText('');
      setExtractedTruncated(false);
    } finally {
      setExtracting(false);
    }
  }

  function handleRemoveFile() {
    setUploadedFile(null);
    setExtractedText('');
    setExtractedTruncated(false);
    setExtractError('');
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Heading */}
      <div className="mb-8">
        <h2 className="text-2xl font-light mb-1" style={{ color: '#d1d0c5' }}>
          Read by Typing
        </h2>
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

      {/* File upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileSelected}
        className="hidden"
      />

      {uploadedFile ? (
        /* Uploaded file indicator */
        <div
          className="flex items-center justify-between rounded px-4 py-3 mb-3 text-sm"
          style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
        >
          <span className="truncate mr-3">
            {extracting ? 'Extracting...' : uploadedFile.name}
          </span>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="flex-shrink-0 text-xs transition-colors hover:text-[#ca4754]"
            style={{ color: '#646669' }}
          >
            remove
          </button>
        </div>
      ) : (
        <>
          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded px-4 py-3 mb-3 text-sm text-left transition-all hover:opacity-90"
            style={{ backgroundColor: '#2c2e31', color: '#646669', border: '1px solid transparent' }}
          >
            + upload a file (pdf, docx, txt, md)
          </button>

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
        </>
      )}

      {extractError && (
        <p className="text-sm mt-2 mb-2" style={{ color: '#ca4754' }}>
          {extractError}
        </p>
      )}

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
          onClick={handleStartClick}
          disabled={!canStart}
          className="px-6 py-2 rounded text-sm font-medium transition-opacity"
          style={{
            backgroundColor: '#e2b714',
            color: '#323437',
            opacity: canStart ? 1 : 0.35,
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}
        >
          Start Typing
        </button>
        <span className="text-xs" style={{ color: '#3d3f42' }}>
          or ⌘ + enter
        </span>
      </div>
    </div>
  );
}

// ─── ReadSession ────────────────────────────────────────────────────────────

interface ReadSessionProps {
  title: string;
  chunks: string[];
  onBack: () => void;
  backHref: string;
  backLabel: string;
}

function ReadSession({ title, chunks, onBack, backHref, backLabel }: ReadSessionProps) {
  const sessionStartRef = useRef(Date.now());

  const phrases = useMemo(() => chunksToPhphrases(chunks), [chunks]);

  const { state, nextPhrase } = useTypingEngine(phrases, {
    onPhraseComplete: () => {},
    onEscape: onBack,
  });

  const isComplete = state.phraseIndex >= phrases.length;
  const currentPhrase = phrases[state.phraseIndex];

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
            <a
              href={backHref}
              className="px-6 py-2 rounded text-sm border transition-colors hover:border-[#d1d0c5] hover:text-[#d1d0c5]"
              style={{ borderColor: '#646669', color: '#646669' }}
            >
              {backLabel}
            </a>
          </div>
        </div>
      </div>
    );
  }

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
