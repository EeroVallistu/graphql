// Authentication middleware for GraphQL server
import { db } from '../server.js';

// Check for operations marked with @skipAuth in context
const isPublicOperation = async (req) => {
  // Allow introspection queries and GET requests (for GraphQL Playground)
  if (req.method === 'GET') {
    return true;
  }
  
  // Parse the GraphQL query to identify operations marked with @skipAuth
  try {
    // Check if this is an introspection query (always public)
    if (req.body && req.body.query && 
       (req.body.query.includes('IntrospectionQuery') || 
        req.body.query.includes('__schema'))) {
      return true;
    }
    
    // Check for specific public operations by name
    if (req.body && req.body.operationName) {
      const publicOperations = ['GetPublicSchedule', 'GetAvailableSlots', 'Login', 'CreateUser'];
      if (publicOperations.includes(req.body.operationName)) {
        return true;
      }
    }
    
    // Check for specific public queries in the query string
    if (req.body && req.body.query) {
      if (req.body.query.includes('schedule(') || 
          req.body.query.includes('availableSlots(') ||
          req.body.query.includes('login(') ||
          req.body.query.includes('createUser(')) {
        return true;
      }
    }
  } catch (error) {
    console.error('Error parsing operation:', error);
  }
  
  return false;
};

export const authMiddleware = async (req, res, next) => {
  try {
    // First check if this is a public operation that should skip auth
    const isPublic = await isPublicOperation(req);
    
    // If this is a public operation, mark it and proceed
    if (isPublic) {
      req.skipAuth = true;
      req.user = null;
      return next();
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return res.status(401).json({ 
        errors: [{
          message: 'Authentication required',
          extensions: { code: 'UNAUTHENTICATED' }
        }]
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return res.status(401).json({ 
        errors: [{
          message: 'Authentication required',
          extensions: { code: 'UNAUTHENTICATED' }
        }]
      });
    }
    
    // Verify the token
    const user = await db.get('SELECT * FROM users WHERE token = ?', [token]);
    
    if (user) {
      // Attach the user to the request object
      req.user = user;
      next();
    } else {
      return res.status(401).json({ 
        errors: [{
          message: 'Invalid authentication token',
          extensions: { code: 'UNAUTHENTICATED' }
        }]
      });
    }
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(500).json({ 
      errors: [{
        message: 'Authentication error',
        extensions: { code: 'INTERNAL_SERVER_ERROR' }
      }]
    });
  }
};
