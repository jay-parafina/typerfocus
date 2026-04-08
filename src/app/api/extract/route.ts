import { NextRequest, NextResponse } from 'next/server';
import { extractFile, getSourceType } from '@/lib/extractors';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!getSourceType(file.name)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  try {
    const result = await extractFile(file);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`Failed to extract ${file.name}:`, err);
    return NextResponse.json({ error: 'Failed to extract file' }, { status: 500 });
  }
}
