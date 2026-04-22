'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { PhraseDisplay } from '@/components/PhraseDisplay';
import { Quiz } from '@/components/Quiz';
import { recordPhraseResult, recordQuizResult } from '@/lib/storage';
import { Phrase, PhraseResult, QuizQuestion, QuizResult, quizPassingScore } from '@/lib/types';

interface SectionData {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  order_num: number;
  phrases: { text: string; order: number }[];
  quiz: {
    question: string;
    options: { id: string; text: string }[];
    correctOptionId: string;
  }[];
}

interface SiblingSection {
  id: string;
  title: string;
  order_num: number;
}

export default function PracticePage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = params.sectionId as string;

  const [section, setSection] = useState<SectionData | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [nextSection, setNextSection] = useState<SiblingSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: sec } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single();

      if (!sec) {
        router.push('/dashboard');
        return;
      }

      setSection(sec);

      // Get topic title
      const { data: topic } = await supabase
        .from('topics')
        .select('title')
        .eq('id', sec.topic_id)
        .single();

      if (topic) setTopicTitle(topic.title);

      // Get next section
      const { data: next } = await supabase
        .from('sections')
        .select('id, title, order_num')
        .eq('topic_id', sec.topic_id)
        .gt('order_num', sec.order_num)
        .order('order_num', { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextSection(next);
      setLoading(false);
    }

    load();
  }, [sectionId, router]);

  if (loading || !section) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#646669' }}>
        loading...
      </div>
    );
  }

  // Convert JSONB data to typed objects
  const phrases: Phrase[] = section.phrases.map((p, i) => ({
    id: `${section.id}-p${i + 1}`,
    moduleId: section.id,
    text: p.text,
    order: p.order || i + 1,
  }));

  const quiz: QuizQuestion[] | undefined =
    section.quiz && section.quiz.length > 0
      ? section.quiz.map((q, i) => ({
          id: `${section.id}-q${i + 1}`,
          moduleId: section.id,
          question: q.question,
          options: q.options.map((o, j) => ({
            id: o.id || `${section.id}-q${i + 1}-${String.fromCharCode(97 + j)}`,
            text: o.text,
          })),
          correctOptionId: q.correctOptionId,
        }))
      : undefined;

  return (
    <TypingSession
      key={sectionId}
      sectionId={section.id}
      topicId={section.topic_id}
      topicTitle={topicTitle}
      sectionTitle={section.title}
      sectionDescription={section.description}
      phrases={phrases}
      quiz={quiz}
      nextSection={nextSection}
      onEscape={() => router.push(`/dashboard/topics/${section.topic_id}`)}
      onNextSection={(id) => router.push(`/dashboard/practice/${id}`)}
      onBackToTopic={() => router.push(`/dashboard/topics/${section.topic_id}`)}
    />
  );
}

// ─── TypingSession ─────────────────────────────────────────────────────────

type PostTypingPhase = 'stats' | 'quiz' | 'passed' | 'failed';

interface TypingSessionProps {
  sectionId: string;
  topicId: string;
  topicTitle: string;
  sectionTitle: string;
  sectionDescription: string;
  phrases: Phrase[];
  quiz?: QuizQuestion[];
  nextSection: SiblingSection | null;
  onEscape: () => void;
  onNextSection: (id: string) => void;
  onBackToTopic: () => void;
}

