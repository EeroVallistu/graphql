#!/usr/bin/env bash

# Exit on error
set -e

# Make the script's location the working directory
cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
bun install

# Start both the REST API and GraphQL servers using the npm script
echo "Starting servers..."
bun run start

# You can uncomment the below lines if you want to run the servers separately
# echo "Starting REST API server..."
# bun run --cwd calendly-clone-api server.js &
#
# echo "Starting GraphQL server..."
# bun run --cwd calendly-clone-graphql src/server.js &
#
# # Wait for both servers
# wait
