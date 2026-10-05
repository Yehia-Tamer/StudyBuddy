#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting the application..."
exec uvicorn app.main:api --host 0.0.0.0 --port 8000