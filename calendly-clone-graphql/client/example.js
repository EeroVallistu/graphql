// Minimal GraphQL client example for Calendly Clone (Node.js)
// This script demonstrates how to use each GraphQL endpoint in the API
// Run with: node example.js

const fetch = require('node-fetch');
const crypto = require('crypto');

const SERVER_URL = 'http://localhost:4000/graphql';

// Helper to generate random emails
function generateRandomEmail() {
  return `test${Date.now()}${Math.floor(Math.random()*10000)}@example.com`;
}

// Helper for GraphQL requests
async function graphqlRequest(query, token = '') {
  const headers = {
    'Content-Type': 'application/json',
    'apollo-require-preflight': 'true', // Bypass CSRF protection
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });
    return await res.json();
  } catch (error) {
    console.error('GraphQL request failed:', error.message);
    return {}; 
  }
}

// Helper to log operation with clear title
function logOperation(title, response) {
  console.log(`\n📌 ${title}`);
  console.log("Response:", JSON.stringify(response.data, null, 2));
}

// Main function to demonstrate GraphQL endpoints
(async () => {
  console.log('🚀 Calendly Clone GraphQL API Example Client\n');
  console.log('This script demonstrates all available GraphQL operations in the API');

  // ========================
  // 👤 USER MANAGEMENT
  // ========================
  console.log('\n👤 USER MANAGEMENT');
  
  // Create a user with unique email
  const email = generateRandomEmail();
  console.log(`\nCreating user with email: ${email}`);
  
  const registerMutation = `mutation {
    createUser(input: { 
      name: "Sample User", 
      email: "${email}", 
      password: "password123", 
      timezone: "Europe/Tallinn" 
    }) {
      ... on User { id name email timezone }
      ... on Error { message code }
    }
  }`;
  const userRes = await graphqlRequest(registerMutation);
  logOperation("Register a new user", userRes);
  
  const userId = userRes.data?.createUser?.id;
  if (!userId) {
    console.error('Registration failed, aborting.');
    process.exit(1);
  }
  
  // Login to get authentication token
  const loginMutation = `mutation {
    login(input: { email: "${email}", password: "password123" }) { token }
  }`;
  const loginRes = await graphqlRequest(loginMutation);
  logOperation("Login with user credentials", loginRes);
  
  const token = loginRes.data?.login?.token;
  if (!token) {
    console.error('Login failed, aborting.');
    process.exit(1);
  }
  
  // Get current user (me)
  const meQuery = `query { 
    me { 
      ... on User { id name email timezone }
      ... on Error { message code } 
    } 
  }`;
  const meRes = await graphqlRequest(meQuery, token);
  logOperation("Get current user info (me query)", meRes);
  
  // Get all users (paginated)
  const usersQuery = `query {
    users { 
      data { id name email timezone } 
      pagination { page pageSize total } 
    }
  }`;
  const usersRes = await graphqlRequest(usersQuery, token);
  logOperation("List all users (paginated)", usersRes);
  
  // Get a specific user by ID
  const singleUserQuery = `query {
    user(userId: "${userId}") {
      ... on User { id name email timezone }
      ... on Error { message code }
    }
  }`;
  const singleUserRes = await graphqlRequest(singleUserQuery, token);
  logOperation("Get specific user by ID", singleUserRes);
  
  // Update a user
  const updateUserMutation = `mutation {
    updateUser(userId: "${userId}", input: { 
      name: "Updated Username", 
      timezone: "Europe/London" 
    }) {
      ... on User { id name email timezone }
      ... on Error { message code }
    }
  }`;
  const updateUserRes = await graphqlRequest(updateUserMutation, token);
  logOperation("Update user information", updateUserRes);
  
  // ========================
  // 📅 EVENT MANAGEMENT
  // ========================
  console.log('\n📅 EVENT MANAGEMENT');

  // 2.1: Create event
  const createEventMutation = `mutation {
    createEvent(input: { 
      name: "Coffee Meeting", 
      duration: 30, 
      description: "Quick coffee catch-up", 
      color: "#4287f5" 
    }) {
      ... on Event { id name duration description color userId }
      ... on Error { message code }
    }
  }`;
  const eventRes = await graphqlRequest(createEventMutation, token);
  const eventId = eventRes.data?.createEvent?.id;
  logOperation("Create Event", eventRes);;
  if (!eventId) {
    console.error('Event creation failed, aborting.');
    process.exit(1);
  }

  // 2.2: Query events for user (paginated)
  const eventsQuery = `query {
    events(userId: "${userId}") {
      data { id name duration description color userId isOwner }
      pagination { page pageSize total }
    }
  }`;
  const eventsRes = await graphqlRequest(eventsQuery, token);
  logOperation("2.2 User Events", eventsRes);

  // 2.3: Query single event by ID
  const eventQuery = `query {
    event(eventId: "${eventId}") {
      ... on Event { id name duration description color userId isOwner }
      ... on Error { message code }
    }
  }`;
  const eventQueryRes = await graphqlRequest(eventQuery, token);
  logOperation("2.3 Single Event", eventQueryRes);

  // 2.4: Update event
  const updateEventMutation = `mutation {
    updateEvent(eventId: "${eventId}", input: { 
      duration: 45, 
      description: "Extended coffee meeting", 
      name: "Updated Meeting"
    }) {
      ... on Event { id name duration description color }
      ... on Error { message code }
    }
  }`;
  const updateEventRes = await graphqlRequest(updateEventMutation, token);
  logOperation("2.4 Update Event", updateEventRes);

  // SECTION 3: SCHEDULES
  console.log('\n📆 SECTION 3: SCHEDULES\n');

  // 3.1: Create schedule with availability
  const availabilityObj = {
    monday: [
      { start: "09:00", end: "12:00" },
      { start: "13:00", end: "17:00" }
    ],
    tuesday: [
      { start: "09:00", end: "12:00" },
      { start: "13:00", end: "17:00" }
    ]
  };
  const availabilityStr = JSON.stringify(availabilityObj).replace(/"/g, '\\"');
  const createScheduleMutation = `mutation {
    createSchedule(input: { 
      userId: "${userId}", 
      availability: "${availabilityStr}" 
    }) {
      ... on Schedule { id userId availability }
      ... on Error { message code }
    }
  }`;
  const createScheduleRes = await graphqlRequest(createScheduleMutation, token);
  logOperation("3.1 Create Schedule", createScheduleRes);

  // 3.2: Query all schedules
  const schedulesQuery = `query { 
    schedules { 
      id userId availability 
    } 
  }`;
  const schedulesRes = await graphqlRequest(schedulesQuery, token);
  logOperation("3.2 All Schedules", schedulesRes);

  // 3.3: Query specific schedule for user
  const scheduleQuery = `query {
    schedule(userId: "${userId}") {
      ... on Schedule { id userId availability }
      ... on Error { message code }
    }
  }`;
  const scheduleRes = await graphqlRequest(scheduleQuery, token);
  logOperation("3.3 User Schedule", scheduleRes);

  // 3.4: Update schedule
  const updatedAvailabilityObj = {
    monday: [
      { start: "10:00", end: "12:00" },
      { start: "14:00", end: "18:00" }
    ],
    tuesday: [
      { start: "10:00", end: "12:00" },
      { start: "14:00", end: "18:00" }
    ]
  };
  const updatedAvailabilityStr = JSON.stringify(updatedAvailabilityObj).replace(/"/g, '\\"');
  const updateScheduleMutation = `mutation {
    updateSchedule(userId: "${userId}", input: { 
      userId: "${userId}", 
      availability: "${updatedAvailabilityStr}" 
    }) {
      ... on Schedule { id userId availability }
      ... on Error { message code }
    }
  }`;
  const updateScheduleRes = await graphqlRequest(updateScheduleMutation, token);
  logOperation("3.4 Update Schedule", updateScheduleRes);

  // SECTION 4: APPOINTMENTS
  console.log('\n📋 SECTION 4: APPOINTMENTS\n');

  // 4.0: Query available slots (for next week)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const availableSlotsQuery = `query {
    availableSlots(userId: "${userId}", dateRange: { 
      startDate: "${today.toISOString()}", 
      endDate: "${nextWeek.toISOString()}" 
    }) {
      start
      end
      available
    }
  }`;
  const availableSlotsRes = await graphqlRequest(availableSlotsQuery, token);
  logOperation("4.0 Available Slots", availableSlotsRes);

  // 4.1: Create appointment
  const createAppointmentMutation = `mutation {
    createAppointment(input: { 
      eventId: "${eventId}", 
      inviteeEmail: "client@example.com", 
      startTime: "2025-05-20T10:00:00Z", 
      endTime: "2025-05-20T10:30:00Z" 
    }) {
      ... on Appointment { id eventId userId inviteeEmail startTime endTime status }
      ... on Error { message code }
    }
  }`;
  const appointmentRes = await graphqlRequest(createAppointmentMutation, token);
  const appointmentId = appointmentRes.data?.createAppointment?.id;
  logOperation("4.1 Create Appointment", appointmentRes);

  // 4.2: Query user's appointments (paginated)
  const appointmentsQuery = `query {
    appointments(userId: "${userId}") {
      data {
        id
        eventId
        userId
        inviteeEmail
        startTime
        endTime
        status
      }
      pagination {
        page
        pageSize
        total
      }
    }
  }`;
  const appointmentsRes = await graphqlRequest(appointmentsQuery, token);
  logOperation("4.2 User Appointments", appointmentsRes);

  // 4.3: Query all appointments (admin, paginated)
  const allAppointmentsQuery = `query {
    allAppointments(page: 1, pageSize: 10) {
      data { id eventId userId inviteeEmail startTime endTime status }
      pagination { page pageSize total }
    }
  }`;
  const allAppointmentsRes = await graphqlRequest(allAppointmentsQuery, token);
  logOperation("4.3 All Appointments", allAppointmentsRes);

  // 4.4: Query single appointment by ID
  const appointmentQuery = `query {
    appointment(appointmentId: "${appointmentId}") {
      ... on Appointment { id eventId userId inviteeEmail startTime endTime status }
      ... on Error { message code }
    }
  }`;
  const appointmentQueryRes = await graphqlRequest(appointmentQuery, token);
  logOperation("4.4 Single Appointment", appointmentQueryRes);

  // 4.5: Update appointment status
  const updateAppointmentMutation = `mutation {
    updateAppointment(appointmentId: "${appointmentId}", input: { 
      status: "confirmed" 
    }) {
      ... on Appointment { id status }
      ... on Error { message code }
    }
  }`;
  const updateAppointmentRes = await graphqlRequest(updateAppointmentMutation, token);
  logOperation("4.5 Update Appointment", updateAppointmentRes);

  // SECTION 5: CLEANUP
  console.log('\n🧹 SECTION 5: CLEANUP\n');
  
  // 5.1: Delete appointment
  const deleteAppointmentMutation = `mutation { 
    deleteAppointment(appointmentId: "${appointmentId}") 
  }`;
  const deleteAppointmentRes = await graphqlRequest(deleteAppointmentMutation, token);
  logOperation("5.1 Delete Appointment", deleteAppointmentRes);

  // 5.2: Delete schedule
  const deleteScheduleMutation = `mutation { 
    deleteSchedule(userId: "${userId}") 
  }`;
  const deleteScheduleRes = await graphqlRequest(deleteScheduleMutation, token);
  logOperation("5.2 Delete Schedule", deleteScheduleRes);

  // 5.3: Delete event
  const deleteEventMutation = `mutation { 
    deleteEvent(eventId: "${eventId}") 
  }`;
  const deleteEventRes = await graphqlRequest(deleteEventMutation, token);
  logOperation("5.3 Delete Event", deleteEventRes);
  
  // 5.4: Logout
  const logoutMutation = `mutation { 
    logout 
  }`;
  const logoutRes = await graphqlRequest(logoutMutation, token);
  logOperation("5.4 Logout", logoutRes);

  console.log('\n🔑 Logging in again to delete user...');
  // Login again to get a fresh token for user deletion
  const reLoginMutation = `mutation {
    login(input: { email: "${email}", password: "password123" }) { token }
  }`;
  const reLoginRes = await graphqlRequest(reLoginMutation);
  logOperation("Re-login for user deletion", reLoginRes);
  
  const newToken = reLoginRes.data?.login?.token;
  if (!newToken) {
    console.error('Re-login failed, cannot delete user.');
    process.exit(1);
  }
  
  // 5.5: Delete user (with fresh token)
  const deleteUserMutation = `mutation { 
    deleteUser(userId: "${userId}") 
  }`;
  const deleteUserRes = await graphqlRequest(deleteUserMutation, newToken);
  logOperation("5.5 Delete User", deleteUserRes);

  console.log('\n✅ GraphQL API Test Completed Successfully!\n');
  console.log('All GraphQL queries and mutations have been executed at least once.');
})().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
