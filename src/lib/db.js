import mongoose from 'mongoose';
import { withMongoDbName } from './mongoUri';

/**
 * Global cache for the mongoose connection to avoid
 * multiple connections in Next.js dev mode (hot reload).
 */
let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export default async function dbConnect() {
  const sourceUri = process.env.MONGODB_URI;
  if (!sourceUri) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local');
  }

  const MONGODB_URI = withMongoDbName(sourceUri);

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
