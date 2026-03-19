const { loadEnvConfig } = require('@next/env');
const { MongoClient } = require('mongodb');
const {
  getSourceDbName,
  getTargetDbName,
  withMongoDbName,
} = require('./db-uri');

loadEnvConfig(process.cwd());

const sourceUriRaw = process.env.MONGODB_URI;

const UNIQUE_UPSERT_FIELDS = {
  admins: ['username'],
  settings: ['key'],
  apikeys: ['key'],
};

function buildFilterFromUniqueFields(collectionName, doc) {
  const fields = UNIQUE_UPSERT_FIELDS[collectionName];
  if (!fields) return null;

  for (const field of fields) {
    if (doc[field] !== undefined && doc[field] !== null && doc[field] !== '') {
      return { [field]: doc[field] };
    }
  }

  return null;
}

async function copyCollectionData(sourceCollection, targetCollection, collectionName) {
  const docs = await sourceCollection.find({}).toArray();
  if (!docs.length) return 0;

  const operations = docs.map((doc) => {
    const uniqueFilter = buildFilterFromUniqueFields(collectionName, doc);

    if (uniqueFilter) {
      const { _id, ...setFields } = doc;
      return {
        updateOne: {
          filter: uniqueFilter,
          update: {
            $set: setFields,
            $setOnInsert: { _id },
          },
          upsert: true,
        },
      };
    }

    return {
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    };
  });

  await targetCollection.bulkWrite(operations, { ordered: false });
  return docs.length;
}

async function copyIndexes(sourceCollection, targetCollection) {
  const indexes = await sourceCollection.indexes();
  const userIndexes = indexes.filter((idx) => idx.name !== '_id_');

  if (!userIndexes.length) return;

  for (const idx of userIndexes) {
    const { key, name, v, ns, ...options } = idx;
    await targetCollection.createIndex(key, { name, ...options });
  }
}

async function run() {
  if (!sourceUriRaw) {
    throw new Error('Missing MONGODB_URI');
  }

  const sourceDbName = getSourceDbName(sourceUriRaw);
  const targetDbName = getTargetDbName();

  if (sourceDbName === targetDbName) {
    console.log(`Source and target DB are both "${targetDbName}". Nothing to migrate.`);
    return;
  }

  const sourceUri = withMongoDbName(sourceUriRaw, sourceDbName);
  const targetUri = withMongoDbName(sourceUriRaw, targetDbName);

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = targetClient.db(targetDbName);

  console.log(`Migrating active data from "${sourceDbName}" -> "${targetDbName}"`);

  const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();

  if (!collections.length) {
    console.log(`No collections found in source DB "${sourceDbName}".`);
    await sourceClient.close();
    await targetClient.close();
    return;
  }

  let totalDocs = 0;

  for (const { name } of collections) {
    const sourceCollection = sourceDb.collection(name);
    const targetCollection = targetDb.collection(name);

    const copied = await copyCollectionData(sourceCollection, targetCollection, name);
    await copyIndexes(sourceCollection, targetCollection);

    totalDocs += copied;
    console.log(`✓ ${name}: ${copied} document(s) migrated`);
  }

  await sourceClient.close();
  await targetClient.close();

  console.log(`\nMigration complete. ${collections.length} collection(s), ${totalDocs} document(s) processed.`);
  console.log('Next step: run "npm run seed" to ensure admin defaults exist in the target DB.');
}

run().catch((err) => {
  console.error('DB migration error:', err);
  process.exit(1);
});
