// Event resolvers
import { db } from '../server.js';
import crypto from 'crypto';
import { isValidHexColor } from '../utils/validators.js';

// Helper function to check auth
const checkAuth = (context) => {
  if (!context.user) {
    return null;
  }
  return context.user;
};

// Helper function to check event ownership
const checkEventOwnership = async (eventId, context) => {
  const user = checkAuth(context);
  if (!user) {
    return { authorized: false, error: 'Authentication required' };
  }
  
  try {
    const event = await db.get('SELECT userId FROM events WHERE id = ?', [eventId]);
    
    if (!event) {
      return { authorized: false, error: 'Event not found' };
    }
    
    if (event.userId !== user.id) {
      return { authorized: false, error: 'Forbidden: You can only modify your own events' };
    }
    
    return { authorized: true, user };
  } catch (error) {
    console.error('Database error:', error);
    return { authorized: false, error: 'Database error' };
  }
};

export const eventResolvers = {
  Query: {
    // Get event by ID
    event: async (_, { eventId }, context) => {
      const user = checkAuth(context);
      if (!user) {
        return { message: 'Authentication required', code: 'UNAUTHORIZED' };
      }
      
      try {
        const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
        
        if (!event) {
          return { message: 'Event not found', code: 'NOT_FOUND' };
        }
        
        // Check if the user is the owner of this event
        if (event.userId !== user.id) {
          event.isOwner = false;
        } else {
          event.isOwner = true;
        }
        
        return event;
      } catch (error) {
        console.error('Database error:', error);
        return { message: 'Database error', code: 'DATABASE_ERROR' };
      }
    },
    
    // Get all events for a user
    events: async (_, { userId, page = 1, pageSize = 20 }, context) => {
      const user = checkAuth(context);
      if (!user) {
        return { 
          data: [], 
          pagination: { page, pageSize, total: 0 } 
        };
      }
      
      // Users can view their own events
      if (userId !== user.id) {
        return { 
          data: [], 
          pagination: { page, pageSize, total: 0 } 
        };
      }
      
      try {
        const events = await db.query('SELECT * FROM events WHERE userId = ?', [userId]);
        
        // Mark all events as owned by the user
        const eventData = events.map(event => ({ ...event, isOwner: true }));
        
        return {
          data: eventData,
          pagination: {
            page,
            pageSize,
            total: eventData.length
          }
        };
      } catch (error) {
        console.error('Database error:', error);
        return { 
          data: [], 
          pagination: { page, pageSize, total: 0 } 
        };
      }
    }
  },
  
  Mutation: {
    // Create a new event
    createEvent: async (_, { input }, context) => {
      const { name, duration, description, color } = input;
      const user = checkAuth(context);
      
      if (!user) {
        return { message: 'Authentication required', code: 'UNAUTHORIZED' };
      }
      
      if (!name || !duration) {
        return { message: 'Name and duration are required', code: 'BAD_INPUT' };
      }
      
      if (color && !isValidHexColor(color)) {
        return { message: 'Color must be a valid hex color (e.g., #FF0000)', code: 'BAD_INPUT' };
      }
      
      try {
        const id = crypto.randomUUID();
        
        console.log('Creating new event:', { id, name, duration, description, color, userId: user.id });
        
        // Insert the event
        const result = await db.run(
          'INSERT INTO events (id, name, duration, description, color, userId) VALUES (?, ?, ?, ?, ?, ?)',
          [id, name, duration, description, color, user.id]
        );
        
        console.log('Insert event result:', result);
        console.log('Event created and committed to database');
        
        // Commenting out DatabaseVerifier which doesn't seem to exist
        // const wasInserted = DatabaseVerifier.verifyEvent(id);
        // console.log('Event verified in database:', wasInserted);
        
        // DatabaseVerifier.getDatabasePath();
        // DatabaseVerifier.countRows('events');
        
        return { 
          id, 
          name, 
          duration, 
          description, 
          color, 
          userId: user.id,
          isOwner: true
        };
      } catch (error) {
        console.error('Database error:', error);
        return { message: error.message, code: 'DATABASE_ERROR' };
      }
    },
    
    // Update an existing event
    updateEvent: async (_, { eventId, input }, context) => {
      const { name, duration, description, color } = input;
      
      // Check event ownership
      const authCheck = await checkEventOwnership(eventId, context);
      if (!authCheck.authorized) {
        return { message: authCheck.error, code: 'UNAUTHORIZED' };
      }
      
      if (!name && !duration && !description && color === undefined) {
        return { message: 'At least one field is required', code: 'BAD_INPUT' };
      }
      
      if (color !== undefined && color !== null && !isValidHexColor(color)) {
        return { message: 'Color must be a valid hex color (e.g., #FF0000)', code: 'BAD_INPUT' };
      }
      
      try {
        const fields = [];
        const values = [];
        
        if (name) {
          fields.push('name = ?');
          values.push(name);
        }
        if (duration) {
          fields.push('duration = ?');
          values.push(duration);
        }
        if (description !== undefined) {
          fields.push('description = ?');
          values.push(description);
        }
        if (color !== undefined) {
          fields.push('color = ?');
          values.push(color);
        }
        
        values.push(eventId);
        
        const query = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;
        const result = await db.run(query, values);
        
        if (result.changes === 0) {
          return { message: 'Event not found', code: 'NOT_FOUND' };
        }
        
        // Get updated event
        const updatedEvent = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
        updatedEvent.isOwner = true;
        
        return updatedEvent;
      } catch (error) {
        console.error('Database error:', error);
        return { message: error.message, code: 'DATABASE_ERROR' };
      }
    },
    
    // Delete an event
    deleteEvent: async (_, { eventId }, context) => {
      // Check event ownership
      const authCheck = await checkEventOwnership(eventId, context);
      if (!authCheck.authorized) {
        return false;
      }
      
      try {
        const result = await db.run('DELETE FROM events WHERE id = ?', [eventId]);
        
        return result.changes > 0;
      } catch (error) {
        console.error('Database error:', error);
        return false;
      }
    }
  }
};
