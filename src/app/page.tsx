'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { topics } from '@/data/content';
import { getTopicProgress } from '@/lib/storage';

interface TopicProgress {
  completedModules: number;
  totalModules: number;
  percentComplete: number;
}

export default function HomePage() {
  const [progressMap, setProgressMap] = useState<Record<string, TopicProgress>>({});

  useEffect(() => {
    const map: Record<string, TopicProgress> = {};
    for (const topic of topics) {
      map[topic.id] = getTopicProgress(topic.modules.map(m => m.id));
    }
    setProgressMap(map);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center px-8 py-20">
      {/* Hero */}
      <div className="mb-20 text-center">
        <h1
          className="font-light tracking-[0.3em] mb-3"
          style={{ fontSize: '2.75rem', color: '#e2b714' }}
        >
          TypeWise
        </h1>
        <p style={{ color: '#646669', fontSize: '0.9rem' }}>
          learn topics. practice typing.
        </p>
      </div>

      {/* Read by Typing card */}
      <div className="w-full max-w-xl mb-2">
        <Link href="/read" className="group block">
          <div
            className="rounded-lg px-6 py-5 border border-transparent transition-all duration-150 hover:border-[#4a4d51] hover:bg-[#303235]"
            style={{ backgroundColor: '#2c2e31' }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <h2
                className="font-medium transition-colors group-hover:text-[#e2b714]"
                style={{ color: '#d1d0c5', fontSize: '1rem' }}
              >
                Read by Typing
              </h2>
              <span className="text-xs ml-4 flex-shrink-0" style={{ color: '#646669' }}>
                /read
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#646669' }}>
              Paste any article or essay and type through it phrase by phrase.
            </p>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="w-full max-w-xl mb-2 mt-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#3d3f42' }}>
          topics
        </p>
      </div>

      {/* Topic cards */}
      <div className="w-full max-w-xl flex flex-col gap-3">
        {topics.map(topic => {
          const p = progressMap[topic.id];
          const pct = p?.percentComplete ?? 0;
          const done = p?.completedModules ?? 0;
          const total = topic.modules.length;

          return (
            <Link key={topic.id} href={`/topic/${topic.id}`} className="group block">
              <div
                className="rounded-lg px-6 py-5 border border-transparent transition-all duration-150 hover:border-[#4a4d51] hover:bg-[#303235]"
                style={{ backgroundColor: '#2c2e31' }}
              >
                {/* Title row */}
                <div className="flex items-baseline justify-between mb-1">
                  <h2
                    className="font-medium transition-colors group-hover:text-[#e2b714]"
                    style={{ color: '#d1d0c5', fontSize: '1rem' }}
                  >
                    {topic.title}
                  </h2>
                  <span
                    className="text-sm tabular-nums ml-4 flex-shrink-0"
                    style={{ color: pct === 100 ? '#e2b714' : '#646669' }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs leading-relaxed mb-4" style={{ color: '#646669' }}>
                  {topic.description}
                </p>

                {/* Progress bar + count */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ height: '2px', backgroundColor: '#323437' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: '#e2b714' }}
                    />
                  </div>
                  <span className="text-xs tabular-nums flex-shrink-0" style={{ color: '#646669' }}>
                    {done}/{total} modules
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
