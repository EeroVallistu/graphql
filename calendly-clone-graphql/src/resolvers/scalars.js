// Custom scalar types for GraphQL
import { GraphQLScalarType, Kind } from 'graphql';

// DateTime scalar type
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  
  // Convert value from client
  parseValue(value) {
    return new Date(value); // Convert incoming value to a date
  },
  
  // Convert value to client
  serialize(value) {
    return value instanceof Date ? value.toISOString() : value;
  },
  
  // Parse literal in AST
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// JSON scalar type
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  
  // Convert value from client
  parseValue(value) {
    return typeof value === 'string' ? JSON.parse(value) : value;
  },
  
  // Convert value to client
  serialize(value) {
    return typeof value === 'string' ? JSON.parse(value) : value;
  },
  
  // Parse literal in AST
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
        return JSON.parse(ast.value);
      case Kind.OBJECT:
        return ast.value;
      default:
        return null;
    }
  },
});
