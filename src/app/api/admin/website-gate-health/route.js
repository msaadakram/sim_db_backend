import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/lib/models/Setting';
import { requireAuth } from '@/lib/auth';

const DEFAULT_PROBE_URL = process.env.WEBSITE_GATE_PROBE_URL || 'https://sim-db-frontend.vercel.app';
const PROBE_PATH = '/api/website-search?q=03001234567&type=mobile';

function parseSetCookieToken(rawCookieHeader) {
  if (!rawCookieHeader) return '';
  return rawCookieHeader.split(';')[0] || '';
}

async function probeStep(baseUrl, cookie) {
  const url = `${baseUrl}${PROBE_PATH}`;
  const headers = cookie ? { cookie } : undefined;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    redirect: 'manual',
    headers,
    signal: AbortSignal.timeout(12000),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const nextCookie = parseSetCookieToken(setCookie) || cookie;

  return {
    status: res.status,
    data,
    cookie: nextCookie,
  };
}

export async function GET(request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.response;

  try {
    await dbConnect();

    const configuredProbe = await Setting.get('websiteGateProbeUrl');
    const probeBase = String(configuredProbe || DEFAULT_PROBE_URL).trim();

    let origin;
    try {
      origin = new URL(probeBase).origin;
    } catch {
      return NextResponse.json(
        {
          status: 'error',
          ok: false,
          message: 'Invalid probe URL configured for website gate health.',
          probeUrl: probeBase,
        },
        { status: 400 }
      );
    }

    let cookie = '';
    const steps = [];

    for (let i = 1; i <= 4; i++) {
      const result = await probeStep(origin, cookie);
      cookie = result.cookie;
      steps.push({
        step: i,
        status: result.status,
        provider: result.data?.provider || null,
        requireShortlink: Boolean(result.data?.requireShortlink),
        redirectUrl: result.data?.redirectUrl || null,
        error: result.data?.error || null,
        message: result.data?.message || null,
      });
    }

    const firstThreeOk = steps.slice(0, 3).every((s) => !s.requireShortlink);
    const fourth = steps[3];
    const fourthOk = Boolean(fourth.requireShortlink && fourth.redirectUrl && fourth.provider);

    const ok = firstThreeOk && fourthOk;

    return NextResponse.json({
      status: ok ? 'healthy' : 'degraded',
      ok,
      checkedAt: new Date().toISOString(),
      probeUrl: origin,
      checks: {
        firstThreeNonGateResponses: firstThreeOk,
        fourthRequiresShortlink: fourthOk,
      },
      steps,
      note: 'Health check performs 4 synthetic website-search calls using an isolated cookie token.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run website gate health check';
    return NextResponse.json(
      {
        status: 'error',
        ok: false,
        message,
      },
      { status: 502 }
    );
  }
}
