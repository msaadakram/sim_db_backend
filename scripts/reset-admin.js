const { loadEnvConfig } = require('@next/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

loadEnvConfig(process.cwd());

const MONGO_URI = process.env.MONGODB_URI;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function run() {
  if (!MONGO_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  await mongoose.connect(MONGO_URI);

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
