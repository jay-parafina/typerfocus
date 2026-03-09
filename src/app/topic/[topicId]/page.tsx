'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTopicById } from '@/data/content';
import { getModuleProgress } from '@/lib/storage';
import { Module, ModuleProgress, ModuleStatus, Topic } from '@/lib/types';

// ─── Status logic ──────────────────────────────────────────────────────────
// Module 1 is always available (or in-progress / complete).
// Module N unlocks only when module N-1 is complete.

function getStatus(
  mod: Module,
  progressMap: Record<string, ModuleProgress | null>,
  topic: Topic
): ModuleStatus {
  const progress = progressMap[mod.id];
  if (progress?.isComplete) return 'complete';

  if (mod.order === 1) {
    return progress ? 'in-progress' : 'available';
  }

  const prev = topic.modules.find(m => m.order === mod.order - 1);
  const prevComplete = prev ? progressMap[prev.id]?.isComplete ?? false : false;
  if (!prevComplete) return 'locked';
  return progress ? 'in-progress' : 'available';
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TopicPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const topic = getTopicById(topicId);

  const [progressMap, setProgressMap] = useState<Record<string, ModuleProgress | null>>({});

  useEffect(() => {
    if (!topic) return;
    const map: Record<string, ModuleProgress | null> = {};
    for (const mod of topic.modules) {
      map[mod.id] = getModuleProgress(mod.id);
    }
    setProgressMap(map);
  }, [topic]);

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#646669' }}>
        topic not found
      </div>
    );
  }

  const completedCount = topic.modules.filter(
    m => progressMap[m.id]?.isComplete
  ).length;

  return (
    <main className="min-h-screen flex flex-col items-center px-8 py-16">
      {/* Back */}
      <div className="w-full max-w-2xl mb-10">
        <Link
          href="/"
          className="text-sm transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
        >
          ← topics
        </Link>
      </div>

      {/* Header */}
      <div className="w-full max-w-2xl mb-3">
        <h1 className="text-3xl font-light mb-2" style={{ color: '#d1d0c5' }}>
          {topic.title}
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#646669' }}>
          {topic.description}
        </p>
      </div>

      {/* Overall topic progress bar */}
      <div className="w-full max-w-2xl mb-10">
        <div className="flex items-center gap-3 mt-4">
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: '2px', backgroundColor: '#2c2e31' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((completedCount / topic.modules.length) * 100)}%`,
                backgroundColor: '#e2b714',
              }}
            />
          </div>
          <span className="text-xs tabular-nums flex-shrink-0" style={{ color: '#646669' }}>
            {completedCount} / {topic.modules.length}
          </span>
        </div>
      </div>

      {/* Module list */}
      <div className="w-full max-w-2xl flex flex-col gap-2">
        {topic.modules.map(mod => {
          const status = getStatus(mod, progressMap, topic);
          const progress = progressMap[mod.id];
          return (
            <ModuleCard
              key={mod.id}
              mod={mod}
              status={status}
              progress={progress ?? null}
            />
          );
        })}
      </div>
    </main>
  );
}

// ─── ModuleCard ────────────────────────────────────────────────────────────

interface ModuleCardProps {
  mod: Module;
  status: ModuleStatus;
  progress: ModuleProgress | null;
}

const STATUS_COLOR: Record<ModuleStatus, string> = {
  locked:      '#3d3f42',
  available:   '#646669',
  'in-progress': '#e2b714',
  complete:    '#e2b714',
};

const STATUS_LABEL: Record<ModuleStatus, string> = {
  locked:        'locked',
  available:     'start',
  'in-progress': 'continue',
  complete:      '✓',
};

function ModuleCard({ mod, status, progress }: ModuleCardProps) {
  const isClickable = status !== 'locked';
  const phrasesDone = progress?.completedPhrases.length ?? 0;
  const phrasesTotal = mod.phrases.length;

  const inner = (
    <div
      className={[
        'rounded-lg px-5 py-4 border transition-all duration-150',
        isClickable
          ? 'border-transparent hover:border-[#4a4d51] hover:bg-[#303235]'
          : 'border-transparent opacity-40 cursor-not-allowed',
        status === 'complete' ? '!border-[#e2b71422]' : '',
      ].join(' ')}
      style={{ backgroundColor: '#2c2e31' }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: number + text */}
        <div className="flex items-start gap-4 min-w-0">
          <span
            className="text-xl font-light tabular-nums mt-0.5 w-6 flex-shrink-0"
            style={{ color: status === 'locked' ? '#3d3f42' : '#646669' }}
          >
            {mod.order}
          </span>

          <div className="min-w-0">
            <h3
              className="font-medium text-sm mb-0.5 truncate"
              style={{ color: status === 'locked' ? '#3d3f42' : status === 'available' ? '#d1d0c5' : '#e2b714' }}
            >
              {mod.title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: status === 'locked' ? '#3d3f42' : '#646669' }}>
              {mod.description}
            </p>

            {/* Per-module stats, only when there's progress */}
            {progress && (
              <div className="flex gap-3 mt-2">
                <span className="text-xs" style={{ color: '#646669' }}>
                  best&nbsp;
                  <span style={{ color: '#d1d0c5' }}>{Math.round(progress.bestWpm)} wpm</span>
                </span>
                <span className="text-xs" style={{ color: '#646669' }}>
                  acc&nbsp;
                  <span style={{ color: '#d1d0c5' }}>{Math.round(progress.averageAccuracy)}%</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: status + phrase bar */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: STATUS_COLOR[status] }}
          >
            {STATUS_LABEL[status]}
          </span>

          {/* Mini phrase-completion bar */}
          <div
            className="rounded-full overflow-hidden"
            style={{ width: '64px', height: '2px', backgroundColor: '#323437' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((phrasesDone / phrasesTotal) * 100)}%`,
                backgroundColor: status === 'complete' ? '#e2b714' : '#646669',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span className="text-xs tabular-nums" style={{ color: STATUS_COLOR[status] }}>
            {phrasesDone}/{phrasesTotal}
          </span>
        </div>
      </div>
    </div>
  );

  if (!isClickable) return <div key={mod.id}>{inner}</div>;
  return (
    <Link key={mod.id} href={`/type/${mod.id}`}>
      {inner}
    </Link>
  );
}
