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
