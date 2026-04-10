import { NextRequest, NextResponse } from 'next/server';
import type { StudyKitData } from '@/types/study-kit';

export const maxDuration = 30;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(guideData: StudyKitData, topic: string): string {
  const title = escapeHtml(guideData.title || topic);
  const overview = escapeHtml(guideData.overview || '');
  const concepts = (guideData.key_concepts || [])
    .map((c) => `<span class="concept">${escapeHtml(c)}</span>`)
    .join('');
  const sections = (guideData.sections || [])
    .map(
      (s, i) =>
        `<div class="section"><h2>${i + 1}. ${escapeHtml(s.title)}</h2><p>${escapeHtml(s.body)}</p></div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 680px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 26px; margin-bottom: 6px; }
  .overview { font-size: 15px; color: #444; margin-bottom: 24px; }
  .concepts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 28px; }
  .concept { background: #eee; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-family: sans-serif; }
  .section { margin-bottom: 22px; }
  .section h2 { font-size: 18px; margin-bottom: 4px; }
  .section p { font-size: 14px; color: #333; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="overview">${overview}</p>
  <div class="concepts">${concepts}</div>
  ${sections}
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { guideData, topic } = body as { guideData: StudyKitData; topic: string };

  if (!guideData) {
    return NextResponse.json({ error: 'Guide data is required' }, { status: 400 });
  }

  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 800, height: 1100 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(buildHtml(guideData, topic), { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      printBackground: true,
    });

    await browser.close();

    const filename = `${(topic || 'study-guide').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase()}-study-guide.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('PDF export error:', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF — try again.' },
      { status: 500 },
    );
  }
}
