import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/lib/models/Setting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SHORTLINK_PROVIDERS = ['cuty', 'exe', 'gplinks', 'shrinkearn'];

const DEFAULTS = {
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
};

function normalizeProviderRotation(raw) {
  if (!Array.isArray(raw)) return [...DEFAULTS.websiteGateProviderRotation];
  const seen = new Set();
  const cleaned = raw
    .map((v) => String(v || '').trim().toLowerCase())
    .filter((v) => SHORTLINK_PROVIDERS.includes(v) && !seen.has(v) && seen.add(v));
  const missing = SHORTLINK_PROVIDERS.filter((p) => !cleaned.includes(p));
  return [...cleaned, ...missing];
}

function normalizeProviderEnabled(raw) {
  const base = { ...DEFAULTS.websiteGateProviderEnabled };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  for (const provider of SHORTLINK_PROVIDERS) {
    if (raw[provider] !== undefined) {
      base[provider] = Boolean(raw[provider]);
    }
  }

  return base;
}

function normalizeNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export async function GET() {
  try {
    await dbConnect();

    const keys = Object.keys(DEFAULTS);
    const payload = {};

    for (const key of keys) {
      const raw = await Setting.get(key);
      const fallback = DEFAULTS[key];
      const candidate = raw === null ? fallback : raw;

      if (key === 'websiteGateEnabled' || key === 'websiteGateFailoverEnabled') {
        payload[key] = Boolean(candidate);
      } else if (key === 'websiteGateFreeQueries') {
        payload[key] = normalizeNonNegativeInt(candidate, DEFAULTS.websiteGateFreeQueries);
      } else if (key === 'websiteGateUnlockTtlMinutes') {
        payload[key] = Math.max(1, normalizeNonNegativeInt(candidate, DEFAULTS.websiteGateUnlockTtlMinutes));
      } else if (key === 'websiteGateResetWindowMinutes') {
        payload[key] = Math.max(1, normalizeNonNegativeInt(candidate, DEFAULTS.websiteGateResetWindowMinutes));
      } else if (key === 'websiteGateProviderRotation') {
        payload[key] = normalizeProviderRotation(candidate);
      } else if (key === 'websiteGateProviderEnabled') {
        payload[key] = normalizeProviderEnabled(candidate);
      } else {
        payload[key] = candidate;
      }
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch {
    return NextResponse.json(
      {
        websiteGateEnabled: DEFAULTS.websiteGateEnabled,
        websiteGateFreeQueries: DEFAULTS.websiteGateFreeQueries,
        websiteGateProviderRotation: DEFAULTS.websiteGateProviderRotation,
        websiteGateProviderEnabled: DEFAULTS.websiteGateProviderEnabled,
        websiteGateFailoverEnabled: DEFAULTS.websiteGateFailoverEnabled,
        websiteGateUnlockTtlMinutes: DEFAULTS.websiteGateUnlockTtlMinutes,
        websiteGateResetWindowMinutes: DEFAULTS.websiteGateResetWindowMinutes,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
