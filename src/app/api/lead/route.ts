import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 },
    );
  }

  let body: { name?: string; email?: string; interest?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const interest = body.interest?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (name.length > 200 || email.length > 200 || (interest && interest.length > 5000)) {
    return NextResponse.json({ error: 'Submission is too long' }, { status: 400 });
  }

  // Best-effort persistence to Supabase. Failure here should not block the email.
  try {
    const supabase = createAdminClient();
    await supabase.from('leads').insert({ name, email, interest });
  } catch (err) {
    console.error('[lead] Supabase insert failed:', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[lead] RESEND_API_KEY is not set');
    return NextResponse.json(
      { error: 'Email service is not configured' },
      { status: 500 },
    );
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'TyperFocus <onboarding@resend.dev>';

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: 'jparafina@gmail.com',
      replyTo: email,
      subject: `TyperFocus — New Lead: ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        '',
        'Why are you interested?',
        interest || '(not provided)',
      ].join('\n'),
    });

    if (error) {
      console.error('[lead] Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 });
    }
  } catch (err) {
    console.error('[lead] Resend threw:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
