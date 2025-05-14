// Main server file for the GraphQL service
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Database } from 'bun:sqlite';

// Import resolvers
import { resolvers } from './resolvers/index.js';
import { authMiddleware } from './middleware/auth.js';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the schema
const typeDefs = readFileSync(
  resolve(__dirname, '../schema/schema.graphql'),
  'utf-8'
);

// Create database connection (reusing the same database as REST API)
// Use absolute path to ensure correct database connection regardless of working directory
import { join } from 'path';
const dbPath = resolve(__dirname, '../../calendly-clone-api/database.db');
console.log('Database path:', dbPath);

export const db = new Database(dbPath, { 
  create: false,  // Don't create if it doesn't exist
  readwrite: true // Open in read-write mode
});

// Create Express app
const app = express();

// Configure CORS - allow all origins for testing
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Setup Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    
    // Custom error formatting
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      path: error.path,
    };
  },
  introspection: true,
});

// Start Apollo Server
await server.start();

// Apply middleware
app.use('/graphql', 
  express.json(),
  authMiddleware,
  expressMiddleware(server, {
    context: async ({ req }) => {
      // Pass user from auth middleware to resolvers
      return { user: req.user };
    },
  })
);

// Root path redirects to GraphQL Playground
app.get('/', (req, res) => {
  res.redirect('/graphql');
});

// Create HTTP server
const httpServer = createServer(app);

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 GraphQL Server is running at http://localhost:${PORT}/graphql`);
});
