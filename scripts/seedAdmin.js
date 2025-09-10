// scripts/createSuperadmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');
const connectDB = require('../config/db');

(async () => {
  await connectDB();
  const hashed = await bcrypt.hash('SuperSecret123', 10);
  const sa = new SuperAdmin({ email: 'super@site.com', password: hashed, name: 'Super Admin' });
  await sa.save();
  console.log('Superadmin created');
  process.exit(0);
})();
