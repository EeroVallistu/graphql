// Main server file for the GraphQL service
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import sqlite3 from 'sqlite3';
import { makeExecutableSchema } from '@graphql-tools/schema';

// Import resolvers
import { resolvers } from './resolvers/index.js';
import { authMiddleware } from './middleware/auth.js';
import { skipAuthDirectiveTransformer } from './utils/directives.js';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the schema
const typeDefs = readFileSync(
  resolve(__dirname, '../schema/schema.graphql'),
  'utf-8'
);

// Define directives
const directiveTypeDefs = `
  directive @skipAuth on FIELD_DEFINITION
`;

// Create database connection (reusing the same database as REST API)
// Use absolute path to ensure correct database connection regardless of working directory
import { join } from 'path';
const dbPath = resolve(__dirname, '../../calendly-clone-api/database.db');
console.log('GraphQL Database path:', dbPath);

// Create a wrapper for sqlite3 to match similar functionality as the bun:sqlite API
const sqlite = sqlite3.verbose();
export const db = {
  _db: new sqlite.Database(dbPath),
  
  // Prepare and execute a query with parameters
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this._db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  // Execute a single query and get the first result
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this._db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  // Execute a query without returning results
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this._db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
      });
    });
  }
};

// Create Express app
const app = express();

// Configure CORS - allow all origins for testing
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Make executable schema with directives
let schema = makeExecutableSchema({
  typeDefs: [directiveTypeDefs, typeDefs],
  resolvers,
});

// Apply schema transformations
schema = skipAuthDirectiveTransformer(schema);

// Setup Apollo Server
const server = new ApolloServer({
  schema,
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
      return { 
        user: req.user,
        skipAuth: req.skipAuth || false // Flag to bypass auth for public operations
      };
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
