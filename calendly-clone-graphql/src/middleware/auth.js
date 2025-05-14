// Authentication middleware for GraphQL server
import { db } from '../server.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    // Verify the token
    const stmt = db.prepare('SELECT * FROM users WHERE token = ?');
    const user = stmt.get(token);
    
    if (user) {
      // Attach the user to the request object
      req.user = user;
    } else {
      req.user = null;
    }
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    req.user = null;
    next();
  }
};
