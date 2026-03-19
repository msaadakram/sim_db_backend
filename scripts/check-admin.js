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
  const admin = await mongoose.connection.db.collection('admins').findOne({ username: ADMIN_USERNAME });
  console.log('Admin found:', !!admin);
  console.log('Password hash starts with:', admin?.password?.substring(0, 10));
  const match = admin ? await bcrypt.compare(ADMIN_PASSWORD, admin.password) : false;
  console.log('Password matches ADMIN_PASSWORD:', match);
  
  if (!match) {
    console.log('Resetting password to ADMIN_PASSWORD...');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await mongoose.connection.db.collection('admins').updateOne(
      { username: ADMIN_USERNAME },
      { $set: { password: hash } }
    );
    console.log('Password reset done');
  }
  
  await mongoose.disconnect();
}
run().catch(console.error);
