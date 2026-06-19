#!/bin/bash
# Docker entrypoint — runs migrations then starts the app
set -e

echo "=== QuestKids Backend ==="
echo "Database: ${DATABASE_URL}"

# Wait for PostgreSQL if using it
if [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "Waiting for PostgreSQL..."
    # Extract host from DATABASE_URL
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:/]*\).*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_PORT=${DB_PORT:-5432}
    
    for i in $(seq 1 30); do
        if python -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('${DB_HOST}', ${DB_PORT})); s.close()" 2>/dev/null; then
            echo "PostgreSQL is ready!"
            break
        fi
        echo "Waiting for PostgreSQL... ($i/30)"
        sleep 2
    done
fi

echo "Starting QuestKids v0.5.0..."
exec "$@"
