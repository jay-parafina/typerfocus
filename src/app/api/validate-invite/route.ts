import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { inviteCode } = await request.json();

  if (!inviteCode || inviteCode !== process.env.INVITE_CODE) {
    return NextResponse.json({ valid: false }, { status: 403 });
  }

  return NextResponse.json({ valid: true });
}
