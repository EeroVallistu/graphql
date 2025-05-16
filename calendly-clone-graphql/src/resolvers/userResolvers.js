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
const checkOwnership = async (userId, context) => {
  const user = checkAuth(context);
  
  // For delete/update operations, first check if the user exists
  try {
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    
    // If user doesn't exist (possibly already deleted by REST API),
    // but the user is trying to delete their own data, consider it authorized
    if (!existingUser && user.id === userId) {
      console.log(`User ${userId} not found during ownership check, assuming already deleted`);
      return { ...user, notFound: true };
    }
  } catch (error) {
    console.error('Database error during user existence check:', error);
    // Continue with normal flow even if this check fails
  }
  
  if (user.id !== userId) {
    throw new Error('Forbidden: You can only access or modify your own data');
  }
  
  return user;
};

// User resolvers
export const userResolvers = {
  Query: {
    // Get all users with pagination
    users: async (_, { page = 1, pageSize = 20 }, context) => {
      // Auth check
      checkAuth(context);
      
      const offset = (page - 1) * pageSize;
      
      try {
        const data = await db.query('SELECT * FROM users LIMIT ? OFFSET ?', [pageSize, offset]);
        
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
    user: async (_, { userId }, context) => {
      // Auth check
      checkAuth(context);
      
      try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (!user) {
          return { message: 'User not found', code: 'NOT_FOUND' };
        }
        
        return user;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Get current authenticated user
    me: async (_, __, context) => {
      // Auth check - will throw if not authenticated
      const user = checkAuth(context);
      
      // Return the user from context directly
      return user;
    },
  },
  
  Mutation: {
    // Create a new user
    createUser: async (_, { input }) => {
      const { name, email, password, timezone } = input;
      
      if (!name || !email || !password) {
        return { message: 'Name, email, and password are required', code: 'BAD_INPUT' };
      }
      
      if (!isValidEmail(email)) {
        return { message: 'Invalid email format', code: 'BAD_INPUT' };
      }
      
      try {
        // Check if email already exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        
        if (existingUser) {
          return { message: 'Email already in use', code: 'DUPLICATE' };
        }
        
        // Generate a unique ID
        const id = crypto.randomUUID();
        
        console.log('Creating new user:', { id, name, email });
        
        try {
          // Insert the user
          const result = await db.run(
            'INSERT INTO users (id, name, email, password, timezone) VALUES (?, ?, ?, ?, ?)', 
            [id, name, email, password, timezone || null]
          );
          
          console.log('Insert result:', result);
          console.log('User created and committed to database');
          
          // Verify user was actually created in database
          const verifiedUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
          console.log('User verified in database:', verifiedUser ? true : false);
          
          return { id, name, email, timezone };
        } catch (txError) {
          // Error handling
          console.error('Transaction error:', txError);
          throw txError;
        }
      } catch (error) {
        console.error('Database error:', error);
        return { message: error.message, code: 'DATABASE_ERROR' };
      }
    },
    
    // Update an existing user
    updateUser: async (_, { userId, input }, context) => {
      const { name, email, password, timezone } = input;
      
      // Check ownership
      await checkOwnership(userId, context);
      
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
        const result = await db.run(query, values);
        
        if (result.changes === 0) {
          return { message: 'User not found', code: 'NOT_FOUND' };
        }
        
        // Get updated user
        const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        
        return updatedUser;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Delete a user
    deleteUser: async (_, { userId }, context) => {
      // Check ownership
      checkOwnership(userId, context);
      
      try {
        // Check if the user exists first - it might have been already deleted by the REST API
        const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
        
        // If the user doesn't exist, consider the deletion successful
        if (!user) {
          console.log(`User ${userId} not found, considering deletion successful`);
          return true;
        }
        
        const result = await db.run('DELETE FROM users WHERE id = ?', [userId]);
        
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
