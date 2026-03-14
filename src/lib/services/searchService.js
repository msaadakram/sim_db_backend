import axios from 'axios';
import NodeCache from 'node-cache';
import Setting from '../models/Setting';

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 300 });
const TIMEOUT = parseInt(process.env.API_TIMEOUT) || 10000;

/**
 * Flush entire cache. Called when settings change.
 */
export function flushCache() {
  cache.flushAll();
}

/**
 * Detect if query is a mobile number or CNIC.
 */
export function detectQueryType(q) {
  const cleaned = q.replace(/[^0-9]/g, '');
  if (cleaned.length === 13) return 'cnic';
  if (cleaned.length >= 10 && cleaned.length <= 11) return 'mobile';
  return 'unknown';
}

/**
 * Normalise results from API 1.
 */
function normaliseApi1(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  if (data.length === 1 && data[0].error) return null;

  return data.map((r) => ({
    name: (r.nam || '').trim(),
    cnic: (r.cni || '').trim(),
    number: (r.nbr || '').trim(),
    address: (r.adr || '').trim(),
  }));
}

/**
 * Normalise results from API 2.
 */
function normaliseApi2(data) {
  if (!data || data.error) return null;
  if (!data.names || data.names.length === 0) return null;

  const count = Math.max(
    data.names?.length || 0,
    data.numbers?.length || 0,
    data.cnics?.length || 0,
    data.addresses?.length || 0
  );

  const results = [];
  for (let i = 0; i < count; i++) {
    const entry = {
      name: (data.names?.[i] || '').trim(),
      cnic: (data.cnics?.[i] || '').trim(),
      number: (data.numbers?.[i] || '').trim(),
      address: (data.addresses?.[i] || '').trim(),
    };
    const hasRealData = entry.name || entry.cnic || entry.number;
    if (!hasRealData) continue;
    results.push(entry);
  }
  return results.length > 0 ? results : null;
}

/**
 * Extract JSON array from a potentially messy API response.
 */
function extractJson(data) {
  if (typeof data === 'object') return data;

  if (typeof data === 'string') {
    const start = data.indexOf('[');
    const end = data.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(data.substring(start, end + 1));
      } catch (_) { /* fall through */ }
    }
    try {
      return JSON.parse(data);
    } catch (_) { /* fall through */ }
  }
  return data;
}

// ======================== API CALL FUNCTIONS ========================

async function withRetry(fn, retries = 2, delayMs = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function callApi1(query, queryType) {
  const baseUrl = (await Setting.get('api1Url')) || process.env.API1_URL;
  const url = `${baseUrl}?search=${encodeURIComponent(query)}&type=mobile`;
  return withRetry(async () => {
    const res = await axios.get(url, { timeout: TIMEOUT, validateStatus: () => true });
    if (res.status !== 200) throw new Error(`API1 HTTP ${res.status}`);
    const parsed = extractJson(res.data);
    return normaliseApi1(parsed);
  });
}

async function callApi2(query) {
  const baseUrl = (await Setting.get('api2Url')) || process.env.API2_URL;
  const url = `${baseUrl}?number=${encodeURIComponent(query)}`;
  return withRetry(async () => {
    const res = await axios.get(url, { timeout: TIMEOUT, validateStatus: () => true });
    if (res.status !== 200) throw new Error(`API2 HTTP ${res.status}`);
    return normaliseApi2(res.data);
  });
}

// ======================== UNIFIED FAILOVER ========================

async function tryApi(apiName, query, queryType) {
  try {
    const results = apiName === 'api1'
      ? await callApi1(query, queryType)
      : await callApi2(query);
    if (results && results.length > 0) return { source: apiName, data: results };
    console.log(`${apiName.toUpperCase()} no results for ${queryType}:${query}`);
  } catch (err) {
    console.error(`${apiName.toUpperCase()} error: ${err.message}`);
  }
  return null;
}

const API_ENABLED_KEYS = {
  api1: 'api1Enabled',
  api2: 'api2Enabled',
};

function normalizePriority(raw) {
  const known = Object.keys(API_ENABLED_KEYS);

  if (typeof raw === 'string') {
    if (raw === 'api2_first') return ['api2', 'api1'];
    return ['api1', 'api2'];
  }

  if (Array.isArray(raw)) {
    const seen = new Set();
    const cleaned = raw.filter((v) => known.includes(v) && !seen.has(v) && seen.add(v));
    const missing = known.filter((k) => !cleaned.includes(k));
    return [...cleaned, ...missing];
  }

  return ['api1', 'api2'];
}

async function queryWithFailover(query, queryType, enabledMap, priorityOrder) {
  for (let i = 0; i < priorityOrder.length; i++) {
    const apiName = priorityOrder[i];
    if (!enabledMap[apiName]) continue;

    const result = await tryApi(apiName, query, queryType);
    if (result) return result;

    console.log(`${apiName.toUpperCase()} failed/empty${i < priorityOrder.length - 1 ? ', trying next...' : ''}`);
  }

  return null;
}

// ======================== MAIN SEARCH ========================

export async function search(query) {
  const enabledMap = {};
  for (const [apiName, settingKey] of Object.entries(API_ENABLED_KEYS)) {
    enabledMap[apiName] = (await Setting.get(settingKey)) === true;
  }

  const rawPriority = await Setting.get('apiPriority');
  const priorityOrder = normalizePriority(rawPriority);

  const anyEnabled = Object.values(enabledMap).some(Boolean);
  if (!anyEnabled) {
    return {
      success: false,
      error: 'apis_off',
      message: 'All APIs are disabled. Enable at least one API from the admin panel.',
    };
  }

  const queryType = detectQueryType(query);

  // Check cache
  const cacheKey = [
    query,
    queryType,
    `p:${priorityOrder.join('>')}`,
    `e:${enabledMap.api1 ? 1 : 0}${enabledMap.api2 ? 1 : 0}`,
  ].join('|');
  const cached = cache.get(cacheKey);
  if (cached && cached.success) {
    const srcOk =
      (cached.source === 'api1' && enabledMap.api1) ||
      (cached.source === 'api2' && enabledMap.api2);
    if (srcOk) return cached;
    cache.del(cacheKey);
  }

  // CNIC search
  if (queryType === 'cnic') {
    const result = await queryWithFailover(query, 'cnic', enabledMap, priorityOrder);
    if (result) {
      const payload = {
        success: true,
        source: result.source,
        searchType: 'cnic',
        query,
        data: result.data,
      };
      cache.set(cacheKey, payload);
      return payload;
    }
    return null;
  }

  // Mobile number search
  const mobileResult = await queryWithFailover(query, 'mobile', enabledMap, priorityOrder);
  if (!mobileResult) return null;

  // Try CNIC enrichment
  const firstCnic = mobileResult.data.find((r) => r.cnic && r.cnic.length === 13)?.cnic;

  if (firstCnic) {
    const cnicResult = await queryWithFailover(firstCnic, 'cnic', enabledMap, priorityOrder);
    if (cnicResult && cnicResult.data && cnicResult.data.length > 0) {
      const payload = {
        success: true,
        source: mobileResult.source,
        searchType: 'mobile_to_cnic',
        query,
        cnic: firstCnic,
        numberData: mobileResult.data,
        data: cnicResult.data,
      };
      cache.set(cacheKey, payload);
      return payload;
    }
  }

  // CNIC enrichment failed — return original number result
  const payload = {
    success: true,
    source: mobileResult.source,
    searchType: 'mobile',
    query,
    data: mobileResult.data,
  };
  cache.set(cacheKey, payload);
  return payload;
}
