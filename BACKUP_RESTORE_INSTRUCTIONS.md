# Database Backup & Restore Instructions

## Summary

✅ **Local backup created successfully!**

- **Backup file:** `/home/jason/Development/backup/claude/posting_system_backup_20251016_095738.sql.gz`
- **File size:** 36 KB (compressed from 196 KB)
- **Database:** posting_system (PostgreSQL 15)
- **Tables:** 25 tables with full data

---

## Option 1: Restore to miniserver.local (Recommended)

### Prerequisites
The remote PostgreSQL server needs to be configured to accept connections:

1. **On miniserver.local**, edit PostgreSQL configuration:
```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```
Change: `listen_addresses = '*'`

2. **Configure authentication:**
```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```
Add this line:
```
host    all             all             192.168.1.0/24          md5
```

3. **Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

4. **Create the user (if doesn't exist):**
```bash
sudo -u postgres psql
```
```sql
CREATE USER jason WITH PASSWORD '1Daniel0716!' SUPERUSER;
\q
```

### Method A: Copy backup to miniserver and restore locally

This is the most reliable method:

1. **Copy backup file to miniserver:**
```bash
scp /home/jason/Development/backup/claude/posting_system_backup_20251016_095738.sql.gz jason@miniserver.local:/tmp/
```

2. **SSH to miniserver:**
```bash
ssh jason@miniserver.local
```

3. **Run restore on miniserver:**
```bash
cd /tmp
gunzip posting_system_backup_20251016_095738.sql.gz

# Create database
sudo -u postgres createdb posting_system

# Restore backup
sudo -u postgres psql -d posting_system -f posting_system_backup_20251016_095738.sql

# Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE posting_system TO jason;"
sudo -u postgres psql -d posting_system -c "GRANT ALL ON SCHEMA public TO jason;"
sudo -u postgres psql -d posting_system -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO jason;"
sudo -u postgres psql -d posting_system -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO jason;"

# Verify
psql -U jason -d posting_system -c "\dt"
```

### Method B: Use the automated restore script

1. **Copy files to miniserver:**
```bash
scp /home/jason/Development/backup/claude/posting_system_backup_20251016_095738.sql.gz jason@miniserver.local:/home/jason/Development/backup/claude/
scp /home/jason/Development/claude/posting-system/restore_to_miniserver.sh jason@miniserver.local:/tmp/
```

2. **SSH to miniserver and run:**
```bash
ssh jason@miniserver.local
cd /tmp
chmod +x restore_to_miniserver.sh
./restore_to_miniserver.sh
```

---

## Option 2: Restore over Network

Once the remote server is properly configured, run:

```bash
cd /home/jason/Development/claude/posting-system
./backup_to_remote.sh
```

This will:
1. Test connection to miniserver.local
2. Create fresh backup
3. Create database on remote server
4. Restore all data
5. Verify table count

---

## Create New Backups

### Quick Backup (Local Only)

```bash
cd /home/jason/Development/claude/posting-system

# Create timestamped backup
docker exec posting_system_db pg_dump -U dev_user -d posting_system \
  --no-owner --no-privileges -f /tmp/dump.sql

docker cp posting_system_db:/tmp/dump.sql \
  "/home/jason/Development/backup/claude/posting_system_$(date +%Y%m%d_%H%M%S).sql"

# Compress
gzip "/home/jason/Development/backup/claude/posting_system_$(date +%Y%m%d_%H%M%S).sql"
```

### Full Backup with Remote Restore

```bash
cd /home/jason/Development/claude/posting-system
./backup_to_remote.sh
```

---

## Restore from Backup (Local)

To restore a backup to your local Docker PostgreSQL:

```bash
# Choose a backup file
BACKUP_FILE="/home/jason/Development/backup/claude/posting_system_backup_20251016_095738.sql.gz"

# Stop the backend server first (if running)
# pkill -f "node src/server.js"

# Drop and recreate database
PGPASSWORD=dev_password psql -h localhost -U dev_user -d postgres \
  -c "DROP DATABASE IF EXISTS posting_system;"

PGPASSWORD=dev_password psql -h localhost -U dev_user -d postgres \
  -c "CREATE DATABASE posting_system;"

# Restore
gunzip -c "$BACKUP_FILE" | PGPASSWORD=dev_password \
  psql -h localhost -U dev_user -d posting_system

# Verify
PGPASSWORD=dev_password psql -h localhost -U dev_user -d posting_system -c "\dt"
```

---

## Verify Database After Restore

```bash
# On miniserver.local:
psql -U jason -d posting_system -c "
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

# Check row counts
psql -U jason -d posting_system -c "
SELECT
    schemaname || '.' || tablename AS table,
    n_live_tup AS rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"
```

---

## Backup Files Location

Local backups are stored in:
```
/home/jason/Development/backup/claude/posting_system_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## Troubleshooting

### Connection Issues

If you can't connect to miniserver.local:5432:

1. **Check PostgreSQL is listening:**
```bash
# On miniserver
sudo netstat -nlpt | grep 5432
```

2. **Check firewall:**
```bash
# On miniserver
sudo ufw status
sudo ufw allow 5432/tcp
```

3. **Test connection:**
```bash
# From local machine
telnet miniserver.local 5432
```

4. **Check pg_hba.conf:**
```bash
# On miniserver
sudo cat /etc/postgresql/15/main/pg_hba.conf | grep -v "^#"
```

### Authentication Issues

If password authentication fails:

1. **Reset password:**
```bash
# On miniserver
sudo -u postgres psql -c "ALTER USER jason PASSWORD '1Daniel0716!';"
```

2. **Check user exists:**
```bash
# On miniserver
sudo -u postgres psql -c "\du"
```

3. **Grant superuser (if needed):**
```bash
# On miniserver
sudo -u postgres psql -c "ALTER USER jason WITH SUPERUSER;"
```

---

## Database Schema Information

The backup includes:

- **25 tables** across 6 subsystems:
  1. Core System (5 tables): users, posts, comments, media, reactions
  2. Social Features (4 tables): follows, shares, user_stats, timeline_cache
  3. Interaction Tracking (2 tables): comment_interactions, comment_metrics
  4. Reputation System (4 tables): user_ratings, user_reputation, rating_reports, helpful_marks
  5. Geolocation (2 tables): location_history, nearby_search_cache
  6. Group System (9 tables): groups, group_memberships, group_posts, group_comments, etc.

- **32 stored functions**
- **18 triggers**
- **85+ indexes**
- **2 extensions:** uuid-ossp, ltree

Full schema documentation: [database_schema_documentation.pdf](database_schema_documentation.pdf)

---

## Next Steps

1. ✅ Local backup is complete and verified
2. ⏳ Configure miniserver.local PostgreSQL for remote connections (see prerequisites above)
3. ⏳ Copy backup to miniserver and restore using Method A or B
4. ⏳ Verify database on miniserver
5. ⏳ Update application config to point to miniserver (optional)

---

## Support

If you encounter issues:

1. Check the backup file exists and is not corrupted:
```bash
ls -lh /home/jason/Development/backup/claude/posting_system_backup_*.sql.gz
gunzip -t /home/jason/Development/backup/claude/posting_system_backup_*.sql.gz
```

2. Check PostgreSQL logs:
```bash
# On miniserver
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

3. Test with a simpler connection:
```bash
psql -h miniserver.local -U postgres -d postgres
```
