import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  return NextResponse.json({ username: auth.admin.username });
}
