#!/bin/bash

# Manual restore script for miniserver.local
# Run this script ON the miniserver (not from local machine)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Restore Database to miniserver.local ===${NC}"
echo ""

# Find the latest backup
BACKUP_FILE=$(ls -t /home/jason/Development/backup/claude/posting_system_backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}No backup file found!${NC}"
    echo "Expected location: /home/jason/Development/backup/claude/posting_system_backup_*.sql.gz"
    exit 1
fi

echo "Latest backup: $BACKUP_FILE"
echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""

# Database settings
DB_NAME="posting_system"
DB_USER="jason"

echo -e "${YELLOW}Step 1: Checking PostgreSQL service...${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo "Start it with: sudo systemctl start postgresql"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Checking if database exists...${NC}"
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists${NC}"
    read -p "Drop and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping database..."
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo "Aborting"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Step 3: Creating database...${NC}"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME WITH ENCODING='UTF8';"
echo -e "${GREEN}✓ Database created${NC}"

echo ""
echo -e "${YELLOW}Step 4: Creating user (if not exists)...${NC}"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '1Daniel0716!';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
echo -e "${GREEN}✓ User configured${NC}"

echo ""
echo -e "${YELLOW}Step 5: Restoring backup...${NC}"
echo "This may take a few minutes..."
gunzip -c "$BACKUP_FILE" | sudo -u postgres psql -d $DB_NAME > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Restore successful${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 6: Verifying database...${NC}"
TABLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables in database: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Database appears healthy${NC}"
else
    echo -e "${RED}✗ No tables found${NC}"
fi

echo ""
echo -e "${GREEN}=== Restore Complete ===${NC}"
echo ""
echo "Database: $DB_NAME"
echo "Tables: $TABLE_COUNT"
echo ""
echo "To connect:"
echo "  psql -U $DB_USER -d $DB_NAME"
echo ""
