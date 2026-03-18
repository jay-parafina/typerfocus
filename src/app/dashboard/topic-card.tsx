'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTopicProgress } from '@/lib/storage';

interface TopicCardProps {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  sectionIds: string[];
}

export default function TopicCard({ id, title, description, createdAt, sectionIds }: TopicCardProps) {
  const [progress, setProgress] = useState({ completedModules: 0, totalModules: 0, percentComplete: 0 });

  useEffect(() => {
    setProgress(getTopicProgress(sectionIds));
  }, [sectionIds]);

  const pct = progress.percentComplete;
  const allComplete = pct === 100 && sectionIds.length > 0;

  return (
    <Link href={`/dashboard/topics/${id}`} className="group block">
      <div
        className="rounded-lg px-6 py-4 border transition-all duration-150 hover:border-[#4a4d51] hover:bg-[#303235]"
        style={{
          backgroundColor: '#2c2e31',
          borderColor: allComplete ? '#e2b714' : 'transparent',
        }}
      >
        <div className="flex items-baseline justify-between mb-1">
          <h3
            className="font-medium transition-colors group-hover:text-[#e2b714] truncate mr-4"
            style={{ color: '#d1d0c5', fontSize: '0.95rem' }}
          >
            {title}
            {allComplete && (
              <span className="ml-2 text-xs" style={{ color: '#e2b714' }}>✓</span>
            )}
          </h3>
          <span
            className="text-sm tabular-nums flex-shrink-0"
            style={{ color: allComplete ? '#e2b714' : '#646669' }}
          >
            {pct}%
          </span>
        </div>
        <div className="flex items-baseline justify-between mb-3">
          <p
            className="text-xs leading-relaxed truncate mr-4"
            style={{ color: '#646669' }}
          >
            {description}
          </p>
          <span
            className="text-xs flex-shrink-0 tabular-nums"
            style={{ color: '#646669' }}
          >
            {progress.completedModules}/{progress.totalModules} sections
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '2px', backgroundColor: '#323437' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: '#e2b714' }}
          />
        </div>
      </div>
    </Link>
  );
}
