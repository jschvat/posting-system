#!/bin/bash
# PostgreSQL Database Backup Script
# Uses Docker container with PostgreSQL 15 client to avoid version mismatch
# Database: posting_system

set -e  # Exit on error

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="posting_system"
DB_USER="dev_user"
DB_PASSWORD="dev_password"
BACKUP_DIR="$(pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_info "Starting database backup..."
print_info "Database: $DB_NAME"
print_info "Backup directory: $BACKUP_DIR"
print_info "Timestamp: $TIMESTAMP"
echo ""

# Menu for backup type
echo "Select backup type:"
echo "  1) Full backup (schema + data) - Standard SQL format"
echo "  2) Full backup (schema + data) - Compressed custom format"
echo "  3) Schema only"
echo "  4) Data only"
echo "  5) All of the above"
echo ""
read -p "Enter choice [1-5]: " BACKUP_TYPE

case $BACKUP_TYPE in
    1)
        print_info "Creating full backup (SQL format)..."
        BACKUP_FILE="posting_system_backup_${TIMESTAMP}.sql"

        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          -f "/backup/$BACKUP_FILE" \
          --verbose

        print_info "Backup completed: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
        ;;

    2)
        print_info "Creating full backup (compressed custom format)..."
        BACKUP_FILE="posting_system_backup_${TIMESTAMP}.dump"

        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          -Fc -f "/backup/$BACKUP_FILE" \
          --verbose

        print_info "Backup completed: $BACKUP_FILE"
        print_info "This is a compressed PostgreSQL custom format backup"
        print_info "Restore with: pg_restore -d database_name $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
        ;;

    3)
        print_info "Creating schema-only backup..."
        BACKUP_FILE="posting_system_schema_${TIMESTAMP}.sql"

        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          --schema-only \
          -f "/backup/$BACKUP_FILE" \
          --verbose

        print_info "Schema backup completed: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
        ;;

    4)
        print_info "Creating data-only backup..."
        BACKUP_FILE="posting_system_data_${TIMESTAMP}.sql"

        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          --data-only \
          -f "/backup/$BACKUP_FILE" \
          --verbose

        print_info "Data backup completed: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
        ;;

    5)
        print_info "Creating all backup types..."
        echo ""

        # Full SQL backup
        print_info "1/4: Full backup (SQL format)..."
        BACKUP_FILE_SQL="posting_system_backup_${TIMESTAMP}.sql"
        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          -f "/backup/$BACKUP_FILE_SQL"
        print_info "✓ Created: $BACKUP_FILE_SQL ($(ls -lh "$BACKUP_FILE_SQL" | awk '{print $5}'))"

        # Full compressed backup
        print_info "2/4: Full backup (compressed custom format)..."
        BACKUP_FILE_DUMP="posting_system_backup_${TIMESTAMP}.dump"
        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          -Fc -f "/backup/$BACKUP_FILE_DUMP"
        print_info "✓ Created: $BACKUP_FILE_DUMP ($(ls -lh "$BACKUP_FILE_DUMP" | awk '{print $5}'))"

        # Schema only
        print_info "3/4: Schema-only backup..."
        BACKUP_FILE_SCHEMA="posting_system_schema_${TIMESTAMP}.sql"
        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          --schema-only \
          -f "/backup/$BACKUP_FILE_SCHEMA"
        print_info "✓ Created: $BACKUP_FILE_SCHEMA ($(ls -lh "$BACKUP_FILE_SCHEMA" | awk '{print $5}'))"

        # Data only
        print_info "4/4: Data-only backup..."
        BACKUP_FILE_DATA="posting_system_data_${TIMESTAMP}.sql"
        docker run --rm --network host \
          -e PGPASSWORD="$DB_PASSWORD" \
          -v "$BACKUP_DIR:/backup" \
          postgres:15 \
          pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          --data-only \
          -f "/backup/$BACKUP_FILE_DATA"
        print_info "✓ Created: $BACKUP_FILE_DATA ($(ls -lh "$BACKUP_FILE_DATA" | awk '{print $5}'))"

        echo ""
        print_info "All backups completed:"
        ls -lh posting_system_*_${TIMESTAMP}.*
        ;;

    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
print_info "Backup process completed successfully!"
echo ""
print_info "To restore this backup:"
if [[ $BACKUP_TYPE == 2 ]]; then
    echo "  pg_restore -h localhost -U dev_user -d posting_system_restored $BACKUP_FILE"
else
    echo "  PGPASSWORD=dev_password psql -h localhost -U dev_user -d posting_system_restored -f $BACKUP_FILE"
fi
echo ""
print_info "Or using Docker:"
if [[ $BACKUP_TYPE == 2 ]]; then
    echo "  docker run --rm --network host -e PGPASSWORD=dev_password -v \$(pwd):/backup postgres:15 \\"
    echo "    pg_restore -h localhost -U dev_user -d posting_system_restored /backup/$BACKUP_FILE"
else
    echo "  docker run --rm --network host -e PGPASSWORD=dev_password -v \$(pwd):/backup postgres:15 \\"
    echo "    psql -h localhost -U dev_user -d posting_system_restored -f /backup/$BACKUP_FILE"
fi
