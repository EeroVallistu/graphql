// User resolvers
import { db } from '../server.js';
import crypto from 'crypto';
import { isValidEmail } from '../utils/validators.js';

// Helper function to check auth
const checkAuth = (context) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
};

// Helper function to check owner
const checkOwnership = (userId, context) => {
  const user = checkAuth(context);
  if (user.id !== userId) {
    throw new Error('Forbidden: You can only access or modify your own data');
  }
  return user;
};

// User resolvers
export const userResolvers = {
  Query: {
    // Get all users with pagination
    users: (_, { page = 1, pageSize = 20 }, context) => {
      // Auth check
      checkAuth(context);
      
      const offset = (page - 1) * pageSize;
      
      try {
        const stmt = db.prepare('SELECT * FROM users LIMIT ? OFFSET ?');
        const data = stmt.all(pageSize, offset);
        
        return {
          data,
          pagination: {
            page,
            pageSize,
            total: data.length, // For accurate total, we would need a count query
          }
        };
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Get single user by ID
    user: (_, { userId }, context) => {
      // Auth check
      checkAuth(context);
      
      try {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(userId);
        
        if (!user) {
          return { message: 'User not found', code: 'NOT_FOUND' };
        }
        
        return user;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
  },
  
  Mutation: {
    // Create a new user
    createUser: (_, { input }) => {
      const { name, email, password, timezone } = input;
      
      if (!name || !email || !password) {
        return { message: 'Name, email, and password are required', code: 'BAD_INPUT' };
      }
      
      if (!isValidEmail(email)) {
        return { message: 'Invalid email format', code: 'BAD_INPUT' };
      }
      
      try {
        // Check if email already exists
        const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
        const existingUser = checkStmt.get(email);
        
        if (existingUser) {
          return { message: 'Email already in use', code: 'DUPLICATE' };
        }
        
        // Generate a unique ID
        const id = crypto.randomUUID();
        
        // Insert the user
        const insertStmt = db.prepare('INSERT INTO users (id, name, email, password, timezone) VALUES (?, ?, ?, ?, ?)');
        insertStmt.run(id, name, email, password, timezone || null);
        
        return { id, name, email, timezone };
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Update an existing user
    updateUser: (_, { userId, input }, context) => {
      const { name, email, password, timezone } = input;
      
      // Check ownership
      checkOwnership(userId, context);
      
      if (!name && !email && !password && !timezone) {
        return { message: 'At least one field is required', code: 'BAD_INPUT' };
      }
      
      if (email && !isValidEmail(email)) {
        return { message: 'Invalid email format', code: 'BAD_INPUT' };
      }
      
      try {
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
        const stmt = db.prepare(query);
        const result = stmt.run(...values);
        
        if (result.changes === 0) {
          return { message: 'User not found', code: 'NOT_FOUND' };
        }
        
        // Get updated user
        const getStmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const updatedUser = getStmt.get(userId);
        
        return updatedUser;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Delete a user
    deleteUser: (_, { userId }, context) => {
      // Check ownership
      checkOwnership(userId, context);
      
      try {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        const result = stmt.run(userId);
        
        if (result.changes === 0) {
          throw new Error('User not found');
        }
        
        return true;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
  },
};
