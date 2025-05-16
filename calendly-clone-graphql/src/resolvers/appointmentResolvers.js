// Appointment resolvers
import { db } from '../server.js';
import crypto from 'crypto';
import { isValidEmail } from '../utils/validators.js';

// Helper function to check auth
const checkAuth = (context) => {
  if (!context.user) {
    return null;
  }
  return context.user;
};

// Helper function to check appointment ownership
const checkAppointmentOwnership = async (appointmentId, context) => {
  const user = checkAuth(context);
  if (!user) {
    return { authorized: false, error: 'Authentication required' };
  }
  
  try {
    const appointment = await db.get('SELECT userId FROM appointments WHERE id = ?', [appointmentId]);
    
    // For delete operations, if the appointment doesn't exist (possibly already deleted by REST API),
    // we consider it an authorized operation
    if (!appointment) {
      console.log(`Appointment ${appointmentId} not found during ownership check, assuming already deleted`);
      return { authorized: true, user, notFound: true };
    }
    
    if (appointment.userId !== user.id) {
      return { authorized: false, error: 'Forbidden: You can only modify your own appointments' };
    }
    
    return { authorized: true, user };
  } catch (error) {
    console.error('Database error:', error);
    return { authorized: false, error: 'Database error' };
  }
};

export const appointmentResolvers = {
  Query: {
    // Get appointment by ID
    appointment: async (_, { appointmentId }, context) => {
      const user = checkAuth(context);
      if (!user) {
        return { message: 'Authentication required', code: 'UNAUTHORIZED' };
      }
      
      try {
        const appointment = await db.get('SELECT * FROM appointments WHERE id = ? AND userId = ?', [appointmentId, user.id]);
        
        if (!appointment) {
          return { message: 'Appointment not found', code: 'NOT_FOUND' };
        }
        
        return appointment;
      } catch (error) {
        console.error('Database error:', error);
        return { message: error.message, code: 'DATABASE_ERROR' };
      }
    },
    
    // Get all appointments for a user with optional status filter
    appointments: async (_, { userId, status, page = 1, pageSize = 20 }, context) => {
      const user = checkAuth(context);
      if (!user) {
        return { message: 'Authentication required', code: 'UNAUTHORIZED' };
      }
      
      // Users can only see their own appointments unless they are admins
      if (userId !== user.id) {
        return { message: 'Forbidden: You can only access your own appointments', code: 'FORBIDDEN' };
      }
      
      const offset = (page - 1) * pageSize;
      
      try {
        let query = 'SELECT * FROM appointments WHERE userId = ?';
        const params = [userId];
        
        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }
        
        query += ' ORDER BY startTime DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);
        
        const data = await db.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as count FROM appointments WHERE userId = ?';
        const countParams = [userId];
        
        if (status) {
          countQuery += ' AND status = ?';
          countParams.push(status);
        }
        
        const countResult = await db.get(countQuery, countParams);
        const count = countResult.count;
        
        return {
          data,
          pagination: {
            page,
            pageSize,
            total: count
          }
        };
      } catch (error) {
        console.error('Database error:', error);
        return { message: 'Database error', code: 'DATABASE_ERROR' };
      }
    },
    
    // Get all appointments (admin access)
    allAppointments: async (_, { page = 1, pageSize = 20 }, context) => {
      const user = checkAuth(context);
      if (!user) {
        return { message: 'Authentication required', code: 'UNAUTHORIZED' };
      }
      
      // In a production app, you would add admin check here
      // For now, we'll allow any authenticated user to see all appointments
      
      const offset = (page - 1) * pageSize;
      
      try {
        const data = await db.query('SELECT * FROM appointments ORDER BY startTime DESC LIMIT ? OFFSET ?', [pageSize, offset]);
        
        // Get total count for pagination
        const countResult = await db.get('SELECT COUNT(*) as count FROM appointments');
        const count = countResult.count;
        
        return {
          data,
          pagination: {
            page,
            pageSize,
            total: count
          }
        };
      } catch (error) {
        console.error('Database error:', error);
        return { message: 'Database error', code: 'DATABASE_ERROR' };
      }
    }
  },
  
  Mutation: {
    // Create a new appointment
    createAppointment: async (_, { input }, context) => {
      const { eventId, inviteeEmail, startTime, endTime } = input;
      const user = checkAuth(context);
      
      if (!user) {
        return { message: 'Authentication required', code: 'UNAUTHORIZED' };
      }
      
      const status = 'scheduled'; // Default status
      
      if (!eventId || !inviteeEmail || !startTime || !endTime) {
        return { message: 'All fields are required', code: 'BAD_INPUT' };
      }
      
      if (!isValidEmail(inviteeEmail)) {
        return { message: 'Invalid invitee email format', code: 'BAD_INPUT' };
      }
      
      try {
        // Verify event exists and belongs to user
        const event = await db.get('SELECT id FROM events WHERE id = ? AND userId = ?', [eventId, user.id]);
        
        if (!event) {
          return { message: 'Event not found or access denied', code: 'NOT_FOUND' };
        }
        
        const id = crypto.randomUUID();
        console.log('Creating new appointment:', { id, eventId, inviteeEmail, startTime, endTime, status });
        
        // Insert the appointment directly - the db wrapper handles transactions internally
        const result = await db.run(
          'INSERT INTO appointments (id, eventId, userId, inviteeEmail, startTime, endTime, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, eventId, user.id, inviteeEmail, startTime, endTime, status]
        );
        
        console.log('Insert appointment result:', result);
        
        // Verify appointment was actually created in database
        const saved = await db.get('SELECT * FROM appointments WHERE id = ?', [id]);
        console.log('Appointment verified in database:', saved ? 'Success' : 'Failed');
        
        if (!saved) {
          return { message: 'Failed to save appointment to database', code: 'DATABASE_ERROR' };
        }
        
        // Need to explicitly include all required fields from the Appointment type
        // This will ensure it's properly resolved as an Appointment in the AppointmentResult union
        console.log('Returning appointment data:', { id, eventId, userId: user.id, inviteeEmail, startTime, endTime, status });
        
        // Make sure userId is included in the response to meet the Appointment type requirements
        return {
          ...saved,
          userId: user.id // Ensure userId is explicitly included
        };
      } catch (error) {
        console.error('Database error:', error);
        return { message: error.message, code: 'DATABASE_ERROR' };
      }
    },
    
    // Update an appointment
    updateAppointment: async (_, { appointmentId, input }, context) => {
      const { eventId, inviteeEmail, startTime, endTime, status } = input;
      
      // Check appointment ownership
      const authCheck = await checkAppointmentOwnership(appointmentId, context);
      if (!authCheck.authorized) {
        return { message: authCheck.error, code: 'UNAUTHORIZED' };
      }
      
      if (!eventId && !inviteeEmail && !startTime && !endTime && !status) {
        return { message: 'At least one field is required', code: 'BAD_INPUT' };
      }
      
      if (inviteeEmail && !isValidEmail(inviteeEmail)) {
        return { message: 'Invalid invitee email format', code: 'BAD_INPUT' };
      }
      
      try {
        const fields = [];
        const values = [];
        
        if (eventId) {
          fields.push('eventId = ?');
          values.push(eventId);
        }
        if (inviteeEmail) {
          fields.push('inviteeEmail = ?');
          values.push(inviteeEmail);
        }
        if (startTime) {
          fields.push('startTime = ?');
          values.push(startTime);
        }
        if (endTime) {
          fields.push('endTime = ?');
          values.push(endTime);
        }
        if (status) {
          fields.push('status = ?');
          values.push(status);
        }
        
        values.push(appointmentId);
        
        const query = `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`;
        const result = await db.run(query, values);
        
        if (result.changes === 0) {
          return { message: 'Appointment not found', code: 'NOT_FOUND' };
        }
        
        // Get updated appointment
        const updatedAppointment = await db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
        
        return updatedAppointment;
      } catch (error) {
        console.error('Database error:', error);
        return { message: error.message, code: 'DATABASE_ERROR' };
      }
    },
    
    // Delete an appointment
    deleteAppointment: async (_, { appointmentId }, context) => {
      // Check appointment ownership
      const authCheck = await checkAppointmentOwnership(appointmentId, context);
      if (!authCheck.authorized) {
        return false;
      }
      
      try {
        // Check if the appointment exists first - it might have been already deleted by the REST API
        const appointment = await db.get('SELECT id FROM appointments WHERE id = ?', [appointmentId]);
        
        // If the appointment doesn't exist, consider the deletion successful
        if (!appointment) {
          console.log(`Appointment ${appointmentId} not found, considering deletion successful`);
          return true;
        }
        
        const result = await db.run('DELETE FROM appointments WHERE id = ?', [appointmentId]);
        
        return result.changes > 0;
      } catch (error) {
        console.error('Database error:', error);
        return false;
      }
    }
  }
};
