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
    const stmt = db.prepare('SELECT userId FROM appointments WHERE id = ?');
    const appointment = stmt.get(appointmentId);
    
    if (!appointment) {
      return { authorized: false, error: 'Appointment not found' };
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
        const stmt = db.prepare('SELECT * FROM appointments WHERE id = ? AND userId = ?');
        const appointment = stmt.get(appointmentId, user.id);
        
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
        
        const stmt = db.prepare(query);
        const data = stmt.all(...params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as count FROM appointments WHERE userId = ?';
        const countParams = [userId];
        
        if (status) {
          countQuery += ' AND status = ?';
          countParams.push(status);
        }
        
        const countStmt = db.prepare(countQuery);
        const { count } = countStmt.get(...countParams);
        
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
        const stmt = db.prepare('SELECT * FROM appointments ORDER BY startTime DESC LIMIT ? OFFSET ?');
        const data = stmt.all(pageSize, offset);
        
        // Get total count for pagination
        const countStmt = db.prepare('SELECT COUNT(*) as count FROM appointments');
        const { count } = countStmt.get();
        
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
    createAppointment: (_, { input }, context) => {
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
      }      try {
        // Verify event exists and belongs to user
        const eventStmt = db.prepare('SELECT id FROM events WHERE id = ? AND userId = ?');
        const event = eventStmt.get(eventId, user.id);
        
        if (!event) {
          return { message: 'Event not found or access denied', code: 'NOT_FOUND' };
        }
        
        const id = crypto.randomUUID();
        console.log('Creating new appointment:', { id, eventId, inviteeEmail, startTime, endTime, status });
        
        // Use a transaction to ensure data is committed
        db.exec('BEGIN TRANSACTION');
        
        try {
          const stmt = db.prepare(
            'INSERT INTO appointments (id, eventId, userId, inviteeEmail, startTime, endTime, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
          );
          const result = stmt.run(id, eventId, user.id, inviteeEmail, startTime, endTime, status);
          
          console.log('Insert appointment result:', result);
          
          // Commit the transaction
          db.exec('COMMIT');
          console.log('Appointment created and committed to database');
          
          // Verify appointment was actually created in database
          const verifyStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
          const saved = verifyStmt.get(id);
          console.log('Appointment verified in database:', saved ? 'Success' : 'Failed');
          
          if (!saved) {
            return { message: 'Failed to save appointment to database', code: 'DATABASE_ERROR' };
          }
            // Need to explicitly include all required fields from the Appointment type
          // This will ensure it's properly resolved as an Appointment in the AppointmentResult union
          console.log('Returning appointment data:', { id, eventId, userId: user.id, inviteeEmail, startTime, endTime, status });
          
          // Get the inserted record directly from the database to return
          const getStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
          const insertedAppointment = getStmt.get(id);
          console.log('Fetched appointment from DB:', insertedAppointment);
          
          return insertedAppointment;
        } catch (txError) {
          // Rollback on error
          console.error('Transaction error:', txError);
          db.exec('ROLLBACK');
          throw txError;
        }
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
        const stmt = db.prepare(query);
        const result = stmt.run(...values);
        
        if (result.changes === 0) {
          return { message: 'Appointment not found', code: 'NOT_FOUND' };
        }
        
        // Get updated appointment
        const getStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
        const updatedAppointment = getStmt.get(appointmentId);
        
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
        const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
        const result = stmt.run(appointmentId);
        
        return result.changes > 0;
      } catch (error) {
        console.error('Database error:', error);
        return false;
      }
    }
  }
};
