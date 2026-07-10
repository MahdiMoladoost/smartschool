# Backup and Restore Guide

## MySQL backup

Create a timestamped backup directory:

```bash
mkdir -p backups/mysql
```

Run backup:

```bash
mysqldump \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines --triggers --events \
  "$DB_NAME" > "backups/mysql/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
```

For Docker Compose:

```bash
docker compose exec mysql sh -c 'mysqldump -u$MYSQL_USER -p$MYSQL_PASSWORD --single-transaction --routines --triggers --events $MYSQL_DATABASE' > backups/mysql/smart_school_$(date +%Y%m%d_%H%M%S).sql
```

## MySQL restore

Stop app writes first, then restore:

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backup.sql
```

For Docker Compose:

```bash
docker compose exec -T mysql sh -c 'mysql -u$MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE' < backup.sql
```

## Environment variable backup

- Keep `.env` out of Git.
- Store a copy in a password manager or secret manager.
- Record which variables are required for each environment.
- Rotate `JWT_SECRET`, AI keys, and SMS keys immediately if leaked.

## Uploaded/static file backup

Back up these paths/volumes if uploads are used:

- `public/uploads/`
- Docker volume `smartschool_uploads`

Example:

```bash
tar -czf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz public/uploads
```

Docker volume example:

```bash
docker run --rm -v smartschool_smartschool_uploads:/data -v "$PWD/backups:/backup" alpine tar -czf /backup/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

## Disaster recovery steps

1. Provision clean server.
2. Install Docker or Node/MySQL runtime.
3. Restore `.env` from secret manager.
4. Restore MySQL backup.
5. Restore uploaded files.
6. Run `npm run live:verify` or Docker equivalent.
7. Only switch DNS/load balancer traffic after verification passes.
