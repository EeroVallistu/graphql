// Authentication middleware for GraphQL server
import { db } from '../server.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer token
  
  // If no token, continue but with no user in context
  if (!token) {
    return next();
  }
  
  try {
    // Verify the token
    const stmt = db.prepare('SELECT * FROM users WHERE token = ?');
    const user = stmt.get(token);
    
    if (user) {
      // Attach the user to the request object
      req.user = user;
    }
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    next();
  }
};
