const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// Login - Generate Bearer token
router.post('/', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  console.log('Attempting to log in with email:', email);

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user || user.password !== password) {
      console.log('Incorrect password for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User authenticated:', user.id);

    // Generate a Bearer token
    const token = crypto.randomBytes(32).toString('hex');

    // Save the token in the database
    db.run('UPDATE users SET token = ? WHERE id = ?', [token, user.id], (err) => {
      if (err) {
        console.error('Database error while saving token:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      console.log('Token generated for user:', user.id);
      res.json({ token });
    });
  });
});

// Logout - Invalidate token
router.delete('/', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }

  db.run('UPDATE users SET token = NULL WHERE token = ?', [token], (err) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ message: 'Logout successful' });
  });
});

module.exports = router;