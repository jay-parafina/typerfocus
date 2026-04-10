import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

function buildSystemPrompt(sectionCount: number, exerciseCount: number, quizCount: number) {
  return `You are a study guide generator for TyperFocus, a typing-based learning app.

Return ONLY valid JSON — no markdown, no code fences, no commentary.

JSON structure:
{
  "title": "Topic Title",
  "overview": "A concise overview paragraph.",
  "key_concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
  "sections": [
    { "title": "Section Title", "body": "2-4 informative sentences covering this subtopic." }
  ],
  "typing_exercises": [
    { "title": "Exercise Title", "passage": "An 80-120 word passage of plain educational prose." }
  ]${quizCount > 0 ? `,
  "quiz": [
    { "question": "A question about the material?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 0 }
  ]` : ''}
}

Rules:
- Generate exactly ${sectionCount} sections, ${exerciseCount} typing exercises${quizCount > 0 ? `, and ${quizCount} quiz questions` : ''}.
- Each typing exercise passage MUST be 80-120 words of flowing, educational prose.
- In exercise passages, use ONLY periods, commas, and apostrophes for punctuation. No colons, semicolons, dashes, parentheses, question marks, or quotation marks.
- key_concepts should contain 4-6 important terms or ideas.
- Quiz answer is the 0-based index of the correct option in the options array.${quizCount === 0 ? '\n- Do NOT include a "quiz" field.' : ''}`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { topic, sectionCount, exerciseCount, quizCount } = body;

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
  }

  const sections = Math.min(10, Math.max(1, sectionCount ?? 5));
  const exercises = Math.min(10, Math.max(1, exerciseCount ?? 3));
  const quizzes = Math.min(10, Math.max(0, quizCount ?? 3));

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: buildSystemPrompt(sections, exercises, quizzes),
      messages: [{ role: 'user', content: `Generate a study kit about: ${topic.trim()}` }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json(
        { error: 'The study kit was too large to generate — try fewer sections or exercises.' },
        { status: 400 },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse the generated study kit — try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Study kit generation error:', err);
    return NextResponse.json(
      { error: 'Something went wrong generating your study kit — try again.' },
      { status: 500 },
    );
  }
}
