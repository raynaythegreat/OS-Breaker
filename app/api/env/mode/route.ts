import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    remoteMode: process.env.OS_REMOTE_MODE === 'true',
    publicUrl: process.env.OS_PUBLIC_URL || null,
  });
}
