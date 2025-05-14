// Root resolver module
import { DateTimeScalar, JSONScalar } from './scalars.js';
import { userResolvers } from './userResolvers.js';
import { eventResolvers } from './eventResolvers.js';
import { scheduleResolvers } from './scheduleResolvers.js';
import { appointmentResolvers } from './appointmentResolvers.js';
import { sessionResolvers } from './sessionResolvers.js';

// Combine all resolvers
export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  
  Query: {
    ...userResolvers.Query,
    ...eventResolvers.Query,
    ...scheduleResolvers.Query,
    ...appointmentResolvers.Query,
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
      if (obj.message) return 'Error';
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
