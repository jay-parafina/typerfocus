'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getModuleProgress, getTopicProgress } from '@/lib/storage';

interface Section {
  id: string;
  title: string;
  description: string;
  order_num: number;
  phrases: { text: string; order: number }[];
  quiz: { question: string; options: { id: string; text: string }[]; correctOptionId: string }[];
}

interface SectionProgress {
  isComplete: boolean;
  bestWpm: number;
  averageAccuracy: number;
  phrasesComplete: boolean;
  completedPhrases: number;
  totalPhrases: number;
}

export default function TopicSections({ sections, topicId }: { sections: Section[]; topicId: string }) {
  const [progressMap, setProgressMap] = useState<Record<string, SectionProgress>>({});
  const [topicProgress, setTopicProgress] = useState({ completedModules: 0, totalModules: 0, percentComplete: 0 });

  useEffect(() => {
    const map: Record<string, SectionProgress> = {};
    for (const section of sections) {
      const progress = getModuleProgress(section.id);
      if (progress) {
        map[section.id] = {
          isComplete: progress.isComplete,
          bestWpm: progress.bestWpm,
          averageAccuracy: Math.round(progress.averageAccuracy),
          phrasesComplete: progress.phrasesComplete,
          completedPhrases: progress.completedPhrases.length,
          totalPhrases: section.phrases.length,
        };
      }
    }
    setProgressMap(map);

    const sectionIds = sections.map((s) => s.id);
    setTopicProgress(getTopicProgress(sectionIds));
  }, [sections]);

  const firstSection = sections.length > 0 ? sections[0] : null;
  const allComplete = topicProgress.percentComplete === 100 && sections.length > 0;

  return (
    <>
      {/* Overall progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: '#646669' }}>
            {topicProgress.completedModules}/{topicProgress.totalModules} sections complete
          </span>
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: allComplete ? '#e2b714' : '#646669' }}
          >
            {topicProgress.percentComplete}%
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '3px', backgroundColor: '#2c2e31' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${topicProgress.percentComplete}%`, backgroundColor: '#e2b714' }}
          />
        </div>
        {allComplete && (
          <p className="text-xs mt-2" style={{ color: '#e2b714' }}>
            topic complete — nice work!
          </p>
        )}
      </div>

      {/* Start CTA */}
      {firstSection && (
        <Link
          href={`/dashboard/practice/${firstSection.id}`}
          className="block rounded-lg px-6 py-4 text-center text-sm font-medium mb-8 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#e2b714', color: '#323437' }}
        >
          {allComplete ? 'practice again' : topicProgress.completedModules > 0 ? 'continue practicing' : 'start typing practice'}
        </Link>
      )}

      {/* Sections List */}
      <p
        className="text-xs uppercase tracking-widest mb-3"
        style={{ color: '#3d3f42' }}
      >
        sections
      </p>
      <div className="flex flex-col gap-2">
        {sections.map((section) => {
          const phraseCount = Array.isArray(section.phrases) ? section.phrases.length : 0;
          const quizCount = Array.isArray(section.quiz) ? section.quiz.length : 0;
          const progress = progressMap[section.id];
          const isComplete = progress?.isComplete ?? false;

          return (
            <Link
              key={section.id}
              href={`/dashboard/practice/${section.id}`}
              className="group block"
            >
              <div
                className="rounded-lg px-6 py-4 border transition-all duration-150 hover:border-[#4a4d51] hover:bg-[#303235]"
                style={{
                  backgroundColor: '#2c2e31',
                  borderColor: isComplete ? '#e2b714' : 'transparent',
                }}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <h3
                    className="font-medium transition-colors group-hover:text-[#e2b714]"
                    style={{ color: '#d1d0c5', fontSize: '0.95rem' }}
                  >
                    <span style={{ color: '#646669' }}>{section.order_num}.</span>{' '}
                    {section.title}
                    {isComplete && (
                      <span className="ml-2 text-xs" style={{ color: '#e2b714' }}>✓</span>
                    )}
                  </h3>
                </div>
                <p
                  className="text-xs leading-relaxed mb-2"
                  style={{ color: '#646669' }}
                >
                  {section.description}
                </p>
                <div className="flex gap-4">
                  <span className="text-xs tabular-nums" style={{ color: '#646669' }}>
                    {phraseCount} exercise{phraseCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: '#646669' }}>
                    {quizCount} question{quizCount !== 1 ? 's' : ''}
                  </span>
                  {progress && (
                    <>
                      <span className="text-xs tabular-nums" style={{ color: '#e2b714' }}>
                        {progress.bestWpm} wpm
                      </span>
                      <span className="text-xs tabular-nums" style={{ color: '#e2b714' }}>
                        {progress.averageAccuracy}% acc
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
