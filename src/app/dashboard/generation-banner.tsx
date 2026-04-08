'use client';

import Link from 'next/link';
import { useGeneration } from './generation-context';

export default function GenerationBanner() {
  const { job, dismiss } = useGeneration();

  if (!job) return null;

  if (job.status === 'running') {
    return (
      <div
        className="w-full max-w-xl mx-auto mb-6 rounded-lg px-5 py-3 text-sm flex items-center gap-3"
        style={{
          backgroundColor: '#2c2e31',
          color: '#e2b714',
          border: '1px solid #3d3f42',
        }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: '#e2b714' }}
        />
        <span className="truncate">
          generating &ldquo;{job.topicLabel}&rdquo;… you can keep using the app
        </span>
      </div>
    );
  }

  if (job.status === 'ready' && job.result) {
    return (
      <div
        className="w-full max-w-xl mx-auto mb-6 rounded-lg px-5 py-3 text-sm flex items-center gap-3"
        style={{
          backgroundColor: '#2c2e31',
          color: '#a3be8c',
          border: '1px solid #a3be8c',
        }}
      >
        <span className="flex-1 truncate">
          &ldquo;{job.topicLabel}&rdquo; is ready
          {job.result.anyTruncated ? ' (some sources were truncated)' : ''}
        </span>
        <Link
          href={`/dashboard/topics/${job.result.topicId}`}
          onClick={dismiss}
          className="text-xs px-3 py-1 rounded transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#a3be8c', color: '#323437' }}
        >
          open
        </Link>
        <button
          onClick={dismiss}
          className="text-xs transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
          aria-label="dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  if (job.status === 'refused') {
    return (
      <div
        className="w-full max-w-xl mx-auto mb-6 rounded-lg px-5 py-3 text-sm flex items-center gap-3"
        style={{
          backgroundColor: '#2c2e31',
          color: '#e2b714',
          border: '1px solid #e2b714',
        }}
      >
        <span className="flex-1 leading-relaxed">
          {job.refusalMessage ?? 'That topic was refused.'}
        </span>
        <button
          onClick={dismiss}
          className="text-xs transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
          aria-label="dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  if (job.status === 'error') {
    return (
      <div
        className="w-full max-w-xl mx-auto mb-6 rounded-lg px-5 py-3 text-sm flex items-center gap-3"
        style={{
          backgroundColor: '#2c2e31',
          color: '#ca4754',
          border: '1px solid #ca4754',
        }}
      >
        <span className="flex-1">
          generating &ldquo;{job.topicLabel}&rdquo; failed: {job.error}
        </span>
        <button
          onClick={dismiss}
          className="text-xs transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
          aria-label="dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}
