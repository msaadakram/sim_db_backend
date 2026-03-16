import { NextResponse } from 'next/server';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5050'];

function getAllowedOrigins() {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!envOrigins) return DEFAULT_ALLOWED_ORIGINS;

  const parsed = envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

function resolveAllowOrigin(requestOrigin, allowedOrigins) {
  if (allowedOrigins.includes('*')) return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  if (!requestOrigin && allowedOrigins.length > 0) return allowedOrigins[0];
  return '';
}

export function buildCorsHeaders(request) {
  const requestOrigin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = resolveAllowOrigin(requestOrigin, allowedOrigins);

  const headers = {
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    if (allowOrigin !== '*') {
      headers.Vary = 'Origin';
    }
  }

  return headers;
}

export function withCors(response, request) {
  const cors = buildCorsHeaders(request);
  Object.entries(cors).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function corsPreflight(request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}
