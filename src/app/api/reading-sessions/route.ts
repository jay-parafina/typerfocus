import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('reading_sessions')
    .select(
      'id, title, phrase_count, total_chunks, current_chunk_index, last_accessed_at, created_at'
    )
    .eq('user_id', user.id)
    .order('last_accessed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    phrases,
    source_text,
    source_type,
    source_filename,
    chunk_size,
    current_chunk_index,
  } = body;

  if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
    return NextResponse.json({ error: 'No phrases provided' }, { status: 400 });
  }

  if (source_type !== 'file' && source_type !== 'paste') {
    return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('reading_sessions')
    .insert({
      user_id: user.id,
      title: title || 'Untitled',
      phrases,
      phrase_count: phrases.length,
      total_chunks: phrases.length,
      source_text: source_text ?? null,
      source_type,
      source_filename: source_filename ?? null,
      chunk_size: chunk_size ?? null,
      current_chunk_index: current_chunk_index ?? 0,
      updated_at: now,
      last_accessed_at: now,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
