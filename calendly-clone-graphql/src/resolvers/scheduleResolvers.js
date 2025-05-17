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
const checkOwnership = async (userId, context) => {
  const user = checkAuth(context);
  
  // For delete/update operations, first check if the schedule exists
  try {
    const schedule = await db.get('SELECT userId FROM schedules WHERE userId = ?', [userId]);
    
    // If schedule doesn't exist for this userId (possibly already deleted by REST API),
    // but the user is trying to delete their own data, consider it authorized
    if (!schedule && user.id === userId) {
      console.log(`Schedule for user ${userId} not found during ownership check, assuming already deleted`);
      return { ...user, notFound: true };
    }
  } catch (error) {
    console.error('Database error during schedule existence check:', error);
    // Continue with normal flow even if this check fails
  }
  
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
        // Parse availability for each schedule and explicitly include id
        return rows.map(row => ({
          id: row.id,
          userId: row.userId,
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
      await checkOwnership(userId, context);
      
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
      await checkOwnership(userId, context);
      
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
      const user = await checkOwnership(userId, context);
      
      // If checkOwnership returned with notFound flag, consider deletion already successful
      if (user.notFound) {
        return true;
      }
      
      try {
        // Check if the schedule exists first
        const schedule = await db.get('SELECT userId FROM schedules WHERE userId = ?', [userId]);
        
        // If the schedule doesn't exist, consider the deletion successful
        if (!schedule) {
          console.log(`Schedule for user ${userId} not found, considering deletion successful`);
          return true;
        }
        
        const result = await db.run('DELETE FROM schedules WHERE userId = ?', [userId]);
        
        if (result.changes === 0) {
          console.log(`No rows affected when deleting schedule for user ${userId}`);
          return true; // Still consider it a success if no rows were affected
        }
        
        return true;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    }
  }
};
