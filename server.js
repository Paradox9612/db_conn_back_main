// server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

const app = express();

// middleware
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// connect db
connectDB();

// require models (registers models)
const models = require('./models');

// mount routes (use canonical filenames below)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/journeys', require('./routes/journey.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));


// test
app.get('/', (req, res) => res.send('Travel Expense Tracker API is running...'));

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
