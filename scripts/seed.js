// Seed script — run with: node scripts/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://msaadakram786_db_user2:mongodb786@cluster0.poo3mql.mongodb.net/sim-finder?retryWrites=true&w=majority&appName=Cluster0';

// ── Schemas (inline so script is self-contained) ──
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
});

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
  const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

  // Seed admin
  const existing = await Admin.findOne({ username: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 12);
    await Admin.create({ username: 'admin', password: hash });
    console.log('✓ Admin user created (admin / admin123)');
  } else {
    console.log('• Admin user already exists');
  }

  // Seed default settings
  const defaults = {
    api1Enabled: true,
    api2Enabled: true,
    api1Url: 'https://paksimdetails.xyz/K/Zawar.php',
    api2Url: 'https://app.findpakjobs.pk/api.php',
    apiKeyRequired: false,
    apiPriority: ['api1', 'api2'],
  };

  for (const [key, value] of Object.entries(defaults)) {
    const exists = await Setting.findOne({ key });
    if (!exists) {
      await Setting.create({ key, value });
      console.log(`✓ Setting "${key}" created`);
    } else {
      console.log(`• Setting "${key}" already exists`);
    }
  }

  console.log('\nSeed complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
