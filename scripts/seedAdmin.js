// scripts/seedSuperAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined in .env');

    await mongoose.connect(uri);

    // Use User model, not Admin
    const User = require('../models/User');

    const email = 'superadmin@caseapp.test';
    const password = 'SuperAdmin@1234';
    const name = 'Initial Super Admin';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`SuperAdmin already exists (${email}) — role: ${existing.role}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const superAdmin = new User({
      name,
      email,
      password, // let pre-save hook hash it
      role: 'super_admin',
      status: 'active',
    });

    await superAdmin.save();

    console.log('Created superadmin:');
    console.log({ email, password, role: 'super_admin' });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message || err);
    process.exit(1);
  }
}

run();
