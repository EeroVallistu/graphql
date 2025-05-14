const db = require('../db');

const auth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // Verify the token
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE token = ?', [token], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Attach the user to the request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if the authenticated user is the owner of the resource
const checkOwnership = (req, res, next) => {
  // Get the userId from the request parameters
  const { userId } = req.params;
  
  // Check if the authenticated user is the owner of the resource
  if (req.user && req.user.id === userId) {
    // User is authorized to access/modify their own data
    next();
  } else {
    // User is not authorized
    res.status(403).json({ error: 'Forbidden: You can only access or modify your own data' });
  }
};

module.exports = { auth, checkOwnership }; 