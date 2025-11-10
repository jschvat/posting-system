#!/bin/bash

# Script to backup PostgreSQL database from Docker container
# This creates a backup inside the container and copies it to the host
# Usage: ./backup_docker_db.sh [--test|--all]
#   (no args): backup main database only
#   --test: backup test database only
#   --all: backup both databases

set -e  # Exit on error

# Configuration
CONTAINER_NAME="posting_system_db"
DB_USER="dev_user"
BACKUP_DIR="/home/jason/Development/claude/posting-system"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse command line arguments
BACKUP_MODE="main"
if [ "$1" = "--test" ]; then
    BACKUP_MODE="test"
elif [ "$1" = "--all" ]; then
    BACKUP_MODE="all"
elif [ -n "$1" ]; then
    echo "❌ Invalid argument: $1"
    echo "Usage: $0 [--test|--all]"
    exit 1
fi

echo "🗄️  PostgreSQL Docker Backup Script"
echo "=================================="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Container '${CONTAINER_NAME}' is not running"
    exit 1
fi

echo "✅ Container '${CONTAINER_NAME}' is running"
echo ""

# Function to backup a single database
backup_database() {
    local db_name=$1
    local db_type=$2

    local backup_file="backup_${db_type}_${TIMESTAMP}.sql"
    local container_backup_path="/tmp/${backup_file}"
    local host_backup_path="${BACKUP_DIR}/${backup_file}"
    local latest_link="${BACKUP_DIR}/backup_${db_type}_latest.sql"

    echo "📦 Backing up database: ${db_name}"

    # Create backup inside container
    echo "   Creating backup inside container..."
    docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${db_name} \
        --no-owner --no-privileges -f ${container_backup_path}

    if [ $? -ne 0 ]; then
        echo "   ❌ Failed to create backup for ${db_name}"
        return 1
    fi

    echo "   ✅ Backup created successfully inside container"

    # Copy backup from container to host
    echo "   📤 Copying backup from container to host..."
    docker cp ${CONTAINER_NAME}:${container_backup_path} ${host_backup_path}

    if [ $? -ne 0 ]; then
        echo "   ❌ Failed to copy backup from container"
        return 1
    fi

    echo "   ✅ Backup copied successfully to ${host_backup_path}"

    # Clean up backup file inside container
    docker exec ${CONTAINER_NAME} rm ${container_backup_path}

    # Create/update symlink to latest backup
    ln -sf ${backup_file} ${latest_link}
    echo "   🔗 Latest backup link updated: ${latest_link}"

    # Show backup file size
    local backup_size=$(ls -lh ${host_backup_path} | awk '{print $5}')
    echo ""
    echo "   📊 Backup Summary:"
    echo "      File: ${backup_file}"
    echo "      Size: ${backup_size}"
    echo "      Path: ${host_backup_path}"
    echo ""

    return 0
}

# Perform backups based on mode
if [ "$BACKUP_MODE" = "main" ] || [ "$BACKUP_MODE" = "all" ]; then
    backup_database "posting_system" "main"
    if [ $? -ne 0 ]; then
        echo "❌ Main database backup failed!"
        exit 1
    fi
    echo "✅ Main database backup completed successfully!"
    echo ""
fi

if [ "$BACKUP_MODE" = "test" ] || [ "$BACKUP_MODE" = "all" ]; then
    backup_database "posting_system_test" "test"
    if [ $? -ne 0 ]; then
        echo "❌ Test database backup failed!"
        exit 1
    fi
    echo "✅ Test database backup completed successfully!"
    echo ""
fi

if [ "$BACKUP_MODE" = "all" ]; then
    echo "✅ All database backups completed successfully!"
fi
