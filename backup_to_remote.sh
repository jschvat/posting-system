#!/bin/bash

# Backup and restore database to remote server
# Usage: ./backup_to_remote.sh

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== PostgreSQL Database Backup & Remote Restore ===${NC}"
echo ""

# Local database configuration
LOCAL_HOST="localhost"
LOCAL_PORT="5432"
LOCAL_DB="posting_system"
LOCAL_USER="dev_user"
LOCAL_PASSWORD="dev_password"

# Remote database configuration
REMOTE_HOST="miniserver.local"
REMOTE_PORT="5432"
REMOTE_USER="jason"
REMOTE_PASSWORD="1Daniel0716!"
REMOTE_DB="posting_system"

# Backup file
BACKUP_DIR="/home/jason/Development/backup/claude"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/posting_system_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${YELLOW}Step 1: Testing remote connection...${NC}"
if PGPASSWORD="${REMOTE_PASSWORD}" psql -h "${REMOTE_HOST}" -p "${REMOTE_PORT}" -U "${REMOTE_USER}" -d postgres -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Remote connection successful${NC}"
    REMOTE_BACKUP=true
else
    echo -e "${RED}✗ Remote connection failed${NC}"
    echo ""
    echo "Possible issues:"
    echo "1. Password might be incorrect"
    echo "2. User '${REMOTE_USER}' might not exist on remote server"
    echo "3. Remote PostgreSQL might not accept remote connections"
    echo "4. pg_hba.conf might not allow connections from this IP"
    echo ""
    echo "To fix, on the remote server:"
    echo "  1. Edit postgresql.conf: listen_addresses = '*'"
    echo "  2. Edit pg_hba.conf: add line 'host all all 0.0.0.0/0 md5'"
    echo "  3. Create user: CREATE USER jason WITH PASSWORD '1Daniel0716!' SUPERUSER;"
    echo "  4. Restart PostgreSQL: sudo systemctl restart postgresql"
    echo ""
    read -p "Continue with local backup only? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    REMOTE_BACKUP=false
fi

echo ""
echo -e "${YELLOW}Step 2: Creating local database dump...${NC}"
echo "Database: ${LOCAL_DB}"
echo "Backup file: ${BACKUP_FILE}"

# Use Docker's pg_dump to avoid version mismatch
if docker exec posting_system_db pg_dump -h localhost -U "${LOCAL_USER}" -d "${LOCAL_DB}" \
    --no-owner \
    --no-privileges \
    -f /tmp/dump.sql 2>&1; then

    # Copy dump from container to host
    docker cp posting_system_db:/tmp/dump.sql "${BACKUP_FILE}"
    docker exec posting_system_db rm /tmp/dump.sql

    echo -e "${GREEN}✓ Database dump successful${NC}"

    # Get file size
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Backup size: ${FILE_SIZE}"
else
    echo -e "${RED}✗ Database dump failed${NC}"
    exit 1
fi

# Compress backup
echo ""
echo -e "${YELLOW}Step 3: Compressing backup...${NC}"
gzip -f "${BACKUP_FILE}"

if [ -f "${COMPRESSED_FILE}" ]; then
    COMPRESSED_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
    echo -e "${GREEN}✓ Compression successful${NC}"
    echo "Compressed size: ${COMPRESSED_SIZE}"
else
    echo -e "${RED}✗ Compression failed${NC}"
    exit 1
fi

# Only proceed with remote restore if connection was successful
if [ "$REMOTE_BACKUP" = false ]; then
    echo ""
    echo -e "${YELLOW}Skipping remote restore (connection failed)${NC}"
    echo ""
    echo -e "${GREEN}Local backup completed successfully!${NC}"
    echo "Backup location: ${COMPRESSED_FILE}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 4: Checking if remote database exists...${NC}"

# Check if database exists on remote server
DB_EXISTS=$(PGPASSWORD="${REMOTE_PASSWORD}" psql -h "${REMOTE_HOST}" -p "${REMOTE_PORT}" -U "${REMOTE_USER}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${REMOTE_DB}';")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}Database '${REMOTE_DB}' already exists on remote server${NC}"
    read -p "Drop and recreate database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        PGPASSWORD="${REMOTE_PASSWORD}" psql -h "${REMOTE_HOST}" -p "${REMOTE_PORT}" -U "${REMOTE_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${REMOTE_DB};"
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo -e "${RED}Aborting restore${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Step 5: Creating remote database...${NC}"

# Create database on remote server
if PGPASSWORD="${REMOTE_PASSWORD}" psql -h "${REMOTE_HOST}" -p "${REMOTE_PORT}" -U "${REMOTE_USER}" -d postgres -c "CREATE DATABASE ${REMOTE_DB} WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Remote database created${NC}"
else
    echo -e "${RED}✗ Failed to create remote database${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 6: Restoring backup to remote server...${NC}"
echo "This may take several minutes..."

# Decompress and restore
if gunzip -c "${COMPRESSED_FILE}" | PGPASSWORD="${REMOTE_PASSWORD}" psql -h "${REMOTE_HOST}" -p "${REMOTE_PORT}" -U "${REMOTE_USER}" -d "${REMOTE_DB}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}✗ Database restore failed${NC}"
    echo "Cleaning up remote database..."
    PGPASSWORD="${REMOTE_PASSWORD}" psql -h "${REMOTE_HOST}" -p "${REMOTE_PORT}" -U "${REMOTE_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${REMOTE_DB};" > /dev/null 2>&1
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 7: Verifying remote database...${NC}"

# Get table count on remote
REMOTE_TABLE_COUNT=$(PGPASSWORD="${REMOTE_PASSWORD}" psql -h "${REMOTE_HOST}" -p "${REMOTE_PORT}" -U "${REMOTE_USER}" -d "${REMOTE_DB}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

# Get table count on local
LOCAL_TABLE_COUNT=$(PGPASSWORD="${LOCAL_PASSWORD}" psql -h "${LOCAL_HOST}" -p "${LOCAL_PORT}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "Local tables: ${LOCAL_TABLE_COUNT}"
echo "Remote tables: ${REMOTE_TABLE_COUNT}"

if [ "$REMOTE_TABLE_COUNT" = "$LOCAL_TABLE_COUNT" ]; then
    echo -e "${GREEN}✓ Table count matches${NC}"
else
    echo -e "${YELLOW}⚠ Table count mismatch${NC}"
fi

echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo ""
echo "Summary:"
echo "  Local backup: ${COMPRESSED_FILE}"
echo "  Remote host: ${REMOTE_HOST}:${REMOTE_PORT}"
echo "  Remote database: ${REMOTE_DB}"
echo "  Tables: ${REMOTE_TABLE_COUNT}"
echo ""
echo "To connect to remote database:"
echo "  psql -h ${REMOTE_HOST} -U ${REMOTE_USER} -d ${REMOTE_DB}"
echo ""
