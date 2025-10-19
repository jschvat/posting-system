#!/bin/bash

# Script to backup PostgreSQL database from Docker container
# This creates a backup inside the container and copies it to the host

set -e  # Exit on error

# Configuration
CONTAINER_NAME="posting_system_db"
DB_NAME="posting_system"
DB_USER="dev_user"
BACKUP_DIR="/home/jason/Development/claude/posting-system"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
CONTAINER_BACKUP_PATH="/tmp/${BACKUP_FILE}"
HOST_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
LATEST_LINK="${BACKUP_DIR}/backup_latest.sql"

echo "🗄️  PostgreSQL Docker Backup Script"
echo "=================================="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Container '${CONTAINER_NAME}' is not running"
    exit 1
fi

echo "✅ Container '${CONTAINER_NAME}' is running"

# Create backup inside container
echo "📦 Creating backup inside container..."
docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} \
    --no-owner --no-privileges -f ${CONTAINER_BACKUP_PATH}

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully inside container"
else
    echo "❌ Failed to create backup inside container"
    exit 1
fi

# Copy backup from container to host
echo "📤 Copying backup from container to host..."
docker cp ${CONTAINER_NAME}:${CONTAINER_BACKUP_PATH} ${HOST_BACKUP_PATH}

if [ $? -eq 0 ]; then
    echo "✅ Backup copied successfully to ${HOST_BACKUP_PATH}"
else
    echo "❌ Failed to copy backup from container"
    exit 1
fi

# Clean up backup file inside container
echo "🧹 Cleaning up container..."
docker exec ${CONTAINER_NAME} rm ${CONTAINER_BACKUP_PATH}

# Create/update symlink to latest backup
ln -sf ${BACKUP_FILE} ${LATEST_LINK}
echo "🔗 Latest backup link updated: ${LATEST_LINK}"

# Show backup file size
BACKUP_SIZE=$(ls -lh ${HOST_BACKUP_PATH} | awk '{print $5}')
echo ""
echo "📊 Backup Summary:"
echo "   File: ${BACKUP_FILE}"
echo "   Size: ${BACKUP_SIZE}"
echo "   Path: ${HOST_BACKUP_PATH}"
echo ""
echo "✅ Backup completed successfully!"
