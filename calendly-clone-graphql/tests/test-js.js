// Test script for GraphQL API using pure JavaScript
// Uses native Node.js fetch API for HTTP requests - no shell commands or external tools

import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

// Configuration
const GRAPHQL_URL = 'http://localhost:4000/graphql'; // GraphQL API endpoint

// Test results tracking
let TESTS_TOTAL = 0;
let TESTS_PASSED = 0;

// Helper to generate random emails
function generateRandomEmail() {
  return `test${Date.now()}@example.com`;
}

// Function for making GraphQL requests
async function graphqlRequest(query, token = '') {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });
    
    return await response.text();
  } catch (error) {
    console.error('GraphQL request failed:', error);
    return '{}'; // Return empty JSON object as fallback
  }
}

// Function for validating GraphQL responses
function validateGraphQLResponse(graphqlResp) {
  try {
    graphqlResp = JSON.parse(graphqlResp);
  } catch (error) {
    console.error('GraphQL response is not valid JSON:', error.message);
    console.error('Raw GraphQL response:', graphqlResp);
    return false;
  }
  
  if (!graphqlResp) {
    console.error('GraphQL API returned empty response');
    return false;
  }
  
  if (graphqlResp.errors) {
    console.error('GraphQL API returned an error:', 
      graphqlResp.errors[0]?.message || JSON.stringify(graphqlResp.errors));
    return false;
  }
  
  // Check that there's data in the response
  if (!graphqlResp.data) {
    console.error('GraphQL response missing data field');
    return false;
  }
  
  return true;
}

// Function for running a GraphQL test case
async function runTest(testName, graphqlQuery, token = '') {
  console.log(`\nRunning test: ${testName}`);
  TESTS_TOTAL++;
  
  console.log("----- Debug Info -----");
  console.log(`GraphQL Query: ${graphqlQuery}`);
  if (token) {
    console.log(`Using Token: ${token.substring(0, 10)}...`);
  }
  console.log("---------------------");
  
  // Get GraphQL response
  const graphqlResponse = await graphqlRequest(graphqlQuery, token);
  
  // Log response for debugging
  console.log(`GraphQL response: ${graphqlResponse}`);
  
  // Validate GraphQL response
  const success = validateGraphQLResponse(graphqlResponse);
  
  if (success) {
    console.log(`✅ Test passed: ${testName}`);
    TESTS_PASSED++;
  } else {
    console.log(`❌ Test failed: ${testName}`);
  }
  
  console.log("------------------------");
  
  // For extracting data we need to parse response
  return JSON.parse(graphqlResponse || '{}');
}

// Main function to run all tests
async function runAllTests() {
  console.log("=== RUNNING GRAPHQL API TESTS ===");
  
  // Test data
  const TEST_EMAIL = generateRandomEmail();
  const TEST_PASSWORD = "password123";
  
  // 1. Register test user
  const GRAPHQL_REGISTER_QUERY = `
    mutation { 
      createUser(input: { 
        name: "Test User", 
        email: "${TEST_EMAIL}", 
        password: "${TEST_PASSWORD}" 
      }) { 
        ... on User { 
          id name email 
        } 
      } 
    }
  `;
  
  const registerResponse = await runTest(
    "User Registration", 
    GRAPHQL_REGISTER_QUERY
  );
  
  console.log("User created with ID:", registerResponse.data?.createUser?.id);
  
  // 2. Login
  const GRAPHQL_LOGIN_QUERY = `
    mutation { 
      login(input: { 
        email: "${TEST_EMAIL}", 
        password: "${TEST_PASSWORD}" 
      }) { 
        token 
      } 
    }
  `;
  
  const loginResponse = await runTest(
    "User Login", 
    GRAPHQL_LOGIN_QUERY
  );
  
  // Extract token
  const TOKEN = loginResponse.data?.login?.token;
  
  console.log("GraphQL token:", TOKEN?.substring(0, 15) + "...");
  
  if (!TOKEN) {
    console.error("Failed to get valid token from GraphQL API");
    process.exit(1);
  } else {
    console.log("Successfully obtained authentication token");
  }
  
  // 3. Create an event
  const GRAPHQL_EVENT_QUERY = `
    mutation { 
      createEvent(input: { 
        name: "Test Event", 
        duration: 30, 
        description: "Test Description", 
        color: "#FF5733" 
      }) { 
        ... on Event { 
          id name duration description 
        } 
      } 
    }
  `;
  
  const eventResponse = await runTest(
    "Create Event",
    GRAPHQL_EVENT_QUERY,
    TOKEN
  );
  
  // Extract event ID
  const EVENT_ID = eventResponse.data?.createEvent?.id;
  
  if (!EVENT_ID) {
    console.error("Failed to get valid event ID from GraphQL API");
    process.exit(1);
  } else {
    console.log("Event created with ID:", EVENT_ID);
  }
  
  // 4. Get event details
  const GRAPHQL_GET_EVENT_QUERY = `
    query { 
      event(eventId: "${EVENT_ID}") { 
        ... on Event { 
          id name duration description 
        } 
      } 
    }
  `;
  
  await runTest(
    "Get Event",
    GRAPHQL_GET_EVENT_QUERY,
    TOKEN
  );
  
  // 5. Update event
  const GRAPHQL_UPDATE_QUERY = `
    mutation { 
      updateEvent(
        eventId: "${EVENT_ID}", 
        input: { duration: 45 }
      ) { 
        ... on Event { 
          id name duration 
        } 
      } 
    }
  `;
  
  await runTest(
    "Update Event",
    GRAPHQL_UPDATE_QUERY,
    TOKEN
  );
    // 6. Create appointment
  // Using a simpler query that doesn't use the fragment to see if that helps
  const GRAPHQL_APPT_QUERY = `
    mutation { 
      createAppointment(input: { 
        eventId: "${EVENT_ID}", 
        inviteeEmail: "client@example.com", 
        startTime: "2025-05-20T10:00:00Z", 
        endTime: "2025-05-20T10:45:00Z" 
      }) { 
        ... on Appointment { 
          id eventId inviteeEmail 
        } 
        ... on Error {
          message
          code
        }
      } 
    }
  `;
  
  const appointmentResponse = await runTest(
    "Create Appointment",
    GRAPHQL_APPT_QUERY,
    TOKEN
  );
  
  // Extract appointment ID
  const APPOINTMENT_ID = appointmentResponse.data?.createAppointment?.id;
  
  if (APPOINTMENT_ID) {
    console.log("Appointment created with ID:", APPOINTMENT_ID);
  }
  
  // 7. Logout
  await runTest(
    "Logout",
    "mutation { logout }",
    TOKEN
  );
    // Summary
  console.log("\n=== TEST SUMMARY ===");
  console.log(`${TESTS_PASSED} of ${TESTS_TOTAL} tests passed`);
  
  if (TESTS_PASSED === TESTS_TOTAL) {
    console.log("✅ All tests passed! The GraphQL API is working correctly.");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed. There may be issues with the GraphQL API.");
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error("Test script failed with error:", error);
  process.exit(1);
});
