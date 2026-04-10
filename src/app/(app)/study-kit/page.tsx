'use client';

import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useReadAloud } from '@/hooks/useReadAloud';
import { Cursor } from '@/components/Cursor';
import type { StudyKitData } from '@/types/study-kit';

// ─── Constants ────────────────────────────────────────────────────────────────

type Step = 'config' | 'loading' | 'guide' | 'typing' | 'quiz';
type DepthPreset = 'quick' | 'standard' | 'deep' | 'custom';

const PRESETS: Record<Exclude<DepthPreset, 'custom'>, { sections: number; exercises: number; quizzes: number }> = {
  quick:    { sections: 3, exercises: 1, quizzes: 0 },
  standard: { sections: 5, exercises: 3, quizzes: 3 },
  deep:     { sections: 8, exercises: 6, quizzes: 5 },
};

const TEAL = '#2dd4bf';
const RED = '#ca4754';
const AMBER = '#e2b714';
const DIM = '#646669';
const SURFACE = '#2c2e31';
const TEXT = '#d1d0c5';

interface ExerciseResult {
  wpm: number;
  accuracy: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudyKitPage() {
  // ── Shared state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('config');
  const [error, setError] = useState('');
  const [guideData, setGuideData] = useState<StudyKitData | null>(null);

  // ── Config state ──────────────────────────────────────────────────────────
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<DepthPreset>('standard');
  const [sectionCount, setSectionCount] = useState(5);
  const [exerciseCount, setExerciseCount] = useState(3);
  const [quizCount, setQuizCount] = useState(3);
  const [studyGuideEnabled, setStudyGuideEnabled] = useState(true);
  const [readAloudEnabled, setReadAloudEnabled] = useState(true);

  // ── Typing state ──────────────────────────────────────────────────────────
  const [currentExercise, setCurrentExercise] = useState(0);
  const [exerciseResults, setExerciseResults] = useState<(ExerciseResult | null)[]>([]);
  const [charResults, setCharResults] = useState<('correct' | 'wrong' | null)[]>([]);
  const [cursorPos, setCursorPos] = useState(0);
  const [cursorKey, setCursorKey] = useState(0);
  const totalKeystrokesRef = useRef(0);
  const wrongKeystrokesRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const typingInputRef = useRef<HTMLInputElement>(null);

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [quizStep, setQuizStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ selected: number; correct: boolean }[]>([]);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { speak, stop, isPlaying } = useReadAloud();

  // ── Helpers ───────────────────────────────────────────────────────────────

  function applyPreset(preset: Exclude<DepthPreset, 'custom'>) {
    setDepth(preset);
    setSectionCount(PRESETS[preset].sections);
    setExerciseCount(PRESETS[preset].exercises);
    setQuizCount(PRESETS[preset].quizzes);
  }

  function handleStepperChange(setter: (v: number) => void, value: number) {
    setter(value);
    setDepth('custom');
  }

  function initTypingState(exerciseIndex: number) {
    if (!guideData) return;
    const passage = guideData.typing_exercises[exerciseIndex]?.passage ?? '';
    setCurrentExercise(exerciseIndex);
    setCharResults(new Array(passage.length).fill(null));
    setCursorPos(0);
    setCursorKey(0);
    totalKeystrokesRef.current = 0;
    wrongKeystrokesRef.current = 0;
    startTimeRef.current = null;
  }

  function startTyping() {
    setExerciseResults(new Array(guideData!.typing_exercises.length).fill(null));
    initTypingState(0);
    setStep('typing');
  }

  function startQuiz() {
    setQuizStep(0);
    setSelectedOption(null);
    setRevealed(false);
    setQuizAnswers([]);
    setStep('quiz');
  }

  // ── Generate handler ──────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!topic.trim()) {
      setError('Enter a topic to generate a study kit.');
      return;
    }
    setError('');
    setStep('loading');

