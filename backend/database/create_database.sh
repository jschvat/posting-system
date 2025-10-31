#!/bin/bash
# Database Creation Script
# Creates a new PostgreSQL database with complete schema and optional seed data

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-dev_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to check if database exists
db_exists() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $1
}

# Function to run SQL file
run_sql() {
    local db=$1
    local file=$2
    local description=$3

    print_info "$description..."
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $db -f "$file" > /dev/null 2>&1; then
        print_success "$description completed"
        return 0
    else
        print_error "$description failed"
        return 1
    fi
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] <database_name>

Create a new PostgreSQL database with complete schema and optional seed data.

OPTIONS:
    -h, --help          Show this help message
    -s, --seed          Load seed data after creating schema
    --seed-only         Only load seed data (skip schema creation)
    --users             Load only users seed data
    --follows           Load only follows seed data
    --posts             Load only posts seed data
    --groups            Load only groups seed data
    --messaging         Load only messaging seed data
    --notifications     Load only notifications seed data
    --ratings           Load only ratings seed data
    -f, --force         Drop existing database if it exists
    --no-backup         Skip backup of existing database

ENVIRONMENT VARIABLES:
    DB_HOST             Database host (default: localhost)
    DB_PORT             Database port (default: 5432)
    DB_USER             Database user (default: dev_user)
    DB_PASSWORD         Database password (default: dev_password)

EXAMPLES:
    # Create new database with schema only
    $0 my_database

    # Create database with all seed data
    $0 --seed my_database

    # Create database with only users and posts
    $0 --users --posts my_database

    # Recreate existing database (with backup)
    $0 --force --seed my_database

    # Load seed data into existing database
    $0 --seed-only existing_database

EOF
    exit 0
}

# Parse arguments
SEED_ALL=false
SEED_ONLY=false
FORCE=false
NO_BACKUP=false
SEED_SECTIONS=()
DB_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -s|--seed)
            SEED_ALL=true
            shift
            ;;
        --seed-only)
            SEED_ONLY=true
            shift
            ;;
        --users)
            SEED_SECTIONS+=("01_users")
            shift
            ;;
        --follows)
            SEED_SECTIONS+=("02_follows")
            shift
            ;;
        --posts)
            SEED_SECTIONS+=("03_posts")
            shift
            ;;
        --groups)
            SEED_SECTIONS+=("04_groups")
            shift
            ;;
        --messaging)
            SEED_SECTIONS+=("05_messaging")
            shift
            ;;
        --notifications)
            SEED_SECTIONS+=("06_notifications")
            shift
            ;;
        --ratings)
            SEED_SECTIONS+=("07_ratings")
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        -*)
            print_error "Unknown option: $1"
            usage
            ;;
        *)
            DB_NAME=$1
            shift
            ;;
    esac
done

# Validate database name
if [ -z "$DB_NAME" ]; then
    print_error "Database name is required"
    usage
fi

# Display configuration
echo "======================================================================"
echo "DATABASE CREATION TOOL"
echo "======================================================================"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
if [ "$SEED_ONLY" = true ]; then
    echo "Mode: Seed data only"
elif [ "$SEED_ALL" = true ]; then
    echo "Mode: Schema + All seed data"
elif [ ${#SEED_SECTIONS[@]} -gt 0 ]; then
    echo "Mode: Schema + Selected seeds (${SEED_SECTIONS[*]})"
else
    echo "Mode: Schema only"
fi
echo "======================================================================"
echo

# Check if database exists
if db_exists "$DB_NAME"; then
    if [ "$FORCE" = true ]; then
        # Backup existing database
        if [ "$NO_BACKUP" = false ]; then
            BACKUP_FILE="${DB_NAME}_backup_$(date +%Y%m%d_%H%M%S).sql"
            print_info "Backing up existing database to $BACKUP_FILE..."
            if PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > "$BACKUP_FILE"; then
                print_success "Backup created: $BACKUP_FILE"
            else
                print_error "Backup failed"
                exit 1
            fi
        fi

        # Drop existing database
        print_info "Dropping existing database..."
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE $DB_NAME;" > /dev/null 2>&1; then
            print_success "Database dropped"
        else
            print_error "Failed to drop database"
            exit 1
        fi
    elif [ "$SEED_ONLY" = false ]; then
        print_error "Database '$DB_NAME' already exists. Use --force to recreate or --seed-only to add data."
        exit 1
    fi
fi

# Create database (if not seed-only mode)
if [ "$SEED_ONLY" = false ]; then
    if ! db_exists "$DB_NAME"; then
        print_info "Creating database..."
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1; then
            print_success "Database created"
        else
            print_error "Failed to create database"
            exit 1
        fi
    fi

    # Run unified migration
    if ! run_sql "$DB_NAME" "$SCRIPT_DIR/unified_migration.sql" "Running schema migration"; then
        exit 1
    fi
fi

# Load seed data
if [ "$SEED_ALL" = true ]; then
    if ! run_sql "$DB_NAME" "$SCRIPT_DIR/seed_all.sql" "Loading all seed data"; then
        exit 1
    fi
elif [ ${#SEED_SECTIONS[@]} -gt 0 ]; then
    for section in "${SEED_SECTIONS[@]}"; do
        if ! run_sql "$DB_NAME" "$SCRIPT_DIR/seeds/${section}.sql" "Loading seed section: $section"; then
            exit 1
        fi
    done
fi

# Display summary
echo
echo "======================================================================"
print_success "DATABASE SETUP COMPLETE!"
echo "======================================================================"
echo "Database: $DB_NAME"
echo "Connection: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo

# Show table counts
print_info "Database contents:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    'Tables' as metric,
    COUNT(*)::text as count
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT
    'Functions',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT
    'Users',
    COUNT(*)::text
FROM users
UNION ALL
SELECT
    'Posts',
    COUNT(*)::text
FROM posts
UNION ALL
SELECT
    'Groups',
    COUNT(*)::text
FROM groups;
" 2>/dev/null || true

echo
print_success "Ready to use!"
