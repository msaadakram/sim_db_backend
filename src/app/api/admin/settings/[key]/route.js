import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/lib/models/Setting';
import { requireAuth } from '@/lib/auth';
import { flushCache } from '@/lib/services/searchService';

const KNOWN_APIS = ['api1', 'api2'];
const SHORTLINK_PROVIDERS = ['cuty', 'exe', 'gplinks', 'shrinkearn'];

function normalizeProviderRotation(raw) {
  if (!Array.isArray(raw)) return [...SHORTLINK_PROVIDERS];

  const seen = new Set();
  const cleaned = raw
    .map((v) => String(v || '').trim().toLowerCase())
    .filter((v) => SHORTLINK_PROVIDERS.includes(v) && !seen.has(v) && seen.add(v));

  const missing = SHORTLINK_PROVIDERS.filter((p) => !cleaned.includes(p));
  return [...cleaned, ...missing];
}

function normalizeProviderEnabled(raw) {
  const defaults = { cuty: true, exe: true, gplinks: true, shrinkearn: true };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;

  for (const provider of SHORTLINK_PROVIDERS) {
    if (raw[provider] !== undefined) {
      defaults[provider] = parseBoolean(raw[provider], defaults[provider]);
    }
  }

  return defaults;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false;
  }

  return fallback;
}

function normalizeValue(key, value) {
  if (key === 'apiPriority') return normalizePriority(value);
  if (key === 'websiteGateEnabled') return parseBoolean(value, true);
  if (key === 'websiteGateFailoverEnabled') return parseBoolean(value, true);

  if (key === 'websiteGateFreeQueries') {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
  }

  if (key === 'websiteGateUnlockTtlMinutes') {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 10;
    return parsed;
  }

  if (key === 'websiteGateResetWindowMinutes') {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1440;
    return parsed;
  }

  if (key === 'websiteGateProviderRotation') return normalizeProviderRotation(value);
  if (key === 'websiteGateProviderEnabled') return normalizeProviderEnabled(value);
  if (key === 'websiteGateProbeUrl') {
    const raw = String(value || '').trim();
    if (!raw) return 'https://sim-db-frontend.vercel.app';
    try {
      return new URL(raw).origin;
    } catch {
      return 'https://sim-db-frontend.vercel.app';
    }
  }

  return value;
}

function normalizePriority(raw) {
  if (typeof raw === 'string') {
    if (raw === 'api2_first') return ['api2', 'api1'];
    return ['api1', 'api2'];
  }

  if (Array.isArray(raw)) {
    const seen = new Set();
    const cleaned = raw.filter((v) => KNOWN_APIS.includes(v) && !seen.has(v) && seen.add(v));
    const missing = KNOWN_APIS.filter((api) => !cleaned.includes(api));
    return [...cleaned, ...missing];
  }

  return ['api1', 'api2'];
}

// PATCH /api/admin/settings/:key
export async function PATCH(request, { params }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const { key } = await Promise.resolve(params);
    const allowed = [
      'api1Enabled',
      'api2Enabled',
      'apiKeyRequired',
      'apiPriority',
      'websiteGateEnabled',
      'websiteGateFreeQueries',
      'websiteGateProviderRotation',
      'websiteGateProviderEnabled',
      'websiteGateFailoverEnabled',
      'websiteGateUnlockTtlMinutes',
      'websiteGateResetWindowMinutes',
      'websiteGateProbeUrl',
    ];
    if (!allowed.includes(key)) {
      return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 });
    }

    const current = await Setting.get(key);

    if (key === 'apiPriority') {
      const body = await request.json();
      if (body.value === undefined) {
        return NextResponse.json({ error: 'apiPriority value is required' }, { status: 400 });
      }

      const normalized = normalizeValue(key, body.value);
      await Setting.set(key, normalized);
    } else {
      const body = await request.json();
      const newValue = current === false ? true : current === true ? false : true;
      await Setting.set(key, normalizeValue(key, body.value !== undefined ? body.value : newValue));
    }

    flushCache();
    const updated = await Setting.get(key);
    return NextResponse.json({ key, value: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