    try {
      const res = await fetch('/api/generate-study-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          sectionCount,
          exerciseCount,
          quizCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data: StudyKitData = await res.json();
      setGuideData(data);

      // Save to Supabase (non-blocking)
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('study_kits').insert({
          user_id: user.id,
          topic: topic.trim(),
          depth,
          section_count: sectionCount,
          exercise_count: exerciseCount,
          quiz_count: quizCount,
          guide_data: data,
        });
      }

      setStep('guide');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('config');
    }
  }

  // ── PDF export ────────────────────────────────────────────────────────────

  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    if (!guideData) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideData, topic }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}-study-guide.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export PDF — try again.');
    } finally {
      setExporting(false);
    }
  }

  // ── Typing keyboard handler ───────────────────────────────────────────────

  const handleTypingKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!guideData) return;
      const passage = guideData.typing_exercises[currentExercise]?.passage ?? '';
      const done = exerciseResults[currentExercise] != null;
      if (done) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        setCursorPos((prev) => {
          if (prev <= 0) return prev;
          setCharResults((cr) => {
            const next = [...cr];
            next[prev - 1] = null;
            return next;
          });
          setCursorKey((k) => k + 1);
          return prev - 1;
        });
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();

      if (!startTimeRef.current) startTimeRef.current = Date.now();
      totalKeystrokesRef.current += 1;

      const isCorrect = e.key === passage[cursorPos];
      if (!isCorrect) wrongKeystrokesRef.current += 1;

      setCharResults((prev) => {
        const next = [...prev];
        next[cursorPos] = isCorrect ? 'correct' : 'wrong';
        return next;
      });

      const newPos = cursorPos + 1;
      setCursorPos(newPos);
      setCursorKey((k) => k + 1);

      // Exercise complete?
      if (newPos >= passage.length) {
        const elapsed = (Date.now() - startTimeRef.current!) / 60_000;
        const wpm = elapsed > 0 ? Math.round((passage.length / 5) / elapsed) : 0;
        const accuracy = totalKeystrokesRef.current > 0
          ? Math.round(((totalKeystrokesRef.current - wrongKeystrokesRef.current) / totalKeystrokesRef.current) * 100)
          : 100;
        setExerciseResults((prev) => {
          const next = [...prev];
          next[currentExercise] = { wpm, accuracy };
          return next;
        });
      }
    },
    [guideData, currentExercise, cursorPos, exerciseResults],
  );

  // Focus typing input when entering typing step or switching exercises
  useEffect(() => {
    if (step === 'typing') {
      setTimeout(() => typingInputRef.current?.focus(), 50);
    }
  }, [step, currentExercise]);

  // ─── CONFIG VIEW ──────────────────────────────────────────────────────────

  if (step === 'config') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-lg">
          <h1 className="font-light tracking-[0.15em] mb-2" style={{ fontSize: '1.75rem', color: AMBER }}>
            study kit
          </h1>
          <p className="text-sm mb-8" style={{ color: DIM }}>
            generate a complete learning loop: read, practice, validate
          </p>

          {/* Topic */}
          <input
            type="text"
            placeholder="What do you want to study?"
            value={topic}
            onChange={(e) => { setTopic(e.target.value); setError(''); }}
            maxLength={200}
            className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714] mb-6"
            style={{ backgroundColor: SURFACE, color: TEXT, border: `1px solid #3d3f42` }}
          />

          {/* Depth presets */}
          <p className="text-sm mb-3" style={{ color: TEXT }}>depth</p>
          <div className="flex gap-2 mb-6">
            {(['quick', 'standard', 'deep'] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className="flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: depth === p ? AMBER : SURFACE,
                  color: depth === p ? '#323437' : TEXT,
                  border: `1px solid ${depth === p ? AMBER : '#3d3f42'}`,
                }}
              >
                {p}
              </button>
            ))}
            {depth === 'custom' && (
              <span className="flex-1 rounded-lg px-3 py-2.5 text-sm font-medium text-center" style={{ backgroundColor: SURFACE, color: AMBER, border: `1px solid ${AMBER}` }}>
                custom
              </span>
            )}
          </div>

          {/* Steppers */}
          <div className="flex flex-col gap-4 mb-6">
            <Stepper label="Sections" value={sectionCount} min={1} max={10} onChange={(v) => handleStepperChange(setSectionCount, v)} />
            <Stepper label="Exercises" value={exerciseCount} min={1} max={10} onChange={(v) => handleStepperChange(setExerciseCount, v)} />
            <Stepper label="Quiz questions" value={quizCount} min={0} max={10} onChange={(v) => handleStepperChange(setQuizCount, v)} />
          </div>

          {/* Preview bar */}
          <div className="rounded-lg px-5 py-3 text-sm mb-6" style={{ backgroundColor: SURFACE, color: DIM }}>
            {sectionCount} section{sectionCount !== 1 ? 's' : ''} · {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''} · {quizCount} quiz question{quizCount !== 1 ? 's' : ''}
          </div>

          {/* Feature toggles */}
          <div className="flex gap-4 mb-8">
            <Toggle label="Study guide" checked={studyGuideEnabled} onChange={setStudyGuideEnabled} />
            <Toggle label="Read-aloud" checked={readAloudEnabled} onChange={setReadAloudEnabled} />
          </div>

          {error && <p className="text-sm mb-4 px-1" style={{ color: RED }}>{error}</p>}

          <button
            onClick={handleGenerate}
            className="w-full rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: AMBER, color: '#323437' }}
          >
            generate study kit
          </button>
        </div>
      </main>
    );
  }

  // ─── LOADING VIEW ─────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-8">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-6"
            style={{ borderColor: `${AMBER} transparent transparent transparent` }}
          />
          <p className="text-sm" style={{ color: DIM }}>generating your study kit...</p>
        </div>
      </main>
    );
  }

  // ─── GUIDE VIEW ───────────────────────────────────────────────────────────

  if (step === 'guide' && guideData) {
    const allText = [guideData.overview, ...guideData.sections.map((s) => s.body)].join('. ');

    function handleReadAloud() {
      if (isPlaying) { stop(); return; }
      const selection = window.getSelection()?.toString().trim();
      speak(selection || allText);
    }

    return (
      <main className="min-h-screen flex flex-col items-center px-8 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: SURFACE, color: TEXT }}>
              {topic}
            </span>
            <span className="text-xs" style={{ color: DIM }}>{depth}</span>
            <button
              onClick={() => { stop(); setStep('config'); }}
              className="ml-auto text-xs transition-colors hover:text-[#d1d0c5]"
              style={{ color: DIM }}
            >
              &larr; new kit
            </button>
          </div>

          {/* Read-aloud bar */}
          {readAloudEnabled && (
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 mb-8" style={{ backgroundColor: SURFACE, border: '1px solid #3d3f42' }}>
              <button
                onClick={handleReadAloud}
                className="rounded px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: AMBER, color: '#323437' }}
              >
                {isPlaying ? '■ Stop' : '▶ Play'}
              </button>
              <span className="text-xs" style={{ color: DIM }}>
                {isPlaying ? 'reading aloud...' : 'select text or press play to listen'}
              </span>
            </div>
          )}

          {/* Guide content */}
          <h2 className="text-2xl font-light mb-4" style={{ color: TEXT, fontFamily: 'Georgia, serif' }}>
            {guideData.title}
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: TEXT }}>
            {guideData.overview}
          </p>

          {/* Key concepts */}
          <div className="flex flex-wrap gap-2 mb-8">
            {guideData.key_concepts.map((c, i) => (
              <span key={i} className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: SURFACE, color: TEAL }}>
                {c}
              </span>
            ))}
          </div>

          {/* Sections */}
          {studyGuideEnabled && guideData.sections.map((section, i) => (
            <div key={i} className="mb-6">
              <h3 className="text-sm font-medium mb-2" style={{ color: TEXT }}>
                {i + 1}. {section.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: DIM }}>{section.body}</p>
            </div>
          ))}

          {/* PDF export bar */}
          <div className="flex items-center justify-between rounded-lg px-5 py-4 mt-8 mb-4" style={{ backgroundColor: SURFACE, border: '1px solid #3d3f42' }}>
            <span className="text-sm" style={{ color: DIM }}>export study guide as PDF</span>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: AMBER, color: '#323437' }}
            >
              {exporting ? 'exporting...' : 'download'}
            </button>
          </div>

          {error && <p className="text-sm mb-4 px-1" style={{ color: RED }}>{error}</p>}

          {/* Start typing CTA */}
          <button
            onClick={startTyping}
            className="w-full rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90 mt-4"
            style={{ backgroundColor: TEAL, color: '#1a1a1a' }}
          >
            start typing exercises &rarr;
            <span className="ml-2 text-sm opacity-70">({guideData.typing_exercises.length} exercise{guideData.typing_exercises.length !== 1 ? 's' : ''})</span>
          </button>
        </div>
      </main>
    );
  }

  // ─── TYPING VIEW ──────────────────────────────────────────────────────────

  if (step === 'typing' && guideData) {
    const exercises = guideData.typing_exercises;
    const passage = exercises[currentExercise]?.passage ?? '';
    const exerciseDone = exerciseResults[currentExercise] != null;
    const allDone = exerciseResults.every((r) => r != null);
    const hasQuiz = (guideData.quiz?.length ?? 0) > 0;

    // Live stats
    const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 60_000 : 0;
    const liveWpm = elapsed > 0 ? Math.round((cursorPos / 5) / elapsed) : 0;
    const liveAccuracy = totalKeystrokesRef.current > 0
      ? Math.round(((totalKeystrokesRef.current - wrongKeystrokesRef.current) / totalKeystrokesRef.current) * 100)
      : 100;
    const liveProgress = passage.length > 0 ? Math.round((cursorPos / passage.length) * 100) : 0;

    return (
      <main className="min-h-screen flex flex-col px-8 py-12">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header */}
          <button
            onClick={() => { setStep('guide'); stop(); }}
            className="text-xs mb-6 transition-colors hover:text-[#d1d0c5]"
            style={{ color: DIM }}
          >
            &larr; back to guide
          </button>

          {/* Progress dots */}
          <div className="flex gap-2 mb-6">
            {exercises.map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full transition-colors"
                style={{ backgroundColor: exerciseResults[i] != null ? TEAL : (i === currentExercise ? AMBER : '#3d3f42') }}
              />
            ))}
          </div>

          {/* Exercise tabs */}
          <div className="flex gap-1 mb-8 overflow-x-auto">
            {exercises.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i !== currentExercise) {
                    if (exerciseResults[i] != null) {
                      setCurrentExercise(i);
                    } else {
                      initTypingState(i);
                    }
                  }
                }}
                className="rounded-lg px-3 py-2 text-xs whitespace-nowrap transition-all"
                style={{
                  backgroundColor: i === currentExercise ? SURFACE : 'transparent',
                  color: i === currentExercise ? TEXT : DIM,
                  border: i === currentExercise ? '1px solid #3d3f42' : '1px solid transparent',
                }}
              >
                {ex.title}
              </button>
            ))}
          </div>

          {exerciseDone ? (
            /* ── Completion card ────────────────────────────────────────── */
            <div className="rounded-lg px-8 py-10 text-center" style={{ backgroundColor: SURFACE, border: '1px solid #3d3f42' }}>
              <p className="text-xs mb-4" style={{ color: TEAL }}>exercise complete</p>
              <div className="flex justify-center gap-8 mb-8">
                <div>
                  <p className="text-3xl font-light" style={{ color: TEXT }}>{exerciseResults[currentExercise]!.wpm}</p>
                  <p className="text-xs mt-1" style={{ color: DIM }}>wpm</p>
                </div>
                <div>
                  <p className="text-3xl font-light" style={{ color: TEXT }}>{exerciseResults[currentExercise]!.accuracy}%</p>
                  <p className="text-xs mt-1" style={{ color: DIM }}>accuracy</p>
                </div>
              </div>
              {!allDone ? (
                <button
                  onClick={() => {
                    const next = exerciseResults.findIndex((r) => r == null);
                    if (next !== -1) initTypingState(next);
                  }}
                  className="rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: AMBER, color: '#323437' }}
                >
                  next exercise &rarr;
                </button>
              ) : hasQuiz ? (
                <button
                  onClick={startQuiz}
                  className="rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL, color: '#1a1a1a' }}
                >
                  take knowledge check &rarr;
                </button>
              ) : (
                <button
                  onClick={() => setStep('config')}
                  className="rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: AMBER, color: '#323437' }}
                >
                  finish study kit
                </button>
              )}
            </div>
          ) : (
            /* ── Typing interface ───────────────────────────────────────── */
            <>
              {/* Hidden input */}
              <input
                ref={typingInputRef}
                type="text"
                className="absolute opacity-0 pointer-events-none"
                style={{ position: 'absolute', left: '-9999px' }}
                onKeyDown={handleTypingKeyDown}
                autoFocus
                value=""
                onChange={() => {}}
              />

              {/* Passage display */}
              <div
                className="rounded-lg px-6 py-6 mb-6 leading-relaxed cursor-text select-none"
                style={{ backgroundColor: SURFACE, border: '1px solid #3d3f42', fontSize: 0 }}
                onClick={() => typingInputRef.current?.focus()}
              >
                {passage.split('').map((char, i) => {
                  const result = charResults[i];
                  const isCursor = i === cursorPos && !exerciseDone;

                  let charStyle: React.CSSProperties = { color: DIM };
                  if (result === 'correct') charStyle = { color: TEAL };
                  else if (result === 'wrong') charStyle = { backgroundColor: RED, color: '#fff', borderRadius: '2px' };

                  return (
                    <Fragment key={i}>
                      {isCursor && <Cursor key={`c-${cursorKey}`} />}
                      <span style={{ ...charStyle, fontSize: '1.25rem', fontFamily: "'JetBrains Mono', monospace" }}>
                        {char}
                      </span>
                    </Fragment>
                  );
                })}
                {cursorPos >= passage.length && !exerciseDone && <Cursor key={`c-${cursorKey}`} />}
              </div>

              {/* Live stats */}
              <div className="flex gap-6 text-sm" style={{ color: DIM }}>
                <span><strong style={{ color: TEXT }}>{liveWpm}</strong> wpm</span>
                <span><strong style={{ color: TEXT }}>{liveAccuracy}%</strong> accuracy</span>
                <span><strong style={{ color: TEXT }}>{liveProgress}%</strong> progress</span>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ─── QUIZ VIEW ────────────────────────────────────────────────────────────

  if (step === 'quiz' && guideData?.quiz) {
    const questions = guideData.quiz;
    const isFinished = quizAnswers.length === questions.length;

    if (isFinished) {
      const correct = quizAnswers.filter((a) => a.correct).length;
      const total = questions.length;
      const pct = Math.round((correct / total) * 100);
      const message = pct >= 80 ? 'excellent work!' : pct >= 60 ? 'good job — review what you missed.' : 'keep studying — you\'ll get there.';

      return (
        <main className="min-h-screen flex flex-col items-center justify-center px-8">
          <div className="w-full max-w-md text-center">
            <p className="text-xs mb-2" style={{ color: TEAL }}>knowledge check complete</p>
            <p className="text-5xl font-light mb-2" style={{ color: TEXT }}>{pct}%</p>
            <p className="text-sm mb-2" style={{ color: DIM }}>{correct} correct · {total - correct} incorrect</p>
            <p className="text-sm mb-10" style={{ color: TEXT }}>{message}</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={startQuiz}
                className="w-full rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: AMBER, color: '#323437' }}
              >
                retake quiz
              </button>
              <button
                onClick={() => setStep('guide')}
                className="w-full rounded-lg px-5 py-3 text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: SURFACE, color: TEXT, border: '1px solid #3d3f42' }}
              >
                review guide
              </button>
              <button
                onClick={() => { setGuideData(null); setStep('config'); }}
                className="w-full rounded-lg px-5 py-3 text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: SURFACE, color: TEXT, border: '1px solid #3d3f42' }}
              >
                new topic
              </button>
            </div>
          </div>
        </main>
      );
    }

    const q = questions[quizStep];

    return (
      <main className="min-h-screen flex flex-col px-8 py-12">
        <div className="w-full max-w-lg mx-auto">
          {/* Header */}
          <button
            onClick={() => setStep('typing')}
            className="text-xs mb-6 transition-colors hover:text-[#d1d0c5]"
            style={{ color: DIM }}
          >
            &larr; back to exercises
          </button>

          {/* Progress dots */}
          <div className="flex gap-2 mb-8">
            {questions.map((_, i) => {
              const answered = quizAnswers[i];
              let bg = '#3d3f42';
              if (answered?.correct) bg = TEAL;
              else if (answered && !answered.correct) bg = RED;
              else if (i === quizStep) bg = AMBER;
              return <div key={i} className="w-3 h-3 rounded-full transition-colors" style={{ backgroundColor: bg }} />;
            })}
          </div>

          {/* Question */}
          <p className="text-base mb-6 leading-relaxed" style={{ color: TEXT }}>{q.question}</p>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-8">
            {q.options.map((opt, i) => {
              let bg = SURFACE;
              let border = '#3d3f42';
              let textColor = TEXT;

              if (revealed) {
                if (i === q.answer) { bg = TEAL; textColor = '#1a1a1a'; border = TEAL; }
                else if (i === selectedOption) { bg = RED; textColor = '#fff'; border = RED; }
              } else if (i === selectedOption) {
                border = AMBER;
              }

              return (
                <button
                  key={i}
                  onClick={() => { if (!revealed) setSelectedOption(i); }}
                  className="rounded-lg px-5 py-3 text-sm text-left transition-all"
                  style={{ backgroundColor: bg, color: textColor, border: `1px solid ${border}` }}
                  disabled={revealed}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Submit / Next */}
          {!revealed ? (
            <button
              onClick={() => {
                if (selectedOption == null) return;
                setRevealed(true);
                setQuizAnswers((prev) => [...prev, { selected: selectedOption, correct: selectedOption === q.answer }]);
              }}
              disabled={selectedOption == null}
              className="w-full rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: AMBER, color: '#323437' }}
            >
              submit
            </button>
          ) : (
            <button
              onClick={() => {
                setQuizStep((s) => s + 1);
                setSelectedOption(null);
                setRevealed(false);
              }}
              className="w-full rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: AMBER, color: '#323437' }}
            >
              {quizStep < questions.length - 1 ? 'next question →' : 'see results'}
            </button>
          )}
        </div>
      </main>
    );
  }

  // Fallback
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stepper({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: TEXT }}>{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ backgroundColor: SURFACE, color: TEXT, border: '1px solid #3d3f42' }}
        >
          −
        </button>
        <span className="text-sm tabular-nums w-6 text-center" style={{ color: AMBER }}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ backgroundColor: SURFACE, color: TEXT, border: '1px solid #3d3f42' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all"
      style={{
        backgroundColor: checked ? SURFACE : 'transparent',
        color: checked ? TEXT : DIM,
        border: `1px solid ${checked ? '#3d3f42' : 'transparent'}`,
      }}
    >
      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: checked ? TEAL : '#3d3f42' }} />
      {label}
    </button>
  );
}
