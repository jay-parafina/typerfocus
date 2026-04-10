import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TopicSections from './topic-sections';
import StudyGuideView from './study-guide-view';

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: topic } = await supabase
    .from('topics')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!topic) redirect('/dashboard');

  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .eq('topic_id', id)
    .order('order_num', { ascending: true });

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
          {topic.title}
        </h1>
        <p className="text-sm mb-2" style={{ color: '#646669' }}>
          {topic.description}
        </p>
        <p className="text-xs mb-10" style={{ color: '#646669' }}>
          created {new Date(topic.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        {topic.overview && (
          <StudyGuideView
            topic={{
              title: topic.title,
              overview: topic.overview,
              key_concepts: topic.key_concepts || [],
            }}
            sections={(sections || []).map((s: { title: string; body: string }) => ({
              title: s.title,
              body: s.body || '',
            }))}
          />
        )}

        <TopicSections sections={sections || []} topicId={id} />

        <div className="flex gap-3 mt-10">
          <Link
            href="/dashboard/generate"
            className="rounded-lg px-6 py-3 text-sm font-medium text-center transition-all hover:opacity-90"
            style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
          >
            generate another topic
          </Link>
        </div>
      </div>
    </main>
  );
}
