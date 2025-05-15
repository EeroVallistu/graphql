// Availability resolvers
import { db } from '../server.js';

/**
 * Calculate available time slots for scheduling based on:
 * 1. User's schedule/availability settings
 * 2. Existing appointments
 * 3. Date range requested
 */
export const availabilityResolvers = {
  Query: {
    // Get available time slots for a specific user within a date range
    availableSlots: async (_, { userId, dateRange }) => {
      const { startDate, endDate } = dateRange;
      
      try {
        // 1. Get user's schedule settings
        const scheduleData = await db.get(
          'SELECT * FROM schedules WHERE userId = ?',
          [userId]
        );
        
        if (!scheduleData) {
          throw new Error('No schedule found for this user');
        }
        
        // Parse the availability JSON
        let availability;
        try {
          availability = JSON.parse(scheduleData.availability);
        } catch (error) {
          console.error('Failed to parse availability:', error);
          throw new Error('Invalid availability data format');
        }
        
        // 2. Get all existing appointments for the user in the date range
        const appointments = await db.query(
          'SELECT * FROM appointments WHERE userId = ? AND startTime >= ? AND endTime <= ? AND status != "canceled"',
          [userId, startDate, endDate]
        );
        
        // 3. Calculate available slots based on schedule and existing appointments
        const availableSlots = calculateAvailableSlots(
          availability,
          appointments,
          startDate,
          endDate
        );
        
        return availableSlots;
      } catch (error) {
        console.error('Error getting available slots:', error);
        throw new Error('Failed to retrieve available time slots');
      }
    }
  }
};

/**
 * Calculate available time slots based on user's availability settings and existing appointments
 * 
 * @param {Object} availability - User's availability settings
 * @param {Array} appointments - Existing appointments
 * @param {String} startDate - Start of date range (ISO string)
 * @param {String} endDate - End of date range (ISO string)
 * @returns {Array} - Array of available time slots
 */
function calculateAvailableSlots(availability, appointments, startDate, endDate) {
  const availableSlots = [];
  
  // Parse date range
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  
  // Get all days in the date range
  const currentDate = new Date(startDateTime);
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Iterate through each day in the date range
  while (currentDate <= endDateTime) {
    const dayOfWeek = daysOfWeek[currentDate.getDay()];
    
    // Check if user has availability for this day of week
    const dayAvailability = availability.find(slot => slot.day.toLowerCase() === dayOfWeek);
    
    if (dayAvailability) {
      // Get time slots for the day based on user's availability
      const daySlots = generateDayTimeSlots(currentDate, dayAvailability);
      
      // Filter out slots that conflict with existing appointments
      const availableDaySlots = filterAvailableSlots(daySlots, appointments);
      
      availableSlots.push(...availableDaySlots);
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return availableSlots;
}

/**
 * Generate time slots for a specific day based on availability settings
 */
function generateDayTimeSlots(date, dayAvailability) {
  const slots = [];
  const { startTime, endTime } = dayAvailability;
  
  // Parse start and end times (formats like "09:00" or "17:30")
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Create slots (e.g., 30-minute increments)
  const slotDurationMinutes = 30; // Default slot duration
  
  // Set start time
  const slotStart = new Date(date);
  slotStart.setHours(startHour, startMinute, 0, 0);
  
  // Set end time
  const availabilityEnd = new Date(date);
  availabilityEnd.setHours(endHour, endMinute, 0, 0);
  
  // Generate slots
  while (slotStart < availabilityEnd) {
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + slotDurationMinutes);
    
    // Don't create slots that extend beyond the available end time
    if (slotEnd <= availabilityEnd) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: true
      });
    }
    
    // Move to next slot start time
    slotStart.setMinutes(slotStart.getMinutes() + slotDurationMinutes);
  }
  
  return slots;
}

/**
 * Filter out slots that conflict with existing appointments
 */
function filterAvailableSlots(slots, appointments) {
  return slots.map(slot => {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    
    // Check for conflicts with any appointments
    const isConflicting = appointments.some(appointment => {
      const appointmentStart = new Date(appointment.startTime);
      const appointmentEnd = new Date(appointment.endTime);
      
      // Check if there's an overlap
      return (
        (slotStart >= appointmentStart && slotStart < appointmentEnd) || 
        (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
        (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
      );
    });
    
    return {
      ...slot,
      available: !isConflicting
    };
  });
}
