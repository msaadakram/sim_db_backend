import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/db';
import ApiKey from '@/lib/models/ApiKey';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/apikeys
export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const keys = await ApiKey.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(keys);
  } catch {
    return NextResponse.json({ error: 'Failed to load API keys' }, { status: 500 });
  }
}

// POST /api/admin/apikeys
export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const body = await request.json();
    const label = body.label || 'Default';
    const key = uuidv4();
    const apiKey = await ApiKey.create({ key, label });
    return NextResponse.json(apiKey);
  } catch {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
