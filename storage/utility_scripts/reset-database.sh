#!/bin/bash

# BlueSkyClone Database Reset Script
# This script ensures all tables exist with proper schema

set -e

echo "================================================"
echo "BlueSkyClone Database Reset/Setup Script"
echo "================================================"
echo ""

# Configuration
DB_PASSWORD="${DB_PASSWORD:-Ifilp0721@@}"
CONTAINER_NAME="bsky-db"
DATABASE_NAME="BlueSkyClone"

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "Error: SQL Server container '$CONTAINER_NAME' is not running!"
    echo "Start it with: docker compose -f docker-compose.prod.yml up -d sql-server"
    exit 1
fi

echo "✓ SQL Server container is running"
echo ""

# Wait for SQL Server to be healthy
echo "Waiting for SQL Server to be ready..."
until docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -C -Q "SELECT 1" &> /dev/null; do
    echo -n "."
    sleep 1
done
echo ""
echo "✓ SQL Server is ready"
echo ""

# Check if database exists
DB_EXISTS=$(docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -C -Q "SELECT name FROM sys.databases WHERE name = '$DATABASE_NAME'" -h -1 | tr -d '[:space:]')

if [ -z "$DB_EXISTS" ]; then
    echo "Database '$DATABASE_NAME' does not exist. Creating..."
    docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -C -Q "CREATE DATABASE $DATABASE_NAME"
    echo "✓ Database created"
else
    echo "✓ Database '$DATABASE_NAME' exists"
fi
echo ""

# Run the setup script
echo "Running database setup script..."
docker cp database_full_reset.sql $CONTAINER_NAME:/tmp/database_full_reset.sql
docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -C -d $DATABASE_NAME -i /tmp/database_full_reset.sql

echo ""
echo "================================================"
echo "Database setup completed!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Restart backend: docker compose -f docker-compose.prod.yml restart backend"
echo "2. Check logs: docker compose -f docker-compose.prod.yml logs -f backend"
echo ""
