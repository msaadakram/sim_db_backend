const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb+srv://msaadakram786_db_user2:mongodb786@cluster0.poo3mql.mongodb.net/sim-finder?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGO_URI);
  const admin = await mongoose.connection.db.collection('admins').findOne({ username: 'admin' });
  console.log('Admin found:', !!admin);
  console.log('Password hash starts with:', admin?.password?.substring(0, 10));
  const match = await bcrypt.compare('admin123', admin.password);
  console.log('Password matches admin123:', match);
  
  if (!match) {
    console.log('Resetting password to admin123...');
    const hash = await bcrypt.hash('admin123', 12);
    await mongoose.connection.db.collection('admins').updateOne(
      { username: 'admin' },
      { $set: { password: hash } }
    );
    console.log('Password reset done');
  }
  
  await mongoose.disconnect();
}
run().catch(console.error);
