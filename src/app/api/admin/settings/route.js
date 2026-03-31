import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/lib/models/Setting';
import { requireAuth } from '@/lib/auth';
import { flushCache } from '@/lib/services/searchService';

const KNOWN_APIS = ['api1', 'api2'];
const SHORTLINK_PROVIDERS = ['cuty', 'exe', 'gplinks', 'shrinkearn'];

const SETTINGS_DEFAULTS = {
  api1Enabled: true,
  api2Enabled: true,
  api1Url: process.env.API1_URL || '',
  api2Url: process.env.API2_URL || '',
  apiKeyRequired: false,
  apiPriority: ['api1', 'api2'],
  websiteGateEnabled: true,
  websiteGateFreeQueries: 3,
  websiteGateProviderRotation: ['cuty', 'exe', 'gplinks', 'shrinkearn'],
  websiteGateProviderEnabled: {
    cuty: true,
    exe: true,
    gplinks: true,
    shrinkearn: true,
  },
  websiteGateFailoverEnabled: true,
  websiteGateUnlockTtlMinutes: 10,
  websiteGateResetWindowMinutes: 1440,
  websiteGateProbeUrl: process.env.WEBSITE_GATE_PROBE_URL || 'https://sim-db-frontend.vercel.app',
};

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

function normalizeProviderRotation(raw) {
  if (!Array.isArray(raw)) return [...SETTINGS_DEFAULTS.websiteGateProviderRotation];

  const seen = new Set();
  const cleaned = raw
    .map((v) => String(v || '').trim().toLowerCase())
    .filter((v) => SHORTLINK_PROVIDERS.includes(v) && !seen.has(v) && seen.add(v));

  const missing = SHORTLINK_PROVIDERS.filter((p) => !cleaned.includes(p));
  return [...cleaned, ...missing];
}

function normalizeProviderEnabled(raw) {
  const base = { ...SETTINGS_DEFAULTS.websiteGateProviderEnabled };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  for (const provider of SHORTLINK_PROVIDERS) {
    if (raw[provider] !== undefined) {
      base[provider] = parseBoolean(raw[provider], base[provider]);
    }
  }

  return base;
}

function normalizeNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
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

function normalizeWebsiteSetting(key, value) {
  switch (key) {
    case 'websiteGateEnabled':
      return parseBoolean(value, SETTINGS_DEFAULTS.websiteGateEnabled);
    case 'websiteGateFailoverEnabled':
      return parseBoolean(value, SETTINGS_DEFAULTS.websiteGateFailoverEnabled);
    case 'websiteGateFreeQueries':
      return normalizeNonNegativeInt(value, SETTINGS_DEFAULTS.websiteGateFreeQueries);
    case 'websiteGateUnlockTtlMinutes':
      return Math.max(1, normalizeNonNegativeInt(value, SETTINGS_DEFAULTS.websiteGateUnlockTtlMinutes));
    case 'websiteGateResetWindowMinutes':
      return Math.max(1, normalizeNonNegativeInt(value, SETTINGS_DEFAULTS.websiteGateResetWindowMinutes));
    case 'websiteGateProviderRotation':
      return normalizeProviderRotation(value);
    case 'websiteGateProviderEnabled':
      return normalizeProviderEnabled(value);
    case 'websiteGateProbeUrl': {
      const raw = String(value || '').trim();
      if (!raw) return SETTINGS_DEFAULTS.websiteGateProbeUrl;
      try {
        return new URL(raw).origin;
      } catch {
        return SETTINGS_DEFAULTS.websiteGateProbeUrl;
      }
    }
    default:
      return value;
  }
}

function normalizeByKey(key, value) {
  if (key === 'apiPriority') return normalizePriority(value);
  if (
    key === 'websiteGateEnabled' ||
    key === 'websiteGateFreeQueries' ||
    key === 'websiteGateProviderRotation' ||
    key === 'websiteGateProviderEnabled' ||
    key === 'websiteGateFailoverEnabled' ||
    key === 'websiteGateUnlockTtlMinutes' ||
    key === 'websiteGateResetWindowMinutes' ||
    key === 'websiteGateProbeUrl'
  ) {
    return normalizeWebsiteSetting(key, value);
  }
  return value;
}

const SETTINGS_KEYS = Object.keys(SETTINGS_DEFAULTS);

// GET /api/admin/settings
export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();
    const keys = SETTINGS_KEYS;
    const settings = {};
    for (const key of keys) {
      const val = await Setting.get(key);
      const fallback = SETTINGS_DEFAULTS[key];
      const candidate = val === null ? fallback : val;
      const normalized = normalizeByKey(key, candidate);
      settings[key] = normalized;

      if (val === null || JSON.stringify(val) !== JSON.stringify(normalized)) {
        await Setting.set(key, normalized);
      }
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
    const allowed = SETTINGS_KEYS;
    for (const key of allowed) {
      if (body[key] !== undefined) {
        await Setting.set(key, normalizeByKey(key, body[key]));
      }
    }
    flushCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
