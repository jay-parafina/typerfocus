'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { chunkArticle, chunksToPhphrases, getArticleStats } from '@/lib/chunker';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { PhraseDisplay } from '@/components/PhraseDisplay';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.txt,.md';
const CHUNK_MAX = 120; // mirrors the constant in lib/chunker.ts; recorded with each save for forward-compat

// ─── Types ──────────────────────────────────────────────────────────────────

interface SavedReadingSummary {
  id: string;
  title: string;
  phrase_count: number;
  total_chunks: number | null;
  current_chunk_index: number | null;
  last_accessed_at: string | null;
  created_at: string;
}

// ─── Main component ─────────────────────────────────────────────────────────

type View = 'input' | 'typing';

interface PendingSession {
  title: string;
  chunks: string[];
  sourceText: string;
  sourceType: 'file' | 'paste';
  sourceFilename: string | null;
}

export default function ReadByTyping({ backHref = '/', backLabel = '← home' }: { backHref?: string; backLabel?: string }) {
  const [view, setView] = useState<View>('input');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [truncationWarning, setTruncationWarning] = useState('');
  const [savedReadings, setSavedReadings] = useState<SavedReadingSummary[]>([]);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [pendingResetId, setPendingResetId] = useState<string | null>(null);

  // Detect auth state once on mount; drives both the Saved Readings section and
  // the in-session sign-in hint.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsAuthed(!!data.user));
  }, []);

  useEffect(() => {
    fetch('/api/reading-sessions')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSavedReadings)
      .catch(() => {});
  }, []);

  function handleStart(text: string, truncated: boolean, file: File | null) {
    const c = chunkArticle(text);
    if (c.length === 0) return;

    if (truncated) {
      setTruncationWarning(
        'Your file was large and has been partially used. Only the first ~20 pages were included.'
      );
    } else {
      setTruncationWarning('');
    }

    setPending({
      title: title.trim() || (file ? file.name.replace(/\.\w+$/, '') : defaultPasteTitle(text)),
      chunks: c,
      sourceText: text,
      sourceType: file ? 'file' : 'paste',
      sourceFilename: file ? file.name : null,
    });
    setView('typing');
  }

  function handleBack() {
    setTruncationWarning('');
    setPending(null);
    setView('input');
    // Refresh the saved-readings list so a just-finished session appears with
    // its updated progress.
    fetch('/api/reading-sessions')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSavedReadings)
      .catch(() => {});
  }

  async function handleConfirmReset() {
    if (!pendingResetId) return;
    const id = pendingResetId;
    setPendingResetId(null);

    try {
      const res = await fetch(`/api/reading-sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_chunk_index: 0 }),
      });
      if (!res.ok) return;
      // Optimistically update the local list so the user sees 0% before navigating.
      setSavedReadings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, current_chunk_index: 0 } : r))
      );
      window.location.href = `/dashboard/read/${id}`;
    } catch {
      /* network failure — leave list untouched */
    }
  }

  if (view === 'typing' && pending) {
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
          key={pending.chunks[0] + pending.chunks.length}
          pending={pending}
          isAuthed={isAuthed === true}
          onBack={handleBack}
          backHref={backHref}
          backLabel={backLabel}
        />
      </>
    );
  }

  return (
    <>
      {/* Saved readings — above the input, only for authed users with at least one saved reading */}
      {isAuthed && savedReadings.length > 0 && (
        <div className="w-full max-w-2xl mx-auto mb-10">
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: '#3d3f42' }}
          >
            your saved readings
          </p>
          <div className="flex flex-col gap-2">
            {savedReadings.map((r) => (
              <SavedReadingCard
                key={r.id}
                reading={r}
                onStartOver={() => setPendingResetId(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      <InputView
        title={title}
        rawText={rawText}
        onTitleChange={setTitle}
        onTextChange={setRawText}
        onStart={handleStart}
      />

      {pendingResetId && (
        <ConfirmModal
          message="This will erase your current progress. Are you sure?"
          confirmLabel="Start over"
          onConfirm={handleConfirmReset}
          onCancel={() => setPendingResetId(null)}
        />
      )}
    </>
  );
}

// ─── SavedReadingCard ──────────────────────────────────────────────────────

function SavedReadingCard({
  reading,
  onStartOver,
}: {
  reading: SavedReadingSummary;
  onStartOver: () => void;
}) {
  const total = reading.total_chunks ?? reading.phrase_count ?? 0;
  const current = reading.current_chunk_index ?? 0;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const lastAccessed = reading.last_accessed_at ?? reading.created_at;

  return (
    <div
      className="rounded-lg px-5 py-4 border border-transparent transition-colors hover:border-[#4a4d51] hover:bg-[#303235]"
      style={{ backgroundColor: '#2c2e31' }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-medium text-sm truncate mr-4" style={{ color: '#d1d0c5' }}>
          {reading.title}
        </h3>
        <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: '#646669' }}>
          {formatRelativeTime(lastAccessed)}
        </span>
      </div>

      <p className="text-xs mb-2 tabular-nums" style={{ color: '#646669' }}>
        Chunk {Math.min(current + 1, total)} of {total} · {percent}%
      </p>

      <div className="w-full mb-3" style={{ height: '2px', backgroundColor: '#1f2123' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: '#e2b714' }}
        />
      </div>

      <div className="flex gap-2">
        <Link
          href={`/dashboard/read/${reading.id}`}
          className="px-4 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#e2b714', color: '#323437' }}
        >
          Resume
        </Link>
        <button
          onClick={onStartOver}
          className="px-4 py-1.5 rounded text-xs border transition-colors hover:border-[#d1d0c5] hover:text-[#d1d0c5]"
          style={{ borderColor: '#646669', color: '#646669', backgroundColor: 'transparent' }}
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

// ─── ConfirmModal ──────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg px-6 py-5 max-w-sm w-full"
        style={{ backgroundColor: '#2c2e31', border: '1px solid #3d3f42' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm mb-5" style={{ color: '#d1d0c5' }}>
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded text-xs border transition-colors hover:border-[#d1d0c5] hover:text-[#d1d0c5]"
            style={{ borderColor: '#646669', color: '#646669', backgroundColor: 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#ca4754', color: '#fff' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── InputView ─────────────────────────────────────────────────────────────

interface InputViewProps {
  title: string;
  rawText: string;
  onTitleChange: (v: string) => void;
  onTextChange: (v: string) => void;
  onStart: (text: string, truncated: boolean, file: File | null) => void;
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
    onStart(activeText, extractedTruncated, uploadedFile);
  }, [canStart, activeText, extractedTruncated, uploadedFile, onStart]);

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
  pending: PendingSession;
  isAuthed: boolean;
  onBack: () => void;
  backHref: string;
  backLabel: string;
}

function ReadSession({ pending, isAuthed, onBack, backHref, backLabel }: ReadSessionProps) {
  const sessionStartRef = useRef(Date.now());
  const phrases = useMemo(() => chunksToPhphrases(pending.chunks), [pending.chunks]);

  // Saved-reading lifecycle:
  //  - Anonymous users: never save. activeIdRef stays null.
  //  - Authed users: on first chunk completion we POST to create the row and
  //    cache the id in a ref. Subsequent completions PATCH the row.
  //  We use a ref (not state) so the onPhraseComplete closure always sees the
  //  current id without re-registering the typing engine listener.
  const activeIdRef = useRef<string | null>(null);
  const creatingRef = useRef(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSavedFlash = useCallback(() => {
    setSavedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handlePhraseComplete = useCallback(async () => {
    if (!isAuthed) return;

    // onPhraseComplete fires once per finished phrase (on the last keypress).
    // Track our own counter — current_chunk_index = number of phrases done.
    completedRef.current += 1;
    const newIndex = completedRef.current;

    if (!activeIdRef.current && !creatingRef.current) {
      creatingRef.current = true;
      try {
        const res = await fetch('/api/reading-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pending.title,
            phrases: pending.chunks.map((text, i) => ({ text, order: i + 1 })),
            source_text: pending.sourceText,
            source_type: pending.sourceType,
            source_filename: pending.sourceFilename,
            chunk_size: CHUNK_MAX,
            current_chunk_index: newIndex,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          activeIdRef.current = data.id;
          triggerSavedFlash();
        }
      } catch (err) {
        console.error('Failed to create saved reading', err);
      } finally {
        creatingRef.current = false;
      }
      return;
    }

    if (activeIdRef.current) {
      try {
        const res = await fetch(`/api/reading-sessions/${activeIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_chunk_index: newIndex }),
        });
        if (res.ok) triggerSavedFlash();
      } catch (err) {
        console.error('Failed to update reading progress', err);
      }
    }
  }, [isAuthed, pending, triggerSavedFlash]);

  // Counter incremented each time the engine reports a completion. Mirrors
  // the engine's internal phraseIndex without coupling to its render cycle.
  const completedRef = useRef(0);

  const { state, nextPhrase } = useTypingEngine(phrases, {
    onPhraseComplete: handlePhraseComplete,
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
  const totalWords = pending.chunks.join(' ').split(/\s+/).filter(Boolean).length;
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
            {pending.title}
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

      {/* Chunk counter + saved indicator + sign-in hint */}
      <div className="flex justify-center items-center gap-3 pt-5 relative">
        <span className="tabular-nums text-sm" style={{ color: '#646669' }}>
          {state.phraseIndex + 1} / {phrases.length}
        </span>
        {isAuthed && (
          <span
            className="text-xs uppercase tracking-widest transition-opacity duration-300"
            style={{ color: '#e2b714', opacity: savedFlash ? 1 : 0 }}
          >
            saved
          </span>
        )}
        {!isAuthed && (
          <Link
            href="/login"
            className="text-xs transition-colors hover:text-[#d1d0c5]"
            style={{ color: '#646669' }}
          >
            Sign in to save your progress
          </Link>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-3xl">
          <p
            className="text-center text-xs uppercase tracking-widest mb-8"
            style={{ color: '#3d3f42' }}
          >
            {pending.title}
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function defaultPasteTitle(text: string): string {
  const trimmed = text.trim().slice(0, 40);
  return `Pasted text — ${trimmed}${text.trim().length > 40 ? '…' : ''}`;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo} month${diffMo === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
