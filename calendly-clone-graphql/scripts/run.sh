#!/usr/bin/env bash

# Exit on error
set -e

# Install dependencies
echo "Installing dependencies..."
bun install

# Start server
echo "Starting GraphQL server..."
bun run start
