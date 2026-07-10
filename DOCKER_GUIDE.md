# Docker Guide

Docker support is included for production-like local verification and deployment packaging.

## Files

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

## Required `.env` values

Create `.env` from `.env.example` and set at minimum:

```env
NODE_ENV=production
REQUIRE_DB=true
DB_NAME=smart_school
DB_USER=smartschool
DB_PASSWORD=replace_me
MYSQL_ROOT_PASSWORD=replace_me_root
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGINS=http://localhost:3000
AI_API_BASE_URL=https://api.gapgpt.app/v1
AI_DEFAULT_MODEL=gpt-4o
SMS_SENDER_NUMBER=9982002811
```

Do not commit `.env`.

## Start stack

```bash
docker compose up --build -d mysql
docker compose run --rm app npm run db:init
docker compose up --build -d app
```

## Verify stack

```bash
docker compose ps
curl http://localhost:${APP_PORT:-3000}/api/health
curl http://localhost:${APP_PORT:-3000}/api/health/db
```

## Run live verification against Docker

```bash
LIVE_BASE_URL=http://localhost:${APP_PORT:-3000} LIVE_SKIP_DB_SETUP=true npm run live:verify
```

To include real AI/SMS provider calls, add:

```bash
RUN_REAL_AI_TEST=true RUN_REAL_SMS_TEST=true TEST_SMS_RECIPIENT=09123456789 npm run live:verify
```

## Volumes

- `smartschool_mysql_data`: persistent MySQL data
- `smartschool_uploads`: persistent uploaded files

## Healthchecks

- MySQL uses `mysqladmin ping`.
- App uses `/api/health`.
- `/api/health/db` can be used by external monitors to verify DB connectivity.
