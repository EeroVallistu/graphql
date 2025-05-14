const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, checkOwnership } = require('../middleware/auth');

// Get all schedules (admin only)
router.get('/', auth, (req, res) => {
  // In a real application, you would add admin check here
  // For now, let users see only their own schedule
  const userId = req.user.id;
  
  db.all('SELECT * FROM schedules WHERE userId = ?', [userId], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    // Parse availability for each schedule
    try {
      const parsedRows = rows.map(row => {
        return {
          ...row,
          availability: JSON.parse(row.availability)
        };
      });
      res.json(parsedRows);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      res.status(500).json({ error: 'Failed to parse availability data' });
    }
  });
});

// Get user's schedule (public view for booking)
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  db.get('SELECT * FROM schedules WHERE userId = ?', [userId], (err, row) => {
    if (err) {
      console.error('Database error:', err); // Log the error for debugging
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    try {
      // Parse availability from JSON string
      row.availability = JSON.parse(row.availability);
      res.json(row);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      res.status(500).json({ error: 'Failed to parse availability data' });
    }
  });
});

// Create schedule - ensure users can only create for themselves
router.post('/', auth, (req, res) => {
  const { userId, availability } = req.body;
  const authenticatedUserId = req.user.id;

  if (!userId || !availability) {
    return res.status(400).json({ error: 'userId and availability are required' });
  }

  // Check if the user is creating schedule for themselves
  if (userId !== authenticatedUserId) {
    return res.status(403).json({ error: 'Forbidden: You can only create schedules for yourself' });
  }

  const availabilityJson = JSON.stringify(availability);
  db.run(
    'INSERT INTO schedules (userId, availability) VALUES (?, ?)',
    [userId, availabilityJson],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ userId, availability });
    }
  );
});

// Partially update a schedule - ensure users can only update their own schedule
router.patch('/:userId', auth, checkOwnership, (req, res) => {
  const { userId } = req.params;
  const { availability } = req.body;

  if (!availability) {
    return res.status(400).json({ error: 'Availability is required' });
  }

  const availabilityJson = JSON.stringify(availability);
  db.run(
    'UPDATE schedules SET availability = ? WHERE userId = ?',
    [availabilityJson, userId],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      res.json({ userId, availability });
    }
  );
});

// Delete a schedule - ensure users can only delete their own schedule
router.delete('/:userId', auth, checkOwnership, (req, res) => {
  const { userId } = req.params;

  db.run('DELETE FROM schedules WHERE userId = ?', [userId], function (err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.status(204).send(); // No content
  });
});

module.exports = router; 