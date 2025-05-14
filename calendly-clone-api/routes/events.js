const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, checkOwnership } = require('../middleware/auth');
const { isValidHexColor } = require('../utils/validators');

// Create a new event type
router.post('/', auth, (req, res) => {
  const { name, duration, description, color } = req.body;
  const userId = req.user.id; // Get the user ID from the authenticated user

  if (!name || !duration) {
    return res.status(400).json({ error: 'Name and duration are required' });
  }

  if (color && !isValidHexColor(color)) {
    return res.status(400).json({ error: 'Color must be a valid hex color (e.g., #FF0000)' });
  }

  const id = Date.now().toString(); // Simple ID generation
  db.run(
    'INSERT INTO events (id, name, duration, description, color, userId) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, duration, description, color, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id, name, duration, description, color, userId });
    }
  );
});

// Get event by ID
router.get('/:eventId', auth, (req, res) => {
  const { eventId } = req.params;

  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if the user is the owner of this event
    if (row.userId !== req.user.id) {
      // Allow read access but include a flag indicating it's not owned by the user
      row.isOwner = false;
    } else {
      row.isOwner = true;
    }
    
    res.json(row);
  });
});

// Custom middleware to check if user owns the event
const checkEventOwnership = (req, res, next) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  db.get('SELECT userId FROM events WHERE id = ?', [eventId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (row.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only modify your own events' });
    }
    next();
  });
};

// Partially update an event
router.patch('/:eventId', auth, checkEventOwnership, (req, res) => {
  const { eventId } = req.params;
  const { name, duration, description, color } = req.body;

  if (!name && !duration && !description && !color) {
    return res.status(400).json({ error: 'At least one field is required' });
  }

  if (color && !isValidHexColor(color)) {
    return res.status(400).json({ error: 'Color must be a valid hex color (e.g., #FF0000)' });
  }

  const fields = [];
  const values = [];

  if (name) {
    fields.push('name = ?');
    values.push(name);
  }
  if (duration) {
    fields.push('duration = ?');
    values.push(duration);
  }
  if (description) {
    fields.push('description = ?');
    values.push(description);
  }
  if (color) {
    fields.push('color = ?');
    values.push(color);
  }

  values.push(eventId);

  const query = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ id: eventId, name, duration, description, color, userId: req.user.id });
  });
});

// Delete an event
router.delete('/:eventId', auth, checkEventOwnership, (req, res) => {
  const { eventId } = req.params;

  db.run('DELETE FROM events WHERE id = ?', [eventId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(204).send(); // No content
  });
});

// Get all events (users can only see their own events)
router.get('/', auth, (req, res) => {
  const userId = req.user.id;
  
  db.all('SELECT * FROM events WHERE userId = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

module.exports = router;