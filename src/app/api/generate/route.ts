import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

// Allow up to 120 seconds for large topic generation
export const maxDuration = 120;

function buildSystemPrompt(numSections: number, numExercises: number, numQuestions: number) {
  return `You are an educational content generator for TyperFocus, a neurodivergent-friendly typing practice and e-learning app.

RULES:
- Generate educational content on virtually ANY topic the user asks about. Be generous and assume good intent.
- Companies, products, technologies, people, industries, interview prep, work processes — all of these are VALID topics. Generate content for them.
- ONLY refuse if the topic is EXPLICITLY about: graphic violence, weapons manufacturing instructions, pornography, or detailed instructions for illegal activities.
- When in doubt, GENERATE the content. Do NOT refuse.
- If you must refuse, respond with EXACTLY this JSON:
  {"refused": true, "message": "That's outside what we cover — but I'd love to help you explore something else! Try a topic like science, history, music, or anything you're curious about."}
- For all other topics (which should be the vast majority), respond with the JSON structure described below.

CONTENT RULES (neurodivergent-friendly):
- Short sentences: 1-2 sentences per typing exercise
- One idea per exercise — never combine multiple concepts
- Simple, clear vocabulary — no jargon without explanation
- Engaging and encouraging tone throughout
- Each section should teach a distinct subtopic

RESPONSE FORMAT:
Always respond with valid JSON only. No markdown wrapping, no code fences.

Generate EXACTLY ${numSections} sections. Each section must have:
- EXACTLY ${numExercises} typing exercises (short educational sentences to type)
- EXACTLY ${numQuestions} multiple choice questions with 4 options each

JSON structure:
{
  "refused": false,
  "title": "Topic Title",
  "description": "One sentence overview of the topic.",
  "sections": [
    {
      "title": "Section Title",
      "description": "What this section covers.",
      "order": 1,
      "phrases": [
        {"text": "A short educational sentence to type.", "order": 1}
      ],
      "quiz": [
        {
          "question": "Question text?",
          "options": [
            {"id": "a", "text": "Option A"},
            {"id": "b", "text": "Option B"},
            {"id": "c", "text": "Option C"},
            {"id": "d", "text": "Option D"}
          ],
          "correctOptionId": "b"
        }
      ]
    }
  ]
}`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { topic, numSections, numExercises, numQuestions } = await request.json();

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return NextResponse.json({ error: 'Please enter a topic' }, { status: 400 });
  }

  if (topic.trim().length > 200) {
    return NextResponse.json({ error: 'Topic is too long — keep it under 200 characters' }, { status: 400 });
  }

  const sections = Math.min(20, Math.max(1, numSections || 4));
  const exercises = Math.min(20, Math.max(1, numExercises || 5));
  const questions = Math.min(20, Math.max(1, numQuestions || 5));

  // Scale max_tokens based on content requested
  // Each exercise ~30 tokens, each question ~80 tokens, plus section overhead
  const estimatedTokens = Math.min(16000, sections * (exercises * 35 + questions * 85 + 100) + 500);

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 110_000, // 110 seconds
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: estimatedTokens,
      system: buildSystemPrompt(sections, exercises, questions),
      messages: [
        {
          role: 'user',
          content: `Generate an educational topic about: ${topic.trim()}`,
        },
      ],
    });

    // Check if response was truncated
    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json(
        { error: "The topic was too large to generate in one go — try fewer sections or exercises." },
        { status: 400 },
      );
    }

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let parsed: {
      refused: boolean;
      message?: string;
      title?: string;
      description?: string;
      sections?: {
        title: string;
        description: string;
        order: number;
        phrases: { text: string; order: number }[];
        quiz: {
          question: string;
          options: { id: string; text: string }[];
          correctOptionId: string;
        }[];
      }[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Something got mixed up — want to try that topic again?" },
        { status: 500 },
      );
    }

    if (parsed.refused) {
      return NextResponse.json({ refused: true, message: parsed.message }, { status: 200 });
    }

    // Save topic to Supabase
    const { data: topicRow, error: topicError } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        title: parsed.title,
        description: parsed.description || '',
      })
      .select()
      .single();

    if (topicError) {
      console.error('Supabase topic insert error:', topicError);
      return NextResponse.json(
        { error: "We generated your topic but couldn't save it — try again?" },
        { status: 500 },
      );
    }

    // Save sections
    if (parsed.sections && parsed.sections.length > 0) {
      const sectionRows = parsed.sections.map((s, i) => ({
        topic_id: topicRow.id,
        user_id: user.id,
        title: s.title,
        description: s.description || '',
        order_num: s.order || i + 1,
        phrases: s.phrases || [],
        quiz: s.quiz || [],
      }));

      const { error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionRows);

      if (sectionsError) {
        console.error('Supabase sections insert error:', sectionsError);
        // Topic was created but sections failed — clean up
        await supabase.from('topics').delete().eq('id', topicRow.id);
        return NextResponse.json(
          { error: "We hit a snag saving your sections — want to try again?" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ topic: topicRow });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: "Something went sideways — want to try again?" },
      { status: 500 },
    );
  }
}
