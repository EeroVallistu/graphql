# Calendly Clone - REST API & GraphQL API

This project provides a complete Calendly clone implementation with both REST API and GraphQL API options. Both APIs offer identical functionality, allowing for scheduling and managing appointments with calendar integration.

## Project Overview

This monorepo contains two main components:

- **calendly-clone-api**: A RESTful API implementation using Express.js
- **calendly-clone-graphql**: A GraphQL API implementation that mirrors the REST API functionality

Both implementations use a shared SQLite database for data storage, making them interchangeable for clients.

## Features

Both APIs provide the following features:

- 👤 User management and authentication
- 📅 Event and appointment scheduling
- 📆 Availability and schedule management 
- 📋 Appointment creation and management

## Prerequisites

- [Bun](https://bun.sh/) runtime (version 1.0 or newer)
- Node.js 18+ (if not using Bun)

## Quick Start

### Install Dependencies

```bash
bun install
# or npm install
```

### Run Both Servers

```bash
./run.sh
# or: bun run start
```

This will start:
- REST API on http://localhost:3002
- GraphQL API on http://localhost:4000/graphql

### Run Tests

```bash
./test.sh
# or: bun run test
```

This runs comparison tests to verify that both API implementations return identical results.

## Project Structure

```
/
├── calendly-clone-api/       # REST API implementation
│   ├── server.js             # Main entry point
│   ├── routes/               # API endpoints
│   ├── middleware/           # Authentication, error handling
│   └── README.md             # REST API documentation
├── calendly-clone-graphql/   # GraphQL implementation
│   ├── schema/               # GraphQL schema definition
│   ├── src/                  # Source code & resolvers
│   ├── client/example.js     # Example GraphQL client
│   └── README.md             # GraphQL API documentation
├── tests/                    # API comparison tests
│   └── test-compare.js       # Tests both implementations
├── package.json              # Project dependencies
├── run.sh                    # Script to run both servers
└── test.sh                   # Script to run tests
```

## API Examples

### REST API

See the [REST API documentation](./calendly-clone-api/README.md) for detailed endpoint information.

### GraphQL API

The project includes an [example client](./calendly-clone-graphql/client/example.js) that demonstrates all GraphQL operations:

```bash
# Run the example client
node calendly-clone-graphql/client/example.js
```

See the [GraphQL API documentation](./calendly-clone-graphql/README.md) for more details on the GraphQL schema.

## Development

Both APIs use nodemon for development, providing automatic server restart when files change.

## License

MIT
