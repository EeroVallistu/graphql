#!/usr/bin/env bash

# Exit on error
set -e

# Make the script's location the working directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ "$1" = "--install" ] || [ "$1" = "-i" ]; then
  echo "Installing dependencies..."
  bun install
fi

# Run tests
echo "Running API comparison tests..."
bun run test

# You can add additional test categories here
# For example:
# echo "Running unit tests..."
# bun run test:unit
#
# echo "Running integration tests..."
# bun run test:integration

# Print summary
echo "All tests completed!"
