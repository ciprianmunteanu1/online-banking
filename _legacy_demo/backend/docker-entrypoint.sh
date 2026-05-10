#!/bin/sh
set -e

echo "Pushing Prisma schema to database..."
npx prisma db push --skip-generate

echo "Starting NestJS application..."
exec node dist/main
