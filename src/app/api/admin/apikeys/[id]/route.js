import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApiKey from '@/lib/models/ApiKey';
import { requireAuth } from '@/lib/auth';

// DELETE /api/admin/apikeys/:id
export async function DELETE(request, { params }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    await ApiKey.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}

// PATCH /api/admin/apikeys/:id — toggle active
export async function PATCH(request, { params }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const apiKey = await ApiKey.findById(params.id);
    if (!apiKey) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    apiKey.active = !apiKey.active;
    await apiKey.save();
    return NextResponse.json(apiKey);
  } catch {
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}
