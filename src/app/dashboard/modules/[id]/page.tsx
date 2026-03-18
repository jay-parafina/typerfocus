import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h2
          key={i}
          className="font-medium mt-8 mb-3"
          style={{ fontSize: '1.15rem', color: '#e2b714' }}
        >
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.trim() === '') {
      return <div key={i} className="h-3" />;
    }
    return (
      <p
        key={i}
        className="leading-relaxed mb-2"
        style={{ fontSize: '1rem', color: '#d1d0c5' }}
      >
        {line}
      </p>
    );
  });
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: mod } = await supabase
    .from('modules')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!mod) redirect('/dashboard');

  return (
    <main className="min-h-screen flex flex-col items-center px-8 py-16">
      <div className="w-full max-w-2xl">
        <Link
          href="/dashboard"
          className="text-xs mb-8 inline-block transition-colors hover:text-[#d1d0c5]"
          style={{ color: '#646669' }}
        >
          &larr; back to dashboard
        </Link>

        <h1
          className="font-light tracking-[0.1em] mb-1"
          style={{ fontSize: '1.75rem', color: '#e2b714' }}
        >
          {mod.title || mod.topic}
        </h1>
        <p className="text-xs mb-10" style={{ color: '#646669' }}>
          generated {new Date(mod.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        <div className="mb-12">
          {renderContent(mod.content)}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            disabled
            className="rounded-lg px-6 py-3 text-sm font-medium opacity-50 cursor-not-allowed"
            style={{ backgroundColor: '#e2b714', color: '#323437' }}
          >
            start typing practice (coming soon)
          </button>
          <Link
            href="/dashboard/generate"
            className="rounded-lg px-6 py-3 text-sm font-medium text-center transition-all hover:opacity-90"
            style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
          >
            generate another
          </Link>
        </div>
      </div>
    </main>
  );
}
