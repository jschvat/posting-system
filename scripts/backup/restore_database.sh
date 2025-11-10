#!/bin/bash
# PostgreSQL Database Restore Script
# Uses Docker container with PostgreSQL 15 client
# Database: posting_system

set -e  # Exit on error

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="dev_user"
DB_PASSWORD="dev_password"
BACKUP_DIR="$(pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# List available backup files
echo ""
print_info "Available backup files in current directory:"
echo ""
ls -lht posting_system_*.{sql,dump} 2>/dev/null | head -20 || echo "No backup files found."
echo ""

# Get backup file
read -p "Enter backup file name (or path): " BACKUP_FILE

if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Detect backup format
if [[ $BACKUP_FILE == *.dump ]]; then
    BACKUP_FORMAT="custom"
    print_info "Detected: PostgreSQL custom format (compressed)"
else
    BACKUP_FORMAT="sql"
    print_info "Detected: SQL format"
fi

# Get database name
echo ""
read -p "Enter database name to restore to (will be CREATED if doesn't exist): " DB_NAME

if [ -z "$DB_NAME" ]; then
    print_error "Database name cannot be empty"
    exit 1
fi

# Warning about existing database
print_warning "This will restore to database: $DB_NAME"
print_warning "If the database exists, it will be DROPPED and recreated!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Restore cancelled."
    exit 0
fi

# Check if database exists
print_step "Checking if database exists..."
DB_EXISTS=$(docker run --rm --network host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:15 \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" == "1" ]; then
    print_warning "Database '$DB_NAME' exists. Dropping..."

    # Terminate connections
    docker run --rm --network host \
      -e PGPASSWORD="$DB_PASSWORD" \
      postgres:15 \
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" \
      > /dev/null 2>&1 || true

    # Drop database
    docker run --rm --network host \
      -e PGPASSWORD="$DB_PASSWORD" \
      postgres:15 \
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
      -c "DROP DATABASE \"$DB_NAME\";"

    print_info "Database dropped."
fi

# Create database
print_step "Creating database '$DB_NAME'..."
docker run --rm --network host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:15 \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE \"$DB_NAME\";"

print_info "Database created."

# Restore backup
print_step "Restoring backup from: $BACKUP_FILE"
echo ""

if [ "$BACKUP_FORMAT" == "custom" ]; then
    # Custom format - use pg_restore
    print_info "Using pg_restore for custom format backup..."
    docker run --rm --network host \
      -e PGPASSWORD="$DB_PASSWORD" \
      -v "$BACKUP_DIR:/backup" \
      postgres:15 \
      pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --verbose \
      "/backup/$BACKUP_FILE"
else
    # SQL format - use psql
    print_info "Using psql for SQL format backup..."
    docker run --rm --network host \
      -e PGPASSWORD="$DB_PASSWORD" \
      -v "$BACKUP_DIR:/backup" \
      postgres:15 \
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -f "/backup/$BACKUP_FILE"
fi

echo ""
print_info "Restore completed successfully!"
echo ""

# Verify restore
print_step "Verifying restore..."
echo ""
docker run --rm --network host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:15 \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "
    SELECT
      schemaname,
      COUNT(*) as table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    GROUP BY schemaname;
  "

echo ""
docker run --rm --network host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:15 \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "
    SELECT
      table_name,
      (xpath('/row/count/text()', xml_count))[1]::text::int as row_count
    FROM (
      SELECT
        table_name,
        query_to_xml(format('SELECT COUNT(*) FROM %I.%I', table_schema, table_name), false, true, '') as xml_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    ) t;
  " 2>/dev/null || docker run --rm --network host \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:15 \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "
    SELECT
      'users' as table_name, COUNT(*) FROM users
    UNION ALL SELECT 'posts', COUNT(*) FROM posts
    UNION ALL SELECT 'comments', COUNT(*) FROM comments
    UNION ALL SELECT 'reactions', COUNT(*) FROM reactions
    UNION ALL SELECT 'media', COUNT(*) FROM media
    UNION ALL SELECT 'follows', COUNT(*) FROM follows
    UNION ALL SELECT 'shares', COUNT(*) FROM shares;
  "

echo ""
print_info "Database '$DB_NAME' has been restored successfully!"
print_info "You can now connect to it using:"
echo ""
echo "  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME"
echo ""
echo "Or using Docker:"
echo "  docker run -it --rm --network host -e PGPASSWORD=$DB_PASSWORD postgres:15 \\"
echo "    psql -h $DB_HOST -U $DB_USER -d $DB_NAME"
