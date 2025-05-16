// Schedule resolvers
import { db } from '../server.js';

// Helper function to check auth
const checkAuth = (context) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
};

// Helper function to check ownership
const checkOwnership = (userId, context) => {
  const user = checkAuth(context);
  if (user.id !== userId) {
    throw new Error('Forbidden: You can only access or modify your own data');
  }
  return user;
};

export const scheduleResolvers = {
  Query: {
    // Get all schedules (admin only, but here limited to user's own)
    schedules: async (_, __, context) => {
      const user = checkAuth(context);
      
      try {
        const rows = await db.query('SELECT * FROM schedules WHERE userId = ?', [user.id]);
        
        // Parse availability for each schedule
        return rows.map(row => ({
          ...row,
          availability: typeof row.availability === 'string' 
            ? JSON.parse(row.availability) 
            : row.availability
        }));
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Get user's schedule (public view for booking)
    schedule: async (_, { userId }, context) => {
      // This endpoint should be accessible without authentication (skipAuth directive)
      // Check if this operation should skip auth
      
      try {
        console.log(`Getting schedule for user ${userId}, skipAuth: ${context.skipAuth}`);
        
        const row = await db.get('SELECT * FROM schedules WHERE userId = ?', [userId]);
        
        if (!row) {
          return { message: 'Schedule not found', code: 'NOT_FOUND' };
        }
        
        // Parse availability from JSON string
        try {
          row.availability = typeof row.availability === 'string'
            ? JSON.parse(row.availability)
            : row.availability;
          
          // Make sure to explicitly include id in the returned object
          return {
            id: row.id,
            userId: row.userId,
            availability: row.availability
          };
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return { message: 'Failed to parse availability data', code: 'PARSE_ERROR' };
        }
      } catch (error) {
        console.error('Database error:', error);
        return { message: 'Database error', code: 'DATABASE_ERROR' };
      }
    }
  },
  
  Mutation: {
    // Create schedule
    createSchedule: async (_, { input }, context) => {
      const { userId, availability } = input;
      
      // Check ownership
      checkOwnership(userId, context);
      
      if (!availability) {
        return { message: 'Availability is required', code: 'BAD_INPUT' };
      }
      
      try {
        const availabilityJson = JSON.stringify(availability);
        
        const result = await db.run('INSERT INTO schedules (userId, availability) VALUES (?, ?)', [userId, availabilityJson]);
        
        // Explicitly include the id in the response
        return {
          id: result.lastID,  // Using lastID which is standard in many SQLite libraries
          userId,
          availability
        };
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Update schedule
    updateSchedule: async (_, { userId, input }, context) => {
      const { availability } = input;
      
      // Check ownership
      checkOwnership(userId, context);
      
      if (!availability) {
        return { message: 'Availability is required', code: 'BAD_INPUT' };
      }
      
      try {
        const availabilityJson = JSON.stringify(availability);
        
        const result = await db.run('UPDATE schedules SET availability = ? WHERE userId = ?', [availabilityJson, userId]);
        
        if (result.changes === 0) {
          return { message: 'Schedule not found', code: 'NOT_FOUND' };
        }
        
        // Get the updated schedule
        const updatedSchedule = await db.get('SELECT * FROM schedules WHERE userId = ?', [userId]);
        
        if (!updatedSchedule) {
          return { message: 'Schedule not found after update', code: 'NOT_FOUND' };
        }
        
        // Parse availability
        updatedSchedule.availability = typeof updatedSchedule.availability === 'string'
          ? JSON.parse(updatedSchedule.availability)
          : updatedSchedule.availability;
        
        // Explicitly include id in the response
        return {
          id: updatedSchedule.id,
          userId: updatedSchedule.userId,
          availability: updatedSchedule.availability
        };
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Delete schedule
    deleteSchedule: async (_, { userId }, context) => {
      // Check ownership
      checkOwnership(userId, context);
      
      try {
        const result = await db.run('DELETE FROM schedules WHERE userId = ?', [userId]);
        
        if (result.changes === 0) {
          throw new Error('Schedule not found');
        }
        
        return true;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    }
  }
};
