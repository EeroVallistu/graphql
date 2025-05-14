const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');
const { auth } = require('./middleware/auth');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

// Configure CORS
app.use(cors({
  origin: 'https://sanderprii.me',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Import routes
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const scheduleRoutes = require('./routes/schedules');
const appointmentRoutes = require('./routes/appointments');
const sessionsRoutes = require('./routes/sessions');
const docsRouter = require('./routes/docs');

// Mount documentation routes at specific paths
app.use('/en', docsRouter);
app.use('/et', docsRouter);
app.use('/docs', docsRouter);

// Root path redirects to documentation based on browser language
app.get('/', (req, res) => {
  const userLang = req.headers["accept-language"];
  if (userLang && userLang.includes('et')) {
    return res.redirect('/et');
  }
  return res.redirect('/en');
});

// API routes without /api prefix
app.use('/users', userRoutes);
app.use('/events', auth, eventRoutes);
app.use('/schedules', auth, scheduleRoutes);
app.use('/appointments', auth, appointmentRoutes);
app.use('/sessions', sessionsRoutes);

// Serve static OpenAPI specs from docs directory (for raw YAML access)
app.use('/docs/specs', express.static(path.join(__dirname, 'docs')));

// Database initialization
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    timezone TEXT,
    token TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    description TEXT,
    color TEXT,
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    availability TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    eventId TEXT NOT NULL,
    userId TEXT NOT NULL,
    inviteeEmail TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    FOREIGN KEY (eventId) REFERENCES events(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);
});

// Log database errors
db.on('error', (err) => {
  console.error('Database error:', err);
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API docs available at:`);
  console.log(`  - http://localhost:${PORT}/en (English)`);
  console.log(`  - http://localhost:${PORT}/et (Estonian)`);
  console.log(`  - http://localhost:${PORT}/docs (Documentation root)`);
});

module.exports = app;