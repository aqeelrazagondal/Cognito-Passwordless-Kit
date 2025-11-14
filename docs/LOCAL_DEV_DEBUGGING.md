# Local Development & Debugging

How to run AuthKit locally, inspect logs, and debug common issues.

Status: Stable • Audience: Developers

---

## Prerequisites
- Node.js 18+
- npm
- Optional: Docker (for local DynamoDB)

## Start the API (in-memory)
```bash
npm install
npm run start:dev
# API: http://localhost:3000/api
# Health: http://localhost:3000/health
```

## Using DynamoDB locally (optional)
```bash
docker compose -f docker-compose.test.yml up -d dynamodb
export PERSISTENCE_BACKEND=dynamodb
export DYNAMO_REGION=us-east-1
export DYNAMO_TABLE_PREFIX=authkit_local_
npm run start:dev
```

## Logs & Tracing
- Structured logs in stdout (JSON) when `NODE_ENV=development`
- Enable X‑Ray locally only when using AWS SAM/localstack; otherwise keep disabled

## Hot reload
- NestJS watch mode is enabled in `start:dev`

## Common debug tips
- 401/403: verify tokens and device bindings
- 429: you hit rate limits; reset local counters by clearing the Counters table
- SES/SNS delivery: check provider credentials and region
