'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MigratePage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<{ topic: string; sections: number; errors: string[] }[]>([]);
  const [error, setError] = useState('');

  async function handleMigrate() {
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStatus('error');
        return;
      }

      setResults(data.results);
      setStatus('done');
    } catch {
      setError("Something went wrong — try again?");
      setStatus('error');
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
          migrate topics
        </h1>
        <p className="text-sm mb-8" style={{ color: '#646669' }}>
          import all 10 built-in topics into your account
        </p>

        {status === 'idle' && (
          <button
            onClick={handleMigrate}
            className="w-full rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#e2b714', color: '#323437' }}
          >
            migrate all topics
          </button>
        )}

        {status === 'loading' && (
          <p className="text-sm text-center" style={{ color: '#646669' }}>
            migrating — this may take a moment...
          </p>
        )}

        {status === 'error' && (
          <div>
            <p className="text-sm mb-4" style={{ color: '#ca4754' }}>{error}</p>
            <button
              onClick={handleMigrate}
              className="w-full rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#e2b714', color: '#323437' }}
            >
              try again
            </button>
          </div>
        )}

        {status === 'done' && (
          <div>
            <p className="text-sm mb-6" style={{ color: '#d1d0c5' }}>
              migration complete!
            </p>
            <div className="flex flex-col gap-2 mb-8">
              {results.map((r) => (
                <div
                  key={r.topic}
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{ backgroundColor: '#2c2e31' }}
                >
                  <span style={{ color: '#d1d0c5' }}>{r.topic}</span>
                  <span className="ml-2" style={{ color: r.sections > 0 ? '#e2b714' : '#646669' }}>
                    — {r.sections} sections added
                  </span>
                  {r.errors.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: '#ca4754' }}>
                      {r.errors.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#e2b714', color: '#323437' }}
            >
              go to dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
