import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getMongoDb } from '@/lib/mongoClient';

const NEWSLETTER_DB_NAME = (process.env.NEWSLETTER_DB_NAME || 'sim-finder').trim();
const NEWSLETTER_COLLECTION = (process.env.NEWSLETTER_COLLECTION || 'newsletter_subscribers').trim();

function buildQuery(search) {
  if (!search) return {};
  return { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } };
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 25));
    const search = (searchParams.get('search') || '').trim();
    const skip = (page - 1) * limit;

    const db = await getMongoDb(NEWSLETTER_DB_NAME);
    const collection = db.collection(NEWSLETTER_COLLECTION);

    const query = buildQuery(search);

    const [subscribers, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({ email: 1, createdAt: 1, updatedAt: 1, source: 1 })
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      subscribers,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 });
  }
}
