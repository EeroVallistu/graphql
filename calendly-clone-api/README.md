# Calendly Clone API Project

This project provides both REST and SOAP APIs for the Calendly Clone application. It includes a REST API in the root directory and a SOAP service that mirrors its functionality in the calendly-soap-api directory.

## Project Structure

```
/
 ├── server.js                # Main REST API entry point
 ├── db.js                    # Database connection module
 ├── routes/                  # REST API routes
 ├── middleware/              # API middleware components
 ├── utils/                   # Utility functions including validators
 ├── migrations/              # Database migration scripts
 ├── calendly-soap-api/       # SOAP API implementation
 │   ├── server.js            # SOAP API entry point
 │   ├── db.js                # SOAP database connection
 │   └── wsdl/                # WSDL file defining the SOAP interface
 ├── tests/                   # Automated tests comparing REST and SOAP APIs
 ├── docs/                    # API documentation
 └── README.md                # This documentation
```

## Running the Services

You can run both the REST and SOAP APIs concurrently using either the provided shell script or npm commands:

### Production Mode
To run both APIs in production mode using the shell script:
```bash
./run.sh
```

Or using npm:
```bash
npm run start
```

### Run Tests
To run the API comparison tests using the shell script:
```bash
./test.sh
```

Or using npm:
```bash
npm run test
```

## Features

Both the REST and SOAP APIs provide identical functionality, including:

- User management (create, read, update, delete)
- Authentication (login/logout)
- Event management
- Schedule management
- Appointment management

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd calendly-clone-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

## Running the Services

### Start Both APIs

The simplest way to start both the REST and SOAP services is:

```bash
npm start
```

This will:
1. Start the SOAP service on port 3001
2. Start the REST API service on port 3000 (or as configured in .env)

The services will be available at:
- REST API: http://localhost:3000
- SOAP Endpoint: http://localhost:3001/soap
- WSDL: http://localhost:3001/wsdl

## Testing

The tests verify that the SOAP API provides equivalent functionality to the REST API by comparing responses from both.

To run the tests:

```bash
npm test
```

### Test Requirements

- Both REST and SOAP services should be running
- The test will automatically verify API equivalence

### What the Tests Verify

- Both APIs return equivalent data structures
- Both APIs enforce the same validation rules
- Both APIs handle CRUD operations identically
- Authentication works the same way in both APIs

## API Documentation

API documentation is available in the docs directory:
- REST API documentation: OpenAPI specification in `docs/en/api.yaml`
- SOAP API documentation: WSDL file in `calendly-soap-api/wsdl/calendly-soap-service.wsdl`

## WSDL Details

The WSDL file (`calendly-soap-api/wsdl/calendly-soap-service.wsdl`) defines:

- All data types using XML Schema
- Operations mapping to REST endpoints
- SOAP bindings for all operations
- Service endpoint details

## Error Handling

The SOAP API uses standard SOAP Fault messages for error conditions, including:

- Client errors (400-level HTTP equivalents)
- Server errors (500-level HTTP equivalents)
- Authentication/authorization failures

## Development

### Adding New Features

1. Update the WSDL file with new types and operations
2. Implement the corresponding operation in the SOAP server
3. Add parallel implementation in the REST API
4. Update tests to verify the changes

### Modifying Existing Features

1. Update the WSDL if the data model changes
2. Modify the implementation in both SOAP and REST services
3. Update tests to verify the changes

## Troubleshooting

### Common Issues

- **WSDL Not Found**: Ensure the SOAP service is running and the WSDL file is in the correct location
- **Database Connection Errors**: Verify that the database file exists and is readable/writable
- **Port Conflicts**: Check if ports are already in use by another service

### Logs

Both services log information to the console, including:
- Service startup information
- Request/response details
- Error messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.