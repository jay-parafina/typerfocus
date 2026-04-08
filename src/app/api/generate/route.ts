import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { extractFile, enforceCombinedLimit, buildSourceXml, getSourceType, type ExtractedSource } from '@/lib/extractors';

// Allow up to 300 seconds — streaming keeps the connection alive
export const maxDuration = 300;

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

  const formData = await request.formData();
  const topic = formData.get('topic') as string | null;
  const numSections = Number(formData.get('numSections')) || 4;
  const numExercises = Number(formData.get('numExercises')) || 5;
  const numQuestions = Number(formData.get('numQuestions')) || 5;

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return NextResponse.json({ error: 'A prompt is required' }, { status: 400 });
  }

  if (topic.trim().length > 200) {
    return NextResponse.json({ error: 'Topic is too long — keep it under 200 characters' }, { status: 400 });
  }

  // Extract uploaded files
  const files = formData.getAll('files') as File[];
  const validFiles = files.filter((f) => f.size > 0 && getSourceType(f.name) !== null);

  let sources: ExtractedSource[] = [];
  let anyTruncated = false;

  for (const file of validFiles) {
    try {
      const extracted = await extractFile(file);
      sources.push(extracted);
    } catch (err) {
      console.error(`Failed to extract ${file.name}:`, err);
    }
  }

  if (sources.length > 0) {
    sources = enforceCombinedLimit(sources);
    anyTruncated = sources.some((s) => s.truncated);
  }

  const sections = Math.min(8, Math.max(1, numSections));
  const exercises = Math.min(10, Math.max(1, numExercises));
  const questions = Math.min(10, Math.max(1, numQuestions));

  // Scale max_tokens: each exercise ~50 tokens, each question ~100 tokens in actual JSON output
  // Add generous overhead for section structure, keys, and formatting
  const baseTokens = sections * (exercises * 50 + questions * 120 + 200) + 1000;
  // Always give at least 8000 tokens — small topics still produce verbose JSON
  const minTokens = sources.length > 0 ? 16000 : 8000;
  const estimatedTokens = Math.max(minTokens, Math.min(32000, baseTokens));

  // Build user prompt with optional source material
  const sourceXml = buildSourceXml(sources);
  const userPrompt = sourceXml
    ? `<user_prompt>\n${topic.trim()}\n</user_prompt>\n\n${sourceXml}\n\nGenerate a learning topic based on the user's prompt and the source material above.`
    : `Generate an educational topic about: ${topic.trim()}`;

  console.log(`[generate] sources=${sources.length}, promptLength=${userPrompt.length}, maxTokens=${estimatedTokens}`);
  if (sources.length > 0) {
    sources.forEach((s) => console.log(`  source: ${s.source} (${s.text.length} chars, truncated=${s.truncated})`));
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Stream the response to avoid idle-connection timeouts
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: estimatedTokens,
      system: buildSystemPrompt(sections, exercises, questions),
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const message = await stream.finalMessage();

    console.log(`[generate] stop_reason=${message.stop_reason}, usage=${JSON.stringify(message.usage)}`);

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

    return NextResponse.json({ topic: topicRow, anyTruncated });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: "Something went sideways — want to try again?" },
      { status: 500 },
    );
  }
}
