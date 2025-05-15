// Root resolver module
import { DateTimeScalar, JSONScalar } from './scalars.js';
import { userResolvers } from './userResolvers.js';
import { eventResolvers } from './eventResolvers.js';
import { scheduleResolvers } from './scheduleResolvers.js';
import { appointmentResolvers } from './appointmentResolvers.js';
import { sessionResolvers } from './sessionResolvers.js';
import { availabilityResolvers } from './availabilityResolvers.js';

// Combine all resolvers
export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  
  Query: {
    ...userResolvers.Query,
    ...eventResolvers.Query,
    ...scheduleResolvers.Query,
    ...appointmentResolvers.Query,
    ...availabilityResolvers.Query,
  },
  
  Mutation: {
    ...userResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...scheduleResolvers.Mutation,
    ...appointmentResolvers.Mutation,
    ...sessionResolvers.Mutation,
  },
  
  // Union resolvers
  UserResult: {
    __resolveType(obj) {
      if (obj.message) return 'Error';
      return 'User';
    },
  },
  
  EventResult: {
    __resolveType(obj) {
      if (obj.message) return 'Error';
      return 'Event';
    },
  },
    AppointmentResult: {
    __resolveType(obj) {
      console.log('AppointmentResult __resolveType called with:', obj);
      if (obj.message) return 'Error';
      
      // Check if we have the required fields for an Appointment
      const hasAppointmentFields = obj.id && obj.eventId && obj.userId && obj.inviteeEmail;
      console.log('Has appointment fields:', hasAppointmentFields);
      
      if (!hasAppointmentFields) {
        console.log('Warning: Object does not have required Appointment fields:', obj);
      }
      
      return 'Appointment';
    },
  },
  
  ScheduleResult: {
    __resolveType(obj) {
      if (obj.message) return 'Error';
      return 'Schedule';
    },
  },
};
