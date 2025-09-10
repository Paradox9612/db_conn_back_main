// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// ---------------- Middleware ----------------
app.use(cors());
app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // serve uploaded files

// ---------------- Connect to MongoDB ----------------
connectDB();

// ---------------- Register models (optional) ----------------
require('./models'); // assuming index.js exports all models
const superadminRoutes = require('./routes/superadmin.routes');
app.use('/api/superadmin', superadminRoutes);

// ---------------- Routes ----------------
app.use('/api/auth', require('./routes/auth.routes')); // auth routes (login/register)
app.use('/api/superadmin', require('./routes/admin.routes')); // superadmin routes (invite users/admins)
app.use('/api/admin', require('./routes/admin.routes')); // admin routes (reuse same controller)
app.use('/api/dashboard', require('./routes/dashboard.routes')); // dashboard routes
app.use('/api/journeys', require('./routes/journey.routes')); // journey routes
app.use('/api/expenses', require('./routes/expense.routes')); // expense routes (with multer uploads)

// ---------------- Test route ----------------
app.get('/', (req, res) => {
  res.send('🚀 Travel Expense Tracker API is running...');
});

// ---------------- Start server ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
