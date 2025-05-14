# Calendly Clone GraphQL API

This project is a GraphQL implementation of the Calendly Clone REST API. It provides the same functionality but using GraphQL queries and mutations instead of REST endpoints.

## Project Structure

```
calendly-clone-graphql/
├── schema/           # GraphQL schema definition (SDL)
├── src/              # Source code
│   ├── resolvers/    # GraphQL resolvers
│   ├── middleware/   # Authentication middleware
│   └── utils/        # Utility functions
├── client/           # Example client requests
├── tests/            # Test scripts
└── scripts/          # Build and run scripts
```

## Prerequisites

- [Bun](https://bun.sh/) runtime installed (version 1.0 or newer)
- Original REST API's SQLite database available at `../calendly-clone-api/database.db`

## Building and Running

### Quick Start

Run the server with one command:

```bash
# Unix/Linux/macOS
./scripts/run.sh

# Windows PowerShell
bun install
bun run start
```

The GraphQL server will start at http://localhost:4000/graphql

### Development Mode

For development with automatic reloading:

```bash
bun run dev
```

## Testing

Run the automated tests to compare GraphQL and REST functionality:

```bash
# Unix/Linux/macOS
./tests/test.sh

# Windows PowerShell
# First start both REST API and GraphQL API servers
# Then run:
bun test
```

## Client Examples

Example client requests are provided in the `client/example.sh` script:

```bash
# Unix/Linux/macOS
./client/example.sh

# Windows PowerShell
# See client/example.ps1 for PowerShell equivalent
```

## GraphQL API Overview

The GraphQL API provides the following main operations:

### Queries
- `users`: Get a list of users with pagination
- `user`: Get a single user by ID
- `events`: Get all events for a user
- `event`: Get a single event by ID
- `schedules`: Get all schedules
- `schedule`: Get a user's schedule
- `appointments`: Get all appointments for a user
- `appointment`: Get a single appointment by ID

### Mutations
- User management: `createUser`, `updateUser`, `deleteUser`
- Authentication: `login`, `logout`
- Event management: `createEvent`, `updateEvent`, `deleteEvent`
- Schedule management: `createSchedule`, `updateSchedule`, `deleteSchedule`
- Appointment management: `createAppointment`, `updateAppointment`, `deleteAppointment`

## API Schema

The complete GraphQL schema is defined in `schema/schema.graphql`. You can also view the schema using GraphQL introspection when the server is running by visiting the GraphQL playground at http://localhost:4000/graphql.
