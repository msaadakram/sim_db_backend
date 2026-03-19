const DEFAULT_DB_NAME = 'sim-finder-admin';

function cleanDbName(input) {
  if (!input) return '';
  return String(input).trim().replace(/^\/+|\/+$/g, '');
}

export function getMongoDbName() {
  return cleanDbName(process.env.MONGODB_DB_NAME) || DEFAULT_DB_NAME;
}

export function withMongoDbName(uri, dbName = getMongoDbName()) {
  if (!uri) {
    throw new Error('Missing MongoDB connection string');
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('Invalid MongoDB connection string in MONGODB_URI');
  }

  const normalizedDbName = cleanDbName(dbName);
  if (!normalizedDbName) {
    throw new Error('Invalid MongoDB database name');
  }

  if (process.env.NODE_ENV === 'production' && normalizedDbName.toLowerCase() === 'test') {
    throw new Error('Refusing to use MongoDB database "test" in production. Set MONGODB_DB_NAME properly.');
  }

  parsed.pathname = `/${normalizedDbName}`;
  return parsed.toString();
}
