# Quick Backup Guide - TL;DR

## Backup Database (3 seconds)

```bash
./backup_database.sh
# Press 1 for full backup
```

✅ Creates: `posting_system_backup_TIMESTAMP.sql`

## Restore Database (10 seconds)

```bash
./restore_database.sh
# Enter backup filename
# Enter database name (e.g., posting_system_restored)
# Type: yes
```

✅ Database fully restored!

## One-Line Commands

### Quick Backup
```bash
echo "1" | ./backup_database.sh
```

### Quick Compressed Backup (smaller file)
```bash
echo "2" | ./backup_database.sh
```

### Complete Backup Set
```bash
echo "5" | ./backup_database.sh
```

## Why These Scripts?

❌ **This doesn't work:**
```bash
pg_dump posting_system > backup.sql
# Error: version mismatch (14.6 client, 15.14 server)
```

✅ **This works:**
```bash
./backup_database.sh
# Uses Docker with PostgreSQL 15 - no version issues!
```

## Files Created

- [backup_database.sh](file:///home/jason/Development/claude/posting-system/backup_database.sh) - Interactive backup with 5 options
- [restore_database.sh](file:///home/jason/Development/claude/posting-system/restore_database.sh) - Safe restore with confirmations
- [DATABASE_BACKUP_README.md](file:///home/jason/Development/claude/posting-system/DATABASE_BACKUP_README.md) - Complete documentation

## That's it! 🎉

No need to install PostgreSQL 15 client tools. Just use Docker.
