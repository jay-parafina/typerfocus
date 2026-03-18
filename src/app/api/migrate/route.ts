import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { topics } from '@/data/content';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const results: { topic: string; sections: number; errors: string[] }[] = [];

  for (const topic of topics) {
    const errors: string[] = [];

    // Check if this topic already exists for this user
    const { data: existing } = await supabase
      .from('topics')
      .select('id')
      .eq('user_id', user.id)
      .eq('title', topic.title)
      .maybeSingle();

    if (existing) {
      results.push({ topic: topic.title, sections: 0, errors: ['already exists — skipped'] });
      continue;
    }

    // Create topic
    const { data: topicRow, error: topicError } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        title: topic.title,
        description: topic.description,
      })
      .select()
      .single();

    if (topicError) {
      errors.push(`topic insert: ${topicError.message}`);
      results.push({ topic: topic.title, sections: 0, errors });
      continue;
    }

    // Create sections from modules
    const sectionRows = topic.modules.map((mod, i) => ({
      topic_id: topicRow.id,
      user_id: user.id,
      title: mod.title,
      description: mod.description,
      order_num: mod.order || i + 1,
      phrases: mod.phrases.map((p) => ({ text: p.text, order: p.order })),
      quiz: (mod.quiz || []).map((q) => ({
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        correctOptionId: q.correctOptionId,
      })),
    }));

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sectionRows);

    if (sectionsError) {
      errors.push(`sections insert: ${sectionsError.message}`);
    }

    results.push({
      topic: topic.title,
      sections: sectionsError ? 0 : sectionRows.length,
      errors,
    });
  }

  return NextResponse.json({ success: true, results });
}
