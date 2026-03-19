const DEFAULT_DB_NAME = 'sim-finder-admin';

function cleanDbName(input) {
  if (!input) return '';
  return String(input).trim().replace(/^\/+|\/+$/g, '');
}

function getTargetDbName() {
  return cleanDbName(process.env.MONGODB_DB_NAME) || DEFAULT_DB_NAME;
}

function getDbNameFromUri(uri) {
  try {
    const parsed = new URL(uri);
    return cleanDbName(parsed.pathname);
  } catch {
    return '';
  }
}

function withMongoDbName(uri, dbName = getTargetDbName()) {
  if (!uri) {
    throw new Error('Missing MONGODB_URI');
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('Invalid MONGODB_URI');
  }

  const normalizedDbName = cleanDbName(dbName);
  if (!normalizedDbName) {
    throw new Error('Invalid MongoDB database name');
  }

  parsed.pathname = `/${normalizedDbName}`;
  return parsed.toString();
}

function getSourceDbName(uri) {
  return cleanDbName(process.env.MONGODB_SOURCE_DB_NAME) || getDbNameFromUri(uri) || 'test';
}

module.exports = {
  DEFAULT_DB_NAME,
  cleanDbName,
  getTargetDbName,
  getDbNameFromUri,
  withMongoDbName,
  getSourceDbName,
};
