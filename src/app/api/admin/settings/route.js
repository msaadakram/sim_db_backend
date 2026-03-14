import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/lib/models/Setting';
import { requireAuth } from '@/lib/auth';
import { flushCache } from '@/lib/services/searchService';

const KNOWN_APIS = ['api1', 'api2'];

function normalizePriority(raw) {
  // Legacy string support from old backend
  if (typeof raw === 'string') {
    if (raw === 'api2_first') return ['api2', 'api1'];
    return ['api1', 'api2'];
  }

  // Preferred array format
  if (Array.isArray(raw)) {
    const seen = new Set();
    const cleaned = raw.filter((v) => KNOWN_APIS.includes(v) && !seen.has(v) && seen.add(v));
    const missing = KNOWN_APIS.filter((api) => !cleaned.includes(api));
    return [...cleaned, ...missing];
  }

  return ['api1', 'api2'];
}

// GET /api/admin/settings
export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const keys = ['api1Enabled', 'api2Enabled', 'api1Url', 'api2Url', 'apiKeyRequired', 'apiPriority'];
    const settings = {};
    for (const key of keys) {
      const val = await Setting.get(key);
      settings[key] = val;
    }
    if (settings.api1Enabled === null) settings.api1Enabled = true;
    if (settings.api2Enabled === null) settings.api2Enabled = true;
    if (settings.api1Url === null) settings.api1Url = process.env.API1_URL;
    if (settings.api2Url === null) settings.api2Url = process.env.API2_URL;
    if (settings.apiKeyRequired === null) settings.apiKeyRequired = false;
    const normalizedPriority = normalizePriority(settings.apiPriority);
    settings.apiPriority = normalizedPriority;

    // Self-heal invalid/legacy stored priority values
    const existingPriority = await Setting.get('apiPriority');
    if (JSON.stringify(existingPriority) !== JSON.stringify(normalizedPriority)) {
      await Setting.set('apiPriority', normalizedPriority);
    }

    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings
export async function PUT(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const body = await request.json();
    const allowed = ['api1Enabled', 'api2Enabled', 'api1Url', 'api2Url', 'apiKeyRequired', 'apiPriority'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'apiPriority') {
          await Setting.set(key, normalizePriority(body[key]));
        } else {
          await Setting.set(key, body[key]);
        }
      }
    }
    flushCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
