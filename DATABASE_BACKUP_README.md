# Database Backup & Restore Scripts

Two convenient scripts for backing up and restoring the PostgreSQL database using Docker.

## Why Docker?

These scripts use Docker with PostgreSQL 15 to avoid version mismatch issues:
- **Your system:** PostgreSQL 14.6 client tools
- **Your database:** PostgreSQL 15.14 server

Using Docker ensures compatibility without needing to upgrade system packages.

---

## 📦 Backup Script

### Usage

```bash
./backup_database.sh
```

### Interactive Menu

The script presents 5 backup options:

1. **Full backup (SQL format)** - Standard PostgreSQL dump
   - File: `posting_system_backup_TIMESTAMP.sql`
   - Human-readable SQL statements
   - Easy to review and edit
   - ~78 KB for current database

2. **Full backup (compressed custom format)** - Binary compressed
   - File: `posting_system_backup_TIMESTAMP.dump`
   - Compressed binary format
   - Smaller file size (~25-40% smaller)
   - Requires `pg_restore` to restore (not `psql`)

3. **Schema only** - Database structure without data
   - File: `posting_system_schema_TIMESTAMP.sql`
   - Tables, indexes, functions, triggers, constraints
   - Useful for creating empty databases with same structure
   - ~35 KB

4. **Data only** - Table data without structure
   - File: `posting_system_data_TIMESTAMP.sql`
   - INSERT/COPY statements for all data
   - Useful for data migration
   - Size varies with data volume

5. **All of the above** - Creates all 4 backup types
   - Complete backup set for maximum flexibility
   - Recommended for important backups

### Examples

```bash
# Run backup script
cd /home/jason/Development/claude/posting-system
./backup_database.sh

# Select option 1 for quick full backup
# Select option 2 for compressed backup (saves space)
# Select option 5 for complete backup set
```

### What It Does

1. ✅ Checks if Docker is running
2. ✅ Shows backup configuration
3. ✅ Prompts for backup type
4. ✅ Runs `pg_dump` via PostgreSQL 15 Docker container
5. ✅ Creates timestamped backup file(s)
6. ✅ Shows file size and restore instructions

### Configuration

Edit these variables at the top of `backup_database.sh`:

```bash
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="posting_system"
DB_USER="dev_user"
DB_PASSWORD="dev_password"
BACKUP_DIR="$(pwd)"
```

---

## 📥 Restore Script

### Usage

```bash
./restore_database.sh
```

### Interactive Process

1. Shows available backup files
2. Prompts for backup file name
3. Auto-detects backup format (.sql or .dump)
4. Prompts for target database name
5. Warns about dropping existing database
6. Asks for confirmation
7. Creates/recreates database
8. Restores backup
9. Verifies restoration with table counts

### Examples

```bash
# Run restore script
cd /home/jason/Development/claude/posting-system
./restore_database.sh

# Follow prompts:
# 1. Enter: posting_system_backup_20251009_055249.sql
# 2. Enter: posting_system_test (or any database name)
# 3. Type: yes (to confirm)
```

### Safety Features

- ⚠️ Lists available backups before asking for filename
- ⚠️ Warns if database already exists
- ⚠️ Requires typing "yes" to confirm (not just "y")
- ⚠️ Terminates existing connections before dropping database
- ✅ Verifies restoration by showing table and row counts

### What It Does

1. ✅ Checks if Docker is running
2. ✅ Lists available backup files
3. ✅ Detects backup format (SQL or custom)
4. ✅ Checks if target database exists
5. ✅ Drops existing database if confirmed
6. ✅ Creates new database
7. ✅ Restores backup using appropriate tool
8. ✅ Verifies restore with table counts
9. ✅ Shows connection command

---

## 🔧 Manual Commands

### Manual Backup (if you prefer)

```bash
# Full backup (SQL format)
docker run --rm --network host \
  -e PGPASSWORD=dev_password \
  -v $(pwd):/backup \
  postgres:15 \
  pg_dump -h localhost -U dev_user -d posting_system \
  -f /backup/posting_system_backup.sql

# Full backup (compressed)
docker run --rm --network host \
  -e PGPASSWORD=dev_password \
  -v $(pwd):/backup \
  postgres:15 \
  pg_dump -h localhost -U dev_user -d posting_system \
  -Fc -f /backup/posting_system_backup.dump

# Schema only
docker run --rm --network host \
  -e PGPASSWORD=dev_password \
  -v $(pwd):/backup \
  postgres:15 \
  pg_dump -h localhost -U dev_user -d posting_system \
  --schema-only -f /backup/schema.sql

# Data only
docker run --rm --network host \
  -e PGPASSWORD=dev_password \
  -v $(pwd):/backup \
  postgres:15 \
  pg_dump -h localhost -U dev_user -d posting_system \
  --data-only -f /backup/data.sql
```

