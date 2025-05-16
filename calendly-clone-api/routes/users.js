const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, checkOwnership } = require('../middleware/auth');
const { isValidEmail } = require('../utils/validators');

// Get all users with pagination (protected)
router.get('/', auth, (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  db.all(
    'SELECT * FROM users LIMIT ? OFFSET ?',
    [pageSize, offset],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({
        data: rows,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: rows.length
        }
      });
    }
  );
});

// Get single user
router.get('/:userId', auth, (req, res) => {
  const { userId } = req.params;
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Filter out sensitive fields to match GraphQL response
    const { password, token, ...userWithoutSensitiveData } = row;
    res.json(userWithoutSensitiveData);
  });
});

// Partially update a user
router.patch('/:userId', auth, checkOwnership, (req, res) => {
  const { userId } = req.params;
  const { name, email, password, timezone } = req.body;

  if (!name && !email && !password && !timezone) {
    return res.status(400).json({ error: 'At least one field is required' });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const fields = [];
  const values = [];

  if (name) {
    fields.push('name = ?');
    values.push(name);
  }
  if (email) {
    fields.push('email = ?');
    values.push(email);
  }
  if (password) {
    fields.push('password = ?');
    values.push(password);
  }
  if (timezone) {
    fields.push('timezone = ?');
    values.push(timezone);
  }

  values.push(userId);

  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: userId, name, email, timezone });
  });
});

// Delete a user
router.delete('/:userId', auth, checkOwnership, (req, res) => {
  const { userId } = req.params;

  db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send(); // No content
  });
});

// Create a new user (unprotected)
router.post('/', (req, res) => {
  const { name, email, password, timezone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const id = Date.now().toString(); // Simple ID generation

  db.run(
    'INSERT INTO users (id, name, email, password, timezone) VALUES (?, ?, ?, ?, ?)',
    [id, name, email, password, timezone],
    function (err) {
      if (err) {
        console.error('Database error:', err.message); // Log the specific error
        // Check for unique constraint violation on email
        if (err.message.includes('UNIQUE constraint failed: users.email')) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id, name, email, timezone });
    }
  );
});


router.delete('/sessions', (req, res) => {
  // Logout logic
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Protected route
router.get('/profile', auth, (req, res) => {
  res.json({ user: req.session.user });
});

module.exports = router;
