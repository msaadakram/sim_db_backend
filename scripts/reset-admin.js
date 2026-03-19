const { loadEnvConfig } = require('@next/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { withMongoDbName, getTargetDbName } = require('./db-uri');

loadEnvConfig(process.cwd());

const SOURCE_URI = process.env.MONGODB_URI;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function run() {
  if (!SOURCE_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  const MONGO_URI = withMongoDbName(SOURCE_URI);

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB database: ${getTargetDbName()}`);

  const admins = mongoose.connection.db.collection('admins');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const result = await admins.updateOne(
    { username: ADMIN_USERNAME },
    { $set: { username: ADMIN_USERNAME, password: passwordHash } },
    { upsert: true }
  );

  if (result.upsertedCount > 0) {
    console.log(`Created admin user: ${ADMIN_USERNAME}`);
  } else {
    console.log(`Updated admin password for: ${ADMIN_USERNAME}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Reset admin error:', err);
  process.exit(1);
});
