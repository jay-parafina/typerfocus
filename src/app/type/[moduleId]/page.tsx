'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getModuleById } from '@/data/content';
import { recordPhraseResult, recordQuizResult } from '@/lib/storage';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { PhraseDisplay } from '@/components/PhraseDisplay';
import { Quiz } from '@/components/Quiz';
import { Module, PhraseResult, QuizQuestion, QuizResult, Topic } from '@/lib/types';

export default function TypePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = params.moduleId as string;

  const found = getModuleById(moduleId);

  if (!found) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#646669' }}>
        module not found
      </div>
    );
  }

  const { module, topic } = found;

  return (
    <TypingSession
      key={moduleId}
      module={module}
      topic={topic}
      onEscape={() => router.push(`/topic/${topic.id}`)}
      onNextModule={(id) => router.push(`/type/${id}`)}
      onBackToTopic={() => router.push(`/topic/${topic.id}`)}
    />
  );
}

// ─── TypingSession ─────────────────────────────────────────────────────────
// Separate component so `key={moduleId}` above fully resets the engine state
// whenever the user navigates to a different module.

type PostTypingPhase = 'stats' | 'quiz' | 'passed' | 'failed';

interface TypingSessionProps {
  module: Module;
  topic: Topic;
  onEscape: () => void;
  onNextModule: (id: string) => void;
  onBackToTopic: () => void;
}

