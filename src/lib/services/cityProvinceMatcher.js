import fs from 'fs';
import path from 'path';

const DATA_PATH_CANDIDATES = [
  '/tmp/pk_city_province.tsv',
  path.join(process.cwd(), 'data', 'pk_city_province.tsv'),
  path.join(process.cwd(), 'pk_city_province.tsv'),
];

let cachedCityRows = null;

function normalizeText(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseCityProvinceTsv(raw) {
  const lines = String(raw || '').split(/\r?\n/);
  const rows = [];
  const seen = new Set();

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const city = String(parts[1] || '').trim();
    const province = String(parts[2] || '').trim();
    if (!city || !province) continue;

    const normalizedCity = normalizeText(city);
    if (!normalizedCity || seen.has(normalizedCity)) continue;
    seen.add(normalizedCity);

    rows.push({
      city,
      province,
      normalizedCity,
      matcher: new RegExp(`(^| )${escapeRegExp(normalizedCity)}( |$)`),
    });
  }

  // Prefer longer names first so "KOTLI SATIYAN" wins over shorter partial names.
  rows.sort((a, b) => b.normalizedCity.length - a.normalizedCity.length);
  return rows;
}

function loadCityRows() {
  if (cachedCityRows) return cachedCityRows;

  for (const dataPath of DATA_PATH_CANDIDATES) {
    try {
      if (!fs.existsSync(dataPath)) continue;
      const raw = fs.readFileSync(dataPath, 'utf8');
      const parsed = parseCityProvinceTsv(raw);
      if (parsed.length > 0) {
        cachedCityRows = parsed;
        return cachedCityRows;
      }
    } catch (_) {
      // try next candidate path
    }
  }

  cachedCityRows = [];
  return cachedCityRows;
}

export function detectCityProvinceFromAddress(address) {
  const normalizedAddress = normalizeText(address);
  if (!normalizedAddress) return null;

  const rows = loadCityRows();
  for (const row of rows) {
    if (row.matcher.test(normalizedAddress)) {
      return {
        city: row.city,
        province: row.province,
      };
    }
  }

  return null;
}

export function enrichRecordsWithCityProvince(records) {
  if (!Array.isArray(records)) return records;

  return records.map((record) => {
    const match = detectCityProvinceFromAddress(record?.address);
    return {
      ...record,
      city: match?.city || '',
      province: match?.province || '',
    };
  });
}
