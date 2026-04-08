'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeneration } from '../generation-context';

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md';

type Phase = 'topic' | 'customize';

export default function GeneratePage() {
  const [phase, setPhase] = useState<Phase>('topic');
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [numSections, setNumSections] = useState(4);
  const [numExercises, setNumExercises] = useState(5);
  const [numQuestions, setNumQuestions] = useState(5);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { job, startGeneration } = useGeneration();
  const isGenerating = job?.status === 'running';

  function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError('A prompt is required');
      return;
    }
    setError('');
    setPhase('customize');
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleGenerate() {
    if (!topic.trim()) {
      setError('A prompt is required');
      return;
    }
    if (isGenerating) {
      setError('a topic is already generating — wait for it to finish');
      return;
    }
    setError('');

    const formData = new FormData();
    formData.append('topic', topic);
    formData.append('numSections', String(numSections));
    formData.append('numExercises', String(numExercises));
    formData.append('numQuestions', String(numQuestions));
    for (const file of files) {
      formData.append('files', file);
    }

    const started = startGeneration(formData, topic.trim());
    if (!started) {
      setError('a topic is already generating — wait for it to finish');
      return;
    }

    router.push('/dashboard');
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
                onChange={(e) => { setTopic(e.target.value); setError(''); }}
                maxLength={200}
                className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714]"
                style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
              />

              {error && (
                <p className="text-sm px-1" style={{ color: '#ca4754' }}>
                  {error}
                </p>
              )}

              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg px-4 py-3 text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
                >
                  + attach files (pdf, docx, txt, md)
                </button>

                {files.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {files.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center justify-between rounded-lg px-4 py-2 text-sm"
                        style={{ backgroundColor: '#2c2e31', color: '#d1d0c5' }}
                      >
                        <span className="truncate mr-3">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="flex-shrink-0 text-xs transition-colors hover:text-[#ca4754]"
                          style={{ color: '#646669' }}
                        >
                          remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="submit"
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
                    max={8}
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
                    max={10}
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
                    max={10}
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
                disabled={isGenerating}
                className="flex-1 rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#e2b714', color: '#323437' }}
              >
                {isGenerating ? 'a topic is already generating…' : "let's explore this!"}
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  );
}
