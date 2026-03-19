import { MongoClient } from 'mongodb';
import { withMongoDbName } from './mongoUri';

const clients = global._mongoNativeClients || new Map();
if (!global._mongoNativeClients) {
  global._mongoNativeClients = clients;
}

export async function getMongoDb(dbName) {
  const sourceUri = process.env.MONGODB_URI;
  if (!sourceUri) {
    throw new Error('Missing MONGODB_URI');
  }

  const uri = withMongoDbName(sourceUri, dbName);

  if (!clients.has(uri)) {
    const client = new MongoClient(uri);
    clients.set(uri, client.connect());
  }

  const client = await clients.get(uri);
  return client.db(dbName);
}
