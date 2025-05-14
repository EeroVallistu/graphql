#!/usr/bin/env bash

# Client example that demonstrates each GraphQL query and mutation
# This script uses curl to send GraphQL requests to the server

# Configuration
SERVER_URL="http://localhost:4000/graphql"

# Function for making GraphQL requests
function graphql_request() {
  local query="$1"
  local token="$2"
  local headers=""
  
  if [ -n "$token" ]; then
    headers="-H \"Authorization: Bearer $token\""
  fi
  
  cmd="curl -s -X POST $headers -H \"Content-Type: application/json\" -d '{\"query\": \"$query\"}' $SERVER_URL"
  eval "$cmd"
  echo
}

echo "=== CALENDLY CLONE GRAPHQL CLIENT EXAMPLE ==="
echo "This script will demonstrate GraphQL operations equivalent to the REST API"

# 1. Register a new user
echo -e "\n=== CREATING A NEW USER ==="
REGISTER_MUTATION='mutation { createUser(input: { name: "Test User", email: "test@example.com", password: "password123", timezone: "Europe/Tallinn" }) { ... on User { id name email timezone } ... on Error { message code } } }'
USER_RESPONSE=$(graphql_request "$REGISTER_MUTATION")
echo "Response: $USER_RESPONSE"

# 2. Login to get a token
echo -e "\n=== LOGGING IN ==="
LOGIN_MUTATION='mutation { login(input: { email: "test@example.com", password: "password123" }) { token } }'
LOGIN_RESPONSE=$(graphql_request "$LOGIN_MUTATION")
TOKEN=$(echo $LOGIN_RESPONSE | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "Got token: $TOKEN"

# 3. Query user details
echo -e "\n=== QUERYING USER DETAILS ==="
USER_QUERY='query { users { data { id name email timezone } pagination { page pageSize total } } }'
graphql_request "$USER_QUERY" "$TOKEN"

# 4. Create an event
echo -e "\n=== CREATING AN EVENT ==="
CREATE_EVENT_MUTATION='mutation { createEvent(input: { name: "Coffee Meeting", duration: 30, description: "Quick coffee catch-up", color: "#4287f5" }) { ... on Event { id name duration description color userId } ... on Error { message code } } }'
EVENT_RESPONSE=$(graphql_request "$CREATE_EVENT_MUTATION" "$TOKEN")
EVENT_ID=$(echo $EVENT_RESPONSE | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "Created event with ID: $EVENT_ID"

# 5. Query event details
echo -e "\n=== QUERYING EVENT DETAILS ==="
EVENT_QUERY="query { event(eventId: \"$EVENT_ID\") { ... on Event { id name duration description color userId isOwner } ... on Error { message code } } }"
graphql_request "$EVENT_QUERY" "$TOKEN"

# 6. Update event
echo -e "\n=== UPDATING EVENT ==="
UPDATE_EVENT_MUTATION="mutation { updateEvent(eventId: \"$EVENT_ID\", input: { duration: 45, description: \"Extended coffee meeting\" }) { ... on Event { id name duration description } ... on Error { message code } } }"
graphql_request "$UPDATE_EVENT_MUTATION" "$TOKEN"

# 7. Create a schedule
echo -e "\n=== CREATING A SCHEDULE ==="
USER_ID=$(echo $USER_RESPONSE | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
CREATE_SCHEDULE_MUTATION="mutation { createSchedule(input: { userId: \"$USER_ID\", availability: \"{ \\\"monday\\\": [{\\\"start\\\": \\\"09:00\\\", \\\"end\\\": \\\"17:00\\\"}] }\" }) { ... on Schedule { id userId availability } ... on Error { message code } } }"
graphql_request "$CREATE_SCHEDULE_MUTATION" "$TOKEN"

# 8. Query schedule
echo -e "\n=== QUERYING SCHEDULE ==="
SCHEDULE_QUERY="query { schedule(userId: \"$USER_ID\") { ... on Schedule { id userId availability } ... on Error { message code } } }"
graphql_request "$SCHEDULE_QUERY" "$TOKEN"

# 9. Create an appointment
echo -e "\n=== CREATING AN APPOINTMENT ==="
CREATE_APPOINTMENT_MUTATION="mutation { createAppointment(input: { eventId: \"$EVENT_ID\", inviteeEmail: \"client@example.com\", startTime: \"2025-05-20T10:00:00Z\", endTime: \"2025-05-20T10:30:00Z\" }) { ... on Appointment { id eventId userId inviteeEmail startTime endTime status } ... on Error { message code } } }"
APPOINTMENT_RESPONSE=$(graphql_request "$CREATE_APPOINTMENT_MUTATION" "$TOKEN")
APPOINTMENT_ID=$(echo $APPOINTMENT_RESPONSE | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "Created appointment with ID: $APPOINTMENT_ID"

# 10. Query appointment
echo -e "\n=== QUERYING APPOINTMENT ==="
APPOINTMENT_QUERY="query { appointment(appointmentId: \"$APPOINTMENT_ID\") { ... on Appointment { id eventId userId inviteeEmail startTime endTime status } ... on Error { message code } } }"
graphql_request "$APPOINTMENT_QUERY" "$TOKEN"

# 11. Update appointment status
echo -e "\n=== UPDATING APPOINTMENT ==="
UPDATE_APPOINTMENT_MUTATION="mutation { updateAppointment(appointmentId: \"$APPOINTMENT_ID\", input: { status: \"confirmed\" }) { ... on Appointment { id status } ... on Error { message code } } }"
graphql_request "$UPDATE_APPOINTMENT_MUTATION" "$TOKEN"

# 12. Query all user's appointments
echo -e "\n=== QUERYING ALL USER'S APPOINTMENTS ==="
APPOINTMENTS_QUERY="query { appointments(userId: \"$USER_ID\") { id eventId inviteeEmail startTime endTime status } }"
graphql_request "$APPOINTMENTS_QUERY" "$TOKEN"

# 13. Delete test data (reverse order to maintain referential integrity)
echo -e "\n=== CLEANING UP TEST DATA ==="
DELETE_APPOINTMENT_MUTATION="mutation { deleteAppointment(appointmentId: \"$APPOINTMENT_ID\") }"
graphql_request "$DELETE_APPOINTMENT_MUTATION" "$TOKEN"

UPDATE_SCHEDULE_MUTATION="mutation { updateSchedule(userId: \"$USER_ID\", input: { availability: \"{}\" }) { ... on Schedule { id userId } ... on Error { message code } } }"
graphql_request "$UPDATE_SCHEDULE_MUTATION" "$TOKEN"

DELETE_EVENT_MUTATION="mutation { deleteEvent(eventId: \"$EVENT_ID\") }"
graphql_request "$DELETE_EVENT_MUTATION" "$TOKEN"

# 14. Logout
echo -e "\n=== LOGGING OUT ==="
LOGOUT_MUTATION="mutation { logout }"
graphql_request "$LOGOUT_MUTATION" "$TOKEN"

echo -e "\n=== CLIENT DEMO COMPLETED ==="
