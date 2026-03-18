import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './logout-button';
import TopicCard from './topic-card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch topics with section IDs for progress tracking
  const { data: topics } = await supabase
    .from('topics')
    .select('id, title, description, created_at, sections(id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen flex flex-col items-center px-8 py-16">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="font-light tracking-[0.2em] mb-2"
            style={{ fontSize: '2rem', color: '#e2b714' }}
          >
            dashboard
          </h1>
          <p className="text-sm" style={{ color: '#646669' }}>
            welcome back, {user.email}
          </p>
        </div>

        {/* Generate Topic CTA */}
        <Link href="/dashboard/generate" className="group block mb-10">
          <div
            className="rounded-lg px-6 py-5 border border-transparent transition-all duration-150 hover:border-[#4a4d51] hover:bg-[#303235]"
            style={{ backgroundColor: '#2c2e31' }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <h2
                className="font-medium transition-colors group-hover:text-[#e2b714]"
                style={{ color: '#d1d0c5', fontSize: '1rem' }}
              >
                Generate a Topic
              </h2>
              <span className="text-lg" style={{ color: '#646669' }}>+</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#646669' }}>
              Pick any subject and we&apos;ll create sections with typing exercises and quizzes.
            </p>
          </div>
        </Link>

        {/* Topics List */}
        {topics && topics.length > 0 && (
          <>
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: '#3d3f42' }}
            >
              your topics
            </p>
            <div className="flex flex-col gap-2 mb-10">
              {topics.map((t) => {
                const sectionIds = Array.isArray(t.sections) ? t.sections.map((s: { id: string }) => s.id) : [];
                return (
                  <TopicCard
                    key={t.id}
                    id={t.id}
                    title={t.title}
                    description={t.description}
                    createdAt={t.created_at}
                    sectionIds={sectionIds}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Logout */}
        <div className="text-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