function TypingSession({
  sectionId,
  topicTitle,
  sectionTitle,
  sectionDescription,
  phrases,
  quiz,
  nextSection,
  onEscape,
  onNextSection,
  onBackToTopic,
}: TypingSessionProps) {
  const hasQuiz = quiz != null && quiz.length > 0;

  const { state, nextPhrase, reviewPrev, reviewNext } = useTypingEngine(phrases, {
    onPhraseComplete: useCallback((result: PhraseResult) => {
      recordPhraseResult(sectionId, phrases.length, result, hasQuiz);
    }, [sectionId, phrases.length, hasQuiz]),
    onEscape,
  });

  const [postPhase, setPostPhase] = useState<PostTypingPhase>('stats');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizAttempt, setQuizAttempt] = useState(0);

  const reviewingPhrase =
    state.reviewIndex !== null ? phrases[state.reviewIndex] : null;
  const isReviewing = reviewingPhrase !== null;
  const isModuleDone = state.phraseIndex >= phrases.length && !isReviewing;
  const currentPhrase = phrases[state.phraseIndex];
  const displayedIndex = isReviewing ? (state.reviewIndex as number) : state.phraseIndex;
  const prevDisabled = isReviewing ? state.reviewIndex === 0 : state.phraseIndex === 0;

  const avgWpm = state.results.length
    ? Math.round(state.results.reduce((s, r) => s + r.wpm, 0) / state.results.length)
    : 0;
  const avgAccuracy = state.results.length
    ? Math.round(state.results.reduce((s, r) => s + r.accuracy, 0) / state.results.length)
    : 0;

  function handleQuizComplete(result: QuizResult) {
    recordQuizResult(sectionId, result);
    setQuizResult(result);
    setPostPhase(result.passed ? 'passed' : 'failed');
  }

  function handleRetryQuiz() {
    setQuizAttempt((prev) => prev + 1);
    setQuizResult(null);
    setPostPhase('quiz');
  }

  // ── Section complete: post-typing phases ─────────────────────────────
  if (isModuleDone) {
    if (postPhase === 'stats') {
      return (
        <div className="min-h-screen flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <p className="text-xs uppercase tracking-widest mb-8" style={{ color: '#646669' }}>
              typing complete
            </p>
            <h2 className="text-3xl font-light mb-2" style={{ color: '#d1d0c5' }}>
              {sectionTitle}
            </h2>
            <p className="text-sm leading-relaxed mb-14" style={{ color: '#646669' }}>
              {sectionDescription}
            </p>

            <div className="flex justify-center gap-14 mb-14">
              <StatBlock label="avg wpm" value={String(avgWpm)} />
              <StatBlock label="accuracy" value={`${avgAccuracy}%`} />
              <StatBlock label="phrases" value={String(state.results.length)} />
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
              ) : nextSection ? (
                <button
                  onClick={() => onNextSection(nextSection.id)}
                  className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#e2b714', color: '#323437' }}
                >
                  next section →
                </button>
              ) : null}
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

    if (postPhase === 'quiz' && quiz) {
      return (
        <Quiz key={quizAttempt} questions={quiz} onComplete={handleQuizComplete} />
      );
    }

    if (postPhase === 'passed' && quizResult) {
      return (
        <div className="min-h-screen flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <p className="text-xs uppercase tracking-widest mb-8" style={{ color: '#646669' }}>
              quiz passed
            </p>
            <h2 className="text-3xl font-light mb-2" style={{ color: '#d1d0c5' }}>
              {sectionTitle}
            </h2>

            <div className="flex justify-center gap-14 my-14">
              <StatBlock label="score" value={`${quizResult.score}/${quizResult.total}`} />
              <StatBlock label="avg wpm" value={String(avgWpm)} />
              <StatBlock label="accuracy" value={`${avgAccuracy}%`} />
            </div>

            {quiz && <QuizReview questions={quiz} result={quizResult} />}

            <div className="flex gap-3 justify-center mt-10">
              {nextSection && (
                <button
                  onClick={() => onNextSection(nextSection.id)}
                  className="px-6 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#e2b714', color: '#323437' }}
                >
                  next section →
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

    if (postPhase === 'failed' && quizResult) {
      return (
        <div className="min-h-screen flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <p className="text-xs uppercase tracking-widest mb-8" style={{ color: '#ca4754' }}>
              quiz not passed
            </p>
            <h2 className="text-3xl font-light mb-2" style={{ color: '#d1d0c5' }}>
              {sectionTitle}
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#646669' }}>
              You scored {quizResult.score}/{quizResult.total}. You need at least{' '}
              {quizPassingScore(quizResult.total)}/{quizResult.total} to continue.
            </p>

            <div className="flex justify-center my-14">
              <StatBlock label="score" value={`${quizResult.score}/${quizResult.total}`} color="#ca4754" />
            </div>

            {quiz && <QuizReview questions={quiz} result={quizResult} />}

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
    <div className="min-h-screen flex flex-col" style={{ userSelect: 'none', cursor: 'default' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-6">
          <button
            onClick={onEscape}
            className="text-sm transition-colors hover:text-[#d1d0c5]"
            style={{ color: '#646669' }}
          >
            ← {topicTitle}
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
          {sectionTitle}
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

      {/* Phrase counter */}
      <div className="flex justify-center pt-5">
        <span className="tabular-nums text-sm" style={{ color: '#646669' }}>
          {displayedIndex + 1} / {phrases.length}
        </span>
      </div>

      {/* Main typing area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-3xl">
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

      {/* Keyboard hints */}
      <div className="flex justify-center pb-8">
        <span className="text-xs" style={{ color: '#3d3f42' }}>
          esc — back to topic &nbsp;&nbsp;·&nbsp;&nbsp; ← prev phrase &nbsp;&nbsp;·&nbsp;&nbsp; tab + enter — restart phrase
        </span>
      </div>
    </div>
  );
}

// ─── Review view ───────────────────────────────────────────────────────────

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

// ─── Phrase-done flash ─────────────────────────────────────────────────────

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

// ─── Quiz review ───────────────────────────────────────────────────────────

function QuizReview({ questions, result }: { questions: QuizQuestion[]; result: QuizResult }) {
  const missed = questions.filter((q) => result.answers[q.id] !== q.correctOptionId);

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
          const userAnswer = q.options.find((o) => o.id === result.answers[q.id]);
          const correctAnswer = q.options.find((o) => o.id === q.correctOptionId);
          return (
            <div key={q.id}>
              <p className="text-sm mb-2" style={{ color: '#d1d0c5' }}>
                {q.question}
              </p>
              <div className="flex flex-col gap-1 ml-4">
                <div className="flex items-start gap-2 text-sm">
                  <span style={{ color: '#ca4754' }}>✗</span>
                  <span style={{ color: '#ca4754' }}>{userAnswer?.text ?? 'No answer'}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span style={{ color: '#7bc86c' }}>✓</span>
                  <span style={{ color: '#7bc86c' }}>{correctAnswer?.text ?? ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