function TypingSession({ module, topic, onEscape, onNextModule, onBackToTopic }: TypingSessionProps) {
  const phrases = module.phrases;
  const hasQuiz = module.quiz != null && module.quiz.length > 0;

  const { state, nextPhrase } = useTypingEngine(phrases, {
    onPhraseComplete: (result: PhraseResult) => {
      recordPhraseResult(module.id, phrases.length, result, hasQuiz);
    },
    onEscape,
  });

  const [postPhase, setPostPhase] = useState<PostTypingPhase>('stats');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizAttempt, setQuizAttempt] = useState(0);

  const isModuleDone = state.phraseIndex >= phrases.length;
  const currentPhrase = phrases[state.phraseIndex];

  // Aggregate stats across all completed phrases this session
  const avgWpm = state.results.length
    ? Math.round(state.results.reduce((s, r) => s + r.wpm, 0) / state.results.length)
    : 0;
  const avgAccuracy = state.results.length
    ? Math.round(state.results.reduce((s, r) => s + r.accuracy, 0) / state.results.length)
    : 0;

  const nextModule = topic.modules.find(m => m.order === module.order + 1) ?? null;

  function handleQuizComplete(result: QuizResult) {
    recordQuizResult(module.id, result);
    setQuizResult(result);
    setPostPhase(result.passed ? 'passed' : 'failed');
  }

  function handleRetryQuiz() {
    setQuizAttempt(prev => prev + 1);
    setQuizResult(null);
    setPostPhase('quiz');
  }

  // ── Module complete: post-typing phases ─────────────────────────────
  if (isModuleDone) {
    // Stats screen
    if (postPhase === 'stats') {
      return (
        <div className="min-h-screen flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <p className="text-xs uppercase tracking-widest mb-8" style={{ color: '#646669' }}>
              typing complete
            </p>
            <h2 className="text-3xl font-light mb-2" style={{ color: '#d1d0c5' }}>
              {module.title}
            </h2>
            <p className="text-sm leading-relaxed mb-14" style={{ color: '#646669' }}>
              {module.description}
            </p>

            <div className="flex justify-center gap-14 mb-14">
              <StatBlock label="avg wpm"  value={String(avgWpm)} />
              <StatBlock label="accuracy" value={`${avgAccuracy}%`} />
              <StatBlock label="phrases"  value={String(state.results.length)} />
            </div>

            <div className="flex gap-3 justify-center">
              {hasQuiz ? (
                <button
                  onClick={() => setPostPhase('quiz')}
                  className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#e2b714', color: '#323437' }}
                >
                  start quiz →
                </button>
              ) : (
                nextModule && (
                  <button
                    onClick={() => onNextModule(nextModule.id)}
                    className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: '#e2b714', color: '#323437' }}
                  >
                    next module →
                  </button>
                )
              )}
              <button
                onClick={onBackToTopic}
                className="px-6 py-2 rounded text-sm border transition-colors hover:border-[#d1d0c5] hover:text-[#d1d0c5]"
                style={{ borderColor: '#646669', color: '#646669' }}
              >
                back to topic
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Quiz screen
    if (postPhase === 'quiz' && module.quiz) {
      return (
        <Quiz
          key={quizAttempt}
          questions={module.quiz}
          onComplete={handleQuizComplete}
        />
      );
    }

    // Quiz passed
    if (postPhase === 'passed' && quizResult) {
      return (
        <div className="min-h-screen flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <p className="text-xs uppercase tracking-widest mb-8" style={{ color: '#646669' }}>
              quiz passed
            </p>
            <h2 className="text-3xl font-light mb-2" style={{ color: '#d1d0c5' }}>
              {module.title}
            </h2>

            <div className="flex justify-center gap-14 my-14">
              <StatBlock label="score" value={`${quizResult.score}/${quizResult.total}`} />
              <StatBlock label="avg wpm" value={String(avgWpm)} />
              <StatBlock label="accuracy" value={`${avgAccuracy}%`} />
            </div>

            {module.quiz && <QuizReview questions={module.quiz} result={quizResult} />}

            <div className="flex gap-3 justify-center mt-10">
              {nextModule && (
                <button
                  onClick={() => onNextModule(nextModule.id)}
                  className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#e2b714', color: '#323437' }}
                >
                  next module →
                </button>
              )}
              <button
                onClick={onBackToTopic}
                className="px-6 py-2 rounded text-sm border transition-colors hover:border-[#d1d0c5] hover:text-[#d1d0c5]"
                style={{ borderColor: '#646669', color: '#646669' }}
              >
                back to topic
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Quiz failed
    if (postPhase === 'failed' && quizResult) {
      return (
        <div className="min-h-screen flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <p className="text-xs uppercase tracking-widest mb-8" style={{ color: '#ca4754' }}>
              quiz not passed
            </p>
            <h2 className="text-3xl font-light mb-2" style={{ color: '#d1d0c5' }}>
              {module.title}
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#646669' }}>
              You scored {quizResult.score}/{quizResult.total}. You need at least 4/{quizResult.total} to continue.
            </p>

            <div className="flex justify-center my-14">
              <StatBlock
                label="score"
                value={`${quizResult.score}/${quizResult.total}`}
                color="#ca4754"
              />
            </div>

            {module.quiz && <QuizReview questions={module.quiz} result={quizResult} />}

            <div className="flex gap-3 justify-center mt-10">
              <button
                onClick={handleRetryQuiz}
                className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#e2b714', color: '#323437' }}
              >
                retry quiz
              </button>
              <button
                onClick={onBackToTopic}
                className="px-6 py-2 rounded text-sm border transition-colors hover:border-[#d1d0c5] hover:text-[#d1d0c5]"
                style={{ borderColor: '#646669', color: '#646669' }}
              >
                back to topic
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ── Typing screen ───────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ userSelect: 'none', cursor: 'default' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <button
          onClick={onEscape}
          className="text-sm transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
        >
          ← {topic.title}
        </button>
        <span className="text-sm" style={{ color: '#646669' }}>
          {module.title}
        </span>
      </div>

      {/* Module progress bar */}
      <div className="w-full" style={{ height: '2px', backgroundColor: '#2c2e31' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${(state.phraseIndex / phrases.length) * 100}%`,
            backgroundColor: '#e2b714',
          }}
        />
      </div>

      {/* Phrase counter */}
      <div className="flex justify-center pt-5">
        <span className="tabular-nums text-sm" style={{ color: '#646669' }}>
          {state.phraseIndex + 1} / {phrases.length}
        </span>
      </div>

      {/* Main typing area — vertically centred */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-3xl">
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

      {/* Keyboard hints */}
      <div className="flex justify-center pb-8">
        <span className="text-xs" style={{ color: '#3d3f42' }}>
          esc — back to topic &nbsp;&nbsp;·&nbsp;&nbsp; tab + enter — restart phrase
        </span>
      </div>
    </div>
  );
}

// ─── Phrase-done flash ─────────────────────────────────────────────────────

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

// ─── Shared stat display ───────────────────────────────────────────────────

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-4xl font-light" style={{ color: color ?? '#e2b714' }}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#646669' }}>
        {label}
      </div>
    </div>
  );
}

// ─── Quiz review: shows missed questions with correct answers ─────────────

function QuizReview({ questions, result }: { questions: QuizQuestion[]; result: QuizResult }) {
  const missed = questions.filter(q => result.answers[q.id] !== q.correctOptionId);

  if (missed.length === 0) {
    return (
      <div className="text-left max-w-lg mx-auto mt-10 mb-4">
        <p className="text-sm" style={{ color: '#646669' }}>
          You answered every question correctly.
        </p>
      </div>
    );
  }

  return (
    <div className="text-left max-w-lg mx-auto mt-10 mb-4">
      <p className="text-xs uppercase tracking-widest mb-5" style={{ color: '#646669' }}>
        review — {missed.length} incorrect
      </p>
      <div className="flex flex-col gap-6">
        {missed.map((q) => {
          const userAnswer = q.options.find(o => o.id === result.answers[q.id]);
          const correctAnswer = q.options.find(o => o.id === q.correctOptionId);
          return (
            <div key={q.id}>
              <p className="text-sm mb-2" style={{ color: '#d1d0c5' }}>
                {q.question}
              </p>
              <div className="flex flex-col gap-1 ml-4">
                <div className="flex items-start gap-2 text-sm">
                  <span style={{ color: '#ca4754' }}>✗</span>
                  <span style={{ color: '#ca4754' }}>
                    {userAnswer?.text ?? 'No answer'}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span style={{ color: '#7bc86c' }}>✓</span>
                  <span style={{ color: '#7bc86c' }}>
                    {correctAnswer?.text ?? ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
