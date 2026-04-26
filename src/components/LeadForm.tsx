'use client';

import { useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function LeadForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please share your name.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMsg('That email looks off — mind double-checking?');
      return;
    }

    setStatus('submitting');

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, interest }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setName('');
      setEmail('');
      setInterest('');
    } catch {
      setErrorMsg('Network hiccup — please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div
        className="rounded-lg px-6 py-8 text-center"
        style={{ backgroundColor: '#2c2e31', border: '1px solid #3d3f42' }}
      >
        <p className="text-lg mb-2" style={{ color: '#e2b714' }}>
          Thanks!
        </p>
        <p className="text-sm" style={{ color: '#d1d0c5' }}>
          I&apos;ll be in touch soon.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 text-xs underline transition-colors"
          style={{ color: '#646669' }}
        >
          send another message
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={200}
        disabled={submitting}
        className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714] disabled:opacity-50"
        style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
      />
      <input
        type="email"
        placeholder="your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        maxLength={200}
        disabled={submitting}
        className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714] disabled:opacity-50"
        style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
      />
      <textarea
        placeholder="why are you interested? (optional)"
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
        rows={4}
        maxLength={5000}
        disabled={submitting}
        className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714] disabled:opacity-50 resize-none"
        style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
      />

      {errorMsg && (
        <p className="text-sm px-1" style={{ color: '#ca4754' }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#e2b714', color: '#323437' }}
      >
        {submitting ? 'sending...' : 'reach out'}
      </button>
    </form>
  );
}
