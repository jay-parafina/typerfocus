'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Phase = 'topic' | 'customize' | 'generating';

export default function GeneratePage() {
  const [phase, setPhase] = useState<Phase>('topic');
  const [topic, setTopic] = useState('');
  const [numSections, setNumSections] = useState(4);
  const [numExercises, setNumExercises] = useState(5);
  const [numQuestions, setNumQuestions] = useState(5);
  const [error, setError] = useState('');
  const [refused, setRefused] = useState('');
  const router = useRouter();

  function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setPhase('customize');
  }

  async function handleGenerate() {
    setError('');
    setRefused('');
    setPhase('generating');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          numSections,
          numExercises,
          numQuestions,
        }),
      });

      const data = await res.json();

      if (data.refused) {
        setRefused(data.message);
        setPhase('topic');
        return;
      }

      if (data.error) {
        setError(data.error);
        setPhase('customize');
        return;
      }

      router.push(`/dashboard/topics/${data.topic.id}`);
    } catch {
      setError("Something went sideways — want to try again?");
      setPhase('customize');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-lg">
        <Link
          href="/dashboard"
          className="text-xs mb-8 inline-block transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
        >
          &larr; back to dashboard
        </Link>

        <h1
          className="font-light tracking-[0.15em] mb-2"
          style={{ fontSize: '1.75rem', color: '#e2b714' }}
        >
          generate a topic
        </h1>

        {/* Phase 1: Topic Input */}
        {phase === 'topic' && (
          <>
            <p className="text-sm mb-10" style={{ color: '#646669' }}>
              pick any topic and we&apos;ll create a full learning module for you
            </p>

            <form onSubmit={handleTopicSubmit} className="flex flex-col gap-5">
              <input
                type="text"
                placeholder="What do you want to learn about today?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                maxLength={200}
                className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714]"
                style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
              />

              {refused && (
                <p className="text-sm px-1 leading-relaxed" style={{ color: '#e2b714' }}>
                  {refused}
                </p>
              )}

              <button
                type="submit"
                disabled={!topic.trim()}
                className="w-full rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#e2b714', color: '#323437' }}
              >
                next — customize your topic
              </button>
            </form>
          </>
        )}

        {/* Phase 2: Customize */}
        {phase === 'customize' && (
          <>
            <p className="text-sm mb-2" style={{ color: '#646669' }}>
              topic:
            </p>
            <p className="text-base mb-8" style={{ color: '#d1d0c5' }}>
              {topic}
            </p>

            <p className="text-sm mb-6" style={{ color: '#646669' }}>
              customize how your topic is structured
            </p>

            <div className="flex flex-col gap-6 mb-8">
              {/* Sections */}
              <div>
                <label className="text-sm block mb-2" style={{ color: '#d1d0c5' }}>
                  number of sections
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={numSections}
                    onChange={(e) => setNumSections(Number(e.target.value))}
                    className="flex-1 accent-[#e2b714]"
                  />
                  <span
                    className="text-lg font-medium tabular-nums w-8 text-center"
                    style={{ color: '#e2b714' }}
                  >
                    {numSections}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#646669' }}>
                  each section covers a subtopic
                </p>
              </div>

              {/* Exercises per section */}
              <div>
                <label className="text-sm block mb-2" style={{ color: '#d1d0c5' }}>
                  typing exercises per section
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={numExercises}
                    onChange={(e) => setNumExercises(Number(e.target.value))}
                    className="flex-1 accent-[#e2b714]"
                  />
                  <span
                    className="text-lg font-medium tabular-nums w-8 text-center"
                    style={{ color: '#e2b714' }}
                  >
                    {numExercises}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#646669' }}>
                  short sentences you&apos;ll type to learn the material
                </p>
              </div>

              {/* Questions per section */}
              <div>
                <label className="text-sm block mb-2" style={{ color: '#d1d0c5' }}>
                  quiz questions per section
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="flex-1 accent-[#e2b714]"
                  />
                  <span
                    className="text-lg font-medium tabular-nums w-8 text-center"
                    style={{ color: '#e2b714' }}
                  >
                    {numQuestions}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#646669' }}>
                  multiple choice questions to test your knowledge
                </p>
              </div>
            </div>

            {/* Summary */}
            <div
              className="rounded-lg px-5 py-4 mb-6 text-sm"
              style={{ backgroundColor: '#2c2e31', color: '#646669' }}
            >
              this will generate {numSections} section{numSections !== 1 ? 's' : ''} with{' '}
              {numExercises} exercise{numExercises !== 1 ? 's' : ''} and{' '}
              {numQuestions} question{numQuestions !== 1 ? 's' : ''} each
            </div>

            {error && (
              <p className="text-sm px-1 mb-4" style={{ color: '#ca4754' }}>
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPhase('topic')}
                className="rounded-lg px-5 py-4 text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
              >
                back
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#e2b714', color: '#323437' }}
              >
                let&apos;s explore this!
              </button>
            </div>
          </>
        )}

        {/* Phase 3: Generating */}
        {phase === 'generating' && (
          <div className="text-center mt-10">
            <p className="text-base mb-3" style={{ color: '#d1d0c5' }}>
              generating your topic...
            </p>
            <p className="text-sm" style={{ color: '#646669' }}>
              creating {numSections} sections with {numExercises} exercises and {numQuestions} questions each — hang tight
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
