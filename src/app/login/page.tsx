'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      if (error.message.includes('Invalid login')) {
        setError("Hmm, that doesn't look right — double-check your email and password?");
      } else {
        setError("Something went sideways — want to try again?");
      }
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-md">
        <h1
          className="font-light tracking-[0.2em] mb-2 text-center"
          style={{ fontSize: '2rem', color: '#e2b714' }}
        >
          log in
        </h1>
        <p className="text-center text-sm mb-10" style={{ color: '#646669' }}>
          welcome back to TyperFocus
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714]"
            style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg px-5 py-4 text-base outline-none transition-colors focus:ring-2 focus:ring-[#e2b714]"
            style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
          />

          {error && (
            <p className="text-sm px-1" style={{ color: '#ca4754' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-5 py-4 text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#e2b714', color: '#323437' }}
          >
            {loading ? 'logging in...' : 'log in'}
          </button>
        </form>

        <p className="text-center text-sm mt-8" style={{ color: '#646669' }}>
          need an account?{' '}
          <Link href="/signup" className="underline hover:text-[#d1d0c5] transition-colors">
            sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