### Manual Restore (if you prefer)

```bash
# Create database
docker run --rm --network host \
  -e PGPASSWORD=dev_password \
  postgres:15 \
  psql -h localhost -U dev_user -d postgres \
  -c "CREATE DATABASE my_database;"

# Restore SQL backup
docker run --rm --network host \
  -e PGPASSWORD=dev_password \
  -v $(pwd):/backup \
  postgres:15 \
  psql -h localhost -U dev_user -d my_database \
  -f /backup/posting_system_backup.sql

# Restore compressed backup
docker run --rm --network host \
  -e PGPASSWORD=dev_password \
  -v $(pwd):/backup \
  postgres:15 \
  pg_restore -h localhost -U dev_user -d my_database \
  /backup/posting_system_backup.dump
```

---

## 📋 Current Backups

### Latest Complete Backup
- **File:** `posting_system_FULL_BACKUP_20251009_055249.sql`
- **Size:** 78 KB
- **Format:** SQL (schema + data)
- **Contents:**
  - 17 tables with complete schema
  - 329 rows of data
  - 14 users, 18 posts, 99 comments, 62 reactions
  - All indexes, triggers, functions, foreign keys

### Backup Location
All backups are saved in:
```
/home/jason/Development/claude/posting-system/
```

Additional backups in:
```
/home/jason/Development/backup/claude/database-backups/
```

---

## 🔄 Recommended Backup Schedule

### Development
- **Before schema changes:** Always backup
- **Daily:** Full backup (option 1)
- **Weekly:** Complete backup set (option 5)

### Production (when deployed)
- **Hourly:** Automated full backup
- **Daily:** Keep last 7 days
- **Weekly:** Keep last 4 weeks
- **Monthly:** Keep last 12 months
- **Before deployments:** Always backup

### Cron Job Example

```bash
# Add to crontab: crontab -e

# Daily backup at 2 AM
0 2 * * * cd /home/jason/Development/claude/posting-system && echo "1" | ./backup_database.sh

# Weekly full set on Sunday at 3 AM
0 3 * * 0 cd /home/jason/Development/claude/posting-system && echo "5" | ./backup_database.sh

# Cleanup old backups (keep last 30 days)
0 4 * * * find /home/jason/Development/claude/posting-system -name "posting_system_*.sql" -mtime +30 -delete
```

---

## ⚠️ Troubleshooting

### Docker not running
```
[ERROR] Docker is not running. Please start Docker and try again.
```
**Solution:** Start Docker: `sudo systemctl start docker`

### Permission denied
```
bash: ./backup_database.sh: Permission denied
```
**Solution:** Make executable: `chmod +x backup_database.sh`

### File not found
```
[ERROR] Backup file not found: posting_system_backup.sql
```
**Solution:** Check filename, ensure you're in the correct directory

### Database exists warning
The restore script will warn you before dropping an existing database. This is intentional for safety.

---

## 📚 Additional Resources

### Migration Files
All schema migrations are in:
```
backend/src/database/migrations/
```

### Migration Verification
See complete verification report:
```
/home/jason/Development/backup/claude/database-backups/MIGRATION_VERIFICATION.md
```

### Backup Documentation
Complete backup information:
```
/home/jason/Development/backup/claude/database-backups/BACKUP_COMPLETE.md
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Backup database | `./backup_database.sh` |
| Restore database | `./restore_database.sh` |
| Make scripts executable | `chmod +x *.sh` |
| List backups | `ls -lht posting_system_*.sql` |
| Check backup size | `du -sh posting_system_*.sql` |
| Test restore | Run restore script with test database name |

---

## ✅ Benefits of These Scripts

1. **No version conflicts** - Uses Docker with correct PostgreSQL version
2. **User-friendly** - Interactive menus with clear prompts
3. **Safe** - Multiple confirmations before destructive operations
4. **Flexible** - Multiple backup format options
5. **Informative** - Shows file sizes, timestamps, row counts
6. **Verified** - Includes verification step after restore
7. **Documented** - Clear restore instructions in output

Enjoy easy database backups! 🎉
