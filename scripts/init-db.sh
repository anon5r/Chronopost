#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -U postgres; do
  sleep 1
done

echo "PostgreSQL is ready, running migrations..."

# Run Prisma migrations
cd /app/packages/backend
pnpm db:migrate

# Run seed script if needed
echo "Running seed script..."
pnpm db:seed

echo "Database initialization completed successfully!"