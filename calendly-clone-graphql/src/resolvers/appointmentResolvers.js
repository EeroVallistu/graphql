// Appointment resolvers
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

// Helper function to check appointment ownership
const checkAppointmentOwnership = async (appointmentId, context) => {
  const user = checkAuth(context);
  
  try {
    const stmt = db.prepare('SELECT userId FROM appointments WHERE id = ?');
    const appointment = stmt.get(appointmentId);
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    if (appointment.userId !== user.id) {
      throw new Error('Forbidden: You can only modify your own appointments');
    }
    
    return user;
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
};

export const appointmentResolvers = {
  Query: {
    // Get appointment by ID
    appointment: async (_, { appointmentId }, context) => {
      try {
        await checkAppointmentOwnership(appointmentId, context);
        
        const stmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
        const appointment = stmt.get(appointmentId);
        
        if (!appointment) {
          return { message: 'Appointment not found', code: 'NOT_FOUND' };
        }
        
        return appointment;
      } catch (error) {
        if (error.message.includes('Appointment not found')) {
          return { message: 'Appointment not found', code: 'NOT_FOUND' };
        } else if (error.message.includes('Forbidden')) {
          return { message: error.message, code: 'FORBIDDEN' };
        }
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Get all appointments for a user, optionally filtered by status
    appointments: (_, { userId, status }, context) => {
      const user = checkAuth(context);
      
      // Users can only see their own appointments
      if (userId !== user.id) {
        throw new Error('Forbidden: You can only access your own appointments');
      }
      
      try {
        let query = 'SELECT * FROM appointments WHERE userId = ?';
        const params = [userId];
        
        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }
        
        const stmt = db.prepare(query);
        return stmt.all(...params);
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    }
  },
  
  Mutation: {
    // Create a new appointment
    createAppointment: (_, { input }, context) => {
      const { eventId, inviteeEmail, startTime, endTime } = input;
      const user = checkAuth(context);
      const status = 'scheduled'; // Default status
      
      if (!eventId || !inviteeEmail || !startTime || !endTime) {
        return { message: 'All fields are required', code: 'BAD_INPUT' };
      }
      
      if (!isValidEmail(inviteeEmail)) {
        return { message: 'Invalid invitee email format', code: 'BAD_INPUT' };
      }
      
      try {
        const id = crypto.randomUUID();
        
        const stmt = db.prepare(
          'INSERT INTO appointments (id, eventId, userId, inviteeEmail, startTime, endTime, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run(id, eventId, user.id, inviteeEmail, startTime, endTime, status);
        
        return { id, eventId, userId: user.id, inviteeEmail, startTime, endTime, status };
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    },
    
    // Update an appointment
    updateAppointment: async (_, { appointmentId, input }, context) => {
      const { eventId, inviteeEmail, startTime, endTime, status } = input;
      
      // Check appointment ownership
      await checkAppointmentOwnership(appointmentId, context);
      
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
        throw new Error('Database error');
      }
    },
    
    // Delete an appointment
    deleteAppointment: async (_, { appointmentId }, context) => {
      // Check appointment ownership
      await checkAppointmentOwnership(appointmentId, context);
      
      try {
        const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
        const result = stmt.run(appointmentId);
        
        if (result.changes === 0) {
          throw new Error('Appointment not found');
        }
        
        return true;
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Database error');
      }
    }
  }
};
