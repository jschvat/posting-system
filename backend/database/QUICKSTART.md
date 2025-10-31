# Database Quick Start Guide

## TL;DR - Common Commands

```bash
cd /home/jason/Development/claude/posting-system/backend/database

# Create new database with schema and all data
./create_database.sh --seed my_new_db

# Create database with schema only
./create_database.sh my_new_db

# Create database with only users and posts
./create_database.sh --users --posts my_new_db

# Add seed data to existing database
./create_database.sh --seed-only existing_db

# Recreate database (makes backup first)
./create_database.sh --force --seed my_db

# Compare two databases
DB_NAME=posting_system node compare_databases.js
```

## Saved Commands

### 1. Create New Database

**Full setup (schema + all seed data):**
```bash
./create_database.sh --seed my_database
```

**Schema only:**
```bash
./create_database.sh my_database
```

**With specific sections:**
```bash
./create_database.sh --users --posts --groups my_database
```

### 2. Regenerate Scripts

**After modifying migrations:**
```bash
node create_unified_migration.js
```

**Export current database data:**
```bash
node create_seed_scripts.js
```

### 3. Manual Commands (if you prefer)

**Create empty database:**
```bash
createdb -U dev_user my_database
# or
PGPASSWORD=dev_password psql -h localhost -p 5432 -U dev_user -d postgres -c "CREATE DATABASE my_database;"
```

**Run migration:**
```bash
PGPASSWORD=dev_password psql -h localhost -p 5432 -U dev_user -d my_database -f unified_migration.sql
```

**Load all seeds:**
```bash
PGPASSWORD=dev_password psql -h localhost -p 5432 -U dev_user -d my_database -f seed_all.sql
```

**Load specific seed:**
```bash
PGPASSWORD=dev_password psql -h localhost -p 5432 -U dev_user -d my_database -f seeds/01_users.sql
```

### 4. Testing & Validation

**Test migration on dummy database:**
```bash
./create_database.sh --seed test_$(date +%Y%m%d)
```

**Compare databases:**
```bash
node compare_databases.js
```

**Verify table counts:**
```bash
PGPASSWORD=dev_password psql -h localhost -p 5432 -U dev_user -d my_database -c "
SELECT tablename, COUNT(*)
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY tablename;"
```

### 5. Backup & Restore

**Backup database:**
```bash
PGPASSWORD=dev_password pg_dump -h localhost -p 5432 -U dev_user posting_system > backup_$(date +%Y%m%d).sql
```

**Restore from backup:**
```bash
./create_database.sh my_restored_db
PGPASSWORD=dev_password psql -h localhost -p 5432 -U dev_user -d my_restored_db -f backup_20241031.sql
```

## Script Options Reference

### create_database.sh

| Option | Description |
|--------|-------------|
| `--seed` | Load all seed data |
| `--seed-only` | Skip schema, only load seeds |
| `--users` | Load only users section |
| `--follows` | Load only follows section |
| `--posts` | Load only posts section |
| `--groups` | Load only groups section |
| `--messaging` | Load only messaging section |
| `--notifications` | Load only notifications section |
| `--ratings` | Load only ratings section |
| `--force` | Drop and recreate if exists |
| `--no-backup` | Skip backup when using --force |

## Environment Variables

Set these to customize database connection:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=dev_user
export DB_PASSWORD=dev_password

# Then run commands without PGPASSWORD prefix
./create_database.sh --seed my_db
```

## Common Scenarios

### Scenario 1: Fresh Development Environment

```bash
# Create new dev database with sample data
./create_database.sh --seed posting_system_dev

# Verify
PGPASSWORD=dev_password psql -h localhost -U dev_user -d posting_system_dev -c "\dt"
```

### Scenario 2: Testing Environment

```bash
# Create test database with only essential data
./create_database.sh --users --posts posting_system_test
```

### Scenario 3: Production Clone for Debugging

```bash
# Backup production
PGPASSWORD=prod_password pg_dump -h prod.example.com -U prod_user posting_system > prod_backup.sql

# Create local copy
./create_database.sh posting_system_debug
PGPASSWORD=dev_password psql -U dev_user -d posting_system_debug -f prod_backup.sql
```

### Scenario 4: Reset Development Database

```bash
# Drop and recreate with fresh data
./create_database.sh --force --seed posting_system
```

### Scenario 5: Update Seeds After Data Changes

```bash
# Export current data
node create_seed_scripts.js

# Commit updated seed files
git add seeds/*.sql seed_all.sql
git commit -m "Update seed data with latest changes"
```

## Troubleshooting

**"Database already exists"**
```bash
# Use --force to recreate (makes backup first)
./create_database.sh --force my_database

# Or manually drop
PGPASSWORD=dev_password psql -U dev_user -d postgres -c "DROP DATABASE my_database;"
```

**"Permission denied"**
```bash
# Grant permissions
PGPASSWORD=dev_password psql -U postgres -c "ALTER USER dev_user CREATEDB;"
```

**"Extension does not exist"**
```bash
# Install PostgreSQL contrib package
sudo apt-get install postgresql-contrib

# Or enable as superuser
PGPASSWORD=postgres psql -U postgres -d my_database -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"
```

**Migration fails partway through**
```bash
# Check the error in detail
PGPASSWORD=dev_password psql -U dev_user -d my_database -f unified_migration.sql 2>&1 | less

# Drop and retry
PGPASSWORD=dev_password psql -U dev_user -d postgres -c "DROP DATABASE my_database;"
./create_database.sh my_database
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE COMMANDS                          │
├─────────────────────────────────────────────────────────────┤
│ Create DB (full)    ./create_database.sh --seed NAME        │
│ Create DB (empty)   ./create_database.sh NAME               │
│ Add data            ./create_database.sh --seed-only NAME   │
│ Reset DB            ./create_database.sh --force --seed NAME│
│                                                              │
│ Regenerate migration  node create_unified_migration.js      │
│ Export seed data      node create_seed_scripts.js           │
│ Compare databases     node compare_databases.js             │
│                                                              │
│ Manual migration    psql -U dev_user -d NAME \              │
│                       -f unified_migration.sql              │
│ Manual seed         psql -U dev_user -d NAME \              │
│                       -f seed_all.sql                       │
│                                                              │
│ Backup              pg_dump -U dev_user NAME > backup.sql   │
│ Restore             psql -U dev_user -d NAME -f backup.sql  │
└─────────────────────────────────────────────────────────────┘
```

## Files Summary

| File | Purpose | Size |
|------|---------|------|
| `unified_migration.sql` | Complete schema | 182 KB |
| `seed_all.sql` | All seed data | Master script |
| `seeds/01_users.sql` | Users & profiles | ~30 KB |
| `seeds/02_follows.sql` | Follow relationships | ~1 KB |
| `seeds/03_posts.sql` | Posts & comments | ~35 KB |
| `seeds/04_groups.sql` | Groups & content | ~10 KB |
| `seeds/05_messaging.sql` | Messages | ~2 KB |
| `seeds/06_notifications.sql` | Notifications | ~1 KB |
| `seeds/07_ratings.sql` | Ratings | <1 KB |
| `create_database.sh` | Creation tool | Script |
| `create_unified_migration.js` | Migration generator | Script |
| `create_seed_scripts.js` | Seed generator | Script |
| `compare_databases.js` | Comparison tool | Script |

---

**Last Updated:** 2025-10-31
**Database Version:** Includes all migrations through 020
