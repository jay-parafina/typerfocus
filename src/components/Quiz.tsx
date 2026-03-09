'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { QuizQuestion, QuizOption, QuizResult, QUIZ_PASSING_SCORE } from '@/lib/types';

// Fisher-Yates shuffle (non-mutating)
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (result: QuizResult) => void;
}

export function Quiz({ questions, onComplete }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Shuffle options for each question once on mount
  const shuffledOptionsMap = useMemo(() => {
    const map: Record<string, QuizOption[]> = {};
    for (const q of questions) {
      map[q.id] = shuffleArray(q.options);
    }
    return map;
  }, [questions]);

  const currentQuestion = questions[currentIndex];
  const displayOptions = shuffledOptionsMap[currentQuestion.id] ?? currentQuestion.options;
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasSelection = selectedOption !== null;

  const handleSelect = useCallback((optionId: string) => {
    setSelectedOption(optionId);
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedOption) return;

    const updatedAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(updatedAnswers);

    if (isLastQuestion) {
      // Calculate score and finish
      let score = 0;
      for (const q of questions) {
        if (updatedAnswers[q.id] === q.correctOptionId) score++;
      }
      onComplete({
        score,
        total: questions.length,
        passed: score >= QUIZ_PASSING_SCORE,
        answers: updatedAnswers,
        timestamp: Date.now(),
      });
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
    }
  }, [selectedOption, answers, currentQuestion, isLastQuestion, questions, onComplete]);

  // Keyboard support: 1-4 to select, Enter to advance
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= displayOptions.length) {
        e.preventDefault();
        handleSelect(displayOptions[num - 1].id);
      } else if (e.key === 'Enter' && hasSelection) {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, displayOptions, handleSelect, handleNext, hasSelection]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <span className="text-xs uppercase tracking-widest" style={{ color: '#646669' }}>
          quiz
        </span>
        <span className="text-sm tabular-nums" style={{ color: '#646669' }}>
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full" style={{ height: '2px', backgroundColor: '#2c2e31' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
            backgroundColor: '#e2b714',
          }}
        />
      </div>

      {/* Question area — vertically centred */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-2xl">
          {/* Question text */}
          <p
            className="text-lg font-light leading-relaxed mb-10"
            style={{ color: '#d1d0c5' }}
          >
            {currentQuestion.question}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-10">
            {displayOptions.map((option, idx) => {
              const isSelected = selectedOption === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className="text-left rounded-lg px-5 py-4 border transition-all duration-150 flex items-start gap-4"
                  style={{
                    backgroundColor: '#2c2e31',
                    borderColor: isSelected ? '#e2b714' : 'transparent',
                    color: isSelected ? '#d1d0c5' : '#646669',
                  }}
                >
                  <span
                    className="text-xs font-medium mt-0.5 w-5 flex-shrink-0 tabular-nums"
                    style={{ color: isSelected ? '#e2b714' : '#4a4d51' }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm leading-relaxed">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next / Finish button */}
          <div className="flex justify-center">
            <button
              onClick={handleNext}
              disabled={!hasSelection}
              className="px-8 py-2.5 rounded text-sm font-medium transition-opacity"
              style={{
                backgroundColor: hasSelection ? '#e2b714' : '#3d3f42',
                color: hasSelection ? '#323437' : '#646669',
                cursor: hasSelection ? 'pointer' : 'not-allowed',
                opacity: hasSelection ? 1 : 0.5,
              }}
            >
              {isLastQuestion ? 'finish' : 'next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="flex justify-center pb-8">
        <span className="text-xs" style={{ color: '#3d3f42' }}>
          1–4 — select answer &nbsp;&nbsp;·&nbsp;&nbsp; enter — confirm
        </span>
      </div>
    </div>
  );
}
