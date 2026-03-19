import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getMongoDb } from '@/lib/mongoClient';

const NEWSLETTER_DB_NAME = (process.env.NEWSLETTER_DB_NAME || 'sim-finder').trim();
const NEWSLETTER_COLLECTION = (process.env.NEWSLETTER_COLLECTION || 'newsletter_subscribers').trim();

function buildQuery(search) {
  if (!search) return {};
  return { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } };
}

function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();

    const db = await getMongoDb(NEWSLETTER_DB_NAME);
    const collection = db.collection(NEWSLETTER_COLLECTION);

    const query = buildQuery(search);
    const subscribers = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .project({ email: 1, createdAt: 1, updatedAt: 1, source: 1 })
      .toArray();

    const headers = ['Email', 'Source', 'Created At', 'Updated At'];
    const rows = subscribers.map((s) => [
      escapeCsv(s.email),
      escapeCsv(s.source || ''),
      escapeCsv(s.createdAt ? new Date(s.createdAt).toISOString() : ''),
      escapeCsv(s.updatedAt ? new Date(s.updatedAt).toISOString() : ''),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="newsletter-subscribers-${Date.now()}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to export subscribers' }, { status: 500 });
  }
}
