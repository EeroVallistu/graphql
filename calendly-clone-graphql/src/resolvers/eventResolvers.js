// Event resolvers
import { db } from '../server.js';
import crypto from 'crypto';
import { isValidHexColor } from '../utils/validators.js';

// Helper function to check auth
const checkAuth = (context) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
};

// Helper function to check event ownership
const checkEventOwnership = async (eventId, context) => {
  const user = checkAuth(context);
  
  try {
    const stmt = db.prepare('SELECT userId FROM events WHERE id = ?');
    const event = stmt.get(eventId);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    if (event.userId !== user.id) {
      throw new Error('Forbidden: You can only modify your own events');
    }
    
    return user;
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
};

export const eventResolvers = {
  Query: {
    // Get event by ID
    event: (_, { eventId }, context) => {
      const user = checkAuth(context);
      
      try {
        const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
        const event = stmt.get(eventId);
        
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
        throw new Error('Database error');
      }
    },
    
    // Get all events for a user
    events: (_, { userId }, context) => {
      const user = checkAuth(context);
      
      // Users can view their own events
      if (userId !== user.id) {
        throw new Error('Forbidden: You can only access your own events');
      }
      
      try {
        const stmt = db.prepare('SELECT * FROM events WHERE userId = ?');
        const events = stmt.all(userId);
        
        // Mark all events as owned by the user
        return events.map(event => ({ ...event, isOwner: true }));
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    }
  },
  
  Mutation: {
    // Create a new event
    createEvent: (_, { input }, context) => {
      const { name, duration, description, color } = input;
      const user = checkAuth(context);
      
      if (!name || !duration) {
        return { message: 'Name and duration are required', code: 'BAD_INPUT' };
      }
      
      if (color && !isValidHexColor(color)) {
        return { message: 'Color must be a valid hex color (e.g., #FF0000)', code: 'BAD_INPUT' };
      }
      
      try {
        const id = crypto.randomUUID();
        
        const stmt = db.prepare('INSERT INTO events (id, name, duration, description, color, userId) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(id, name, duration, description, color, user.id);
        
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
        throw new Error('Database error');
      }
    },
    
    // Update an existing event
    updateEvent: async (_, { eventId, input }, context) => {
      const { name, duration, description, color } = input;
      
      // Check event ownership
      await checkEventOwnership(eventId, context);
      
      if (!name && !duration && !description && !color) {
        return { message: 'At least one field is required', code: 'BAD_INPUT' };
      }
      
      if (color && !isValidHexColor(color)) {
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
        const stmt = db.prepare(query);
        const result = stmt.run(...values);
        
        if (result.changes === 0) {
          return { message: 'Event not found', code: 'NOT_FOUND' };
        }
        
        // Get updated event
        const getStmt = db.prepare('SELECT * FROM events WHERE id = ?');
        const updatedEvent = getStmt.get(eventId);
        updatedEvent.isOwner = true;
        
        return updatedEvent;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Delete an event
    deleteEvent: async (_, { eventId }, context) => {
      // Check event ownership
      await checkEventOwnership(eventId, context);
      
      try {
        const stmt = db.prepare('DELETE FROM events WHERE id = ?');
        const result = stmt.run(eventId);
        
        if (result.changes === 0) {
          throw new Error('Event not found');
        }
        
        return true;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    }
  }
};
