// Session resolvers for authentication
import { db } from '../server.js';
import crypto from 'crypto';

export const sessionResolvers = {
  Mutation: {
    // Login - Generate Bearer token
    login: async (_, { input }) => {
      const { email, password } = input;
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user || user.password !== password) {
          throw new Error('Invalid credentials');
        }
        
        // Generate a Bearer token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Save the token in the database
        await db.run('UPDATE users SET token = ? WHERE id = ?', [token, user.id]);
        
        return { token };
      } catch (error) {
        console.error('Login error:', error);
        throw new Error(error.message);
      }
    },
    
    // Logout - Invalidate token
    logout: async (_, __, context) => {
      if (!context.user || !context.user.token) {
        return false;
      }
      
      try {
        const result = await db.run('UPDATE users SET token = NULL WHERE token = ?', [context.user.token]);
        
        return result.changes > 0;
      } catch (error) {
        console.error('Database error:', error);
        return false;
      }
    }
  }
};
