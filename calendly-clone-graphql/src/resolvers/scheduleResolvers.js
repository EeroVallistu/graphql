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
    schedules: (_, __, context) => {
      const user = checkAuth(context);
      
      try {
        const stmt = db.prepare('SELECT * FROM schedules WHERE userId = ?');
        const rows = stmt.all(user.id);
        
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
    schedule: (_, { userId }, context) => {
      // This endpoint should be accessible without authentication (skipAuth directive)
      // Check if this operation should skip auth
      
      try {
        console.log(`Getting schedule for user ${userId}, skipAuth: ${context.skipAuth}`);
        
        const stmt = db.prepare('SELECT * FROM schedules WHERE userId = ?');
        const row = stmt.get(userId);
        
        if (!row) {
          return { message: 'Schedule not found', code: 'NOT_FOUND' };
        }
        
        // Parse availability from JSON string
        try {
          row.availability = typeof row.availability === 'string'
            ? JSON.parse(row.availability)
            : row.availability;
          
          return row;
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
    createSchedule: (_, { input }, context) => {
      const { userId, availability } = input;
      
      // Check ownership
      checkOwnership(userId, context);
      
      if (!availability) {
        return { message: 'Availability is required', code: 'BAD_INPUT' };
      }
      
      try {
        const availabilityJson = JSON.stringify(availability);
        
        const stmt = db.prepare('INSERT INTO schedules (userId, availability) VALUES (?, ?)');
        const result = stmt.run(userId, availabilityJson);
        
        return {
          id: result.lastInsertRowid,
          userId,
          availability
        };
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Update schedule
    updateSchedule: (_, { userId, input }, context) => {
      const { availability } = input;
      
      // Check ownership
      checkOwnership(userId, context);
      
      if (!availability) {
        return { message: 'Availability is required', code: 'BAD_INPUT' };
      }
      
      try {
        const availabilityJson = JSON.stringify(availability);
        
        const stmt = db.prepare('UPDATE schedules SET availability = ? WHERE userId = ?');
        const result = stmt.run(availabilityJson, userId);
        
        if (result.changes === 0) {
          return { message: 'Schedule not found', code: 'NOT_FOUND' };
        }
        
        // Get the updated schedule
        const getStmt = db.prepare('SELECT * FROM schedules WHERE userId = ?');
        const updatedSchedule = getStmt.get(userId);
        
        if (!updatedSchedule) {
          return { message: 'Schedule not found after update', code: 'NOT_FOUND' };
        }
        
        // Parse availability
        updatedSchedule.availability = typeof updatedSchedule.availability === 'string'
          ? JSON.parse(updatedSchedule.availability)
          : updatedSchedule.availability;
        
        return updatedSchedule;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Delete schedule
    deleteSchedule: (_, { userId }, context) => {
      // Check ownership
      checkOwnership(userId, context);
      
      try {
        const stmt = db.prepare('DELETE FROM schedules WHERE userId = ?');
        const result = stmt.run(userId);
        
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
