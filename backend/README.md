# Votta Backend

Node.js + Express + TypeScript REST API for the Votta tamper-evident academic
records system. Sits between the frontend and Supabase (PostgreSQL via Prisma,
Auth via JWKS, Storage for documents).

## Setup

```bash
cd backend
npm install
cp .env.example .env

# Generate institution RSA keypair and paste the printed values into .env
npm run keys:generate

# Push Prisma schema to your Supabase Postgres
npm run db:generate
npm run db:migrate

# Optional demo data
npm run db:seed

# Run the API
npm run dev
```

Health check: `GET http://localhost:3000/health`

## Project layout

```
src/
  index.ts            entry point
  app.ts              express app + middleware
  config/             env, supabase, prisma
  middleware/         auth, rbac, validation, upload, rate limit
  routes/             route definitions per resource
  controllers/        thin HTTP handlers
  services/           business logic (crypto, document pipeline, GPA, etc.)
  schemas/            zod validators
  scripts/            generateKeys.ts
  utils/              errors, response helpers, logger
prisma/
  schema.prisma
  seed.ts
```

## Key endpoints

| Method | Path                                                | Auth   | Notes                              |
| ------ | --------------------------------------------------- | ------ | ---------------------------------- |
| GET    | `/health`                                           | none   | Liveness                           |
| POST   | `/api/v1/auth/login`                                | none   | Returns access + refresh tokens    |
| POST   | `/api/v1/auth/refresh`                              | none   |                                    |
| GET    | `/api/v1/verify?token=...`                          | none   | Public verification (rate-limited) |
| GET    | `/api/v1/verify/public-key`                         | none   | Institution public key (PEM)       |
| POST   | `/api/v1/documents/students/:studentId`             | admin  | Upload document (multipart `file`) |
| PATCH  | `/api/v1/documents/:documentId/approve`             | admin  | Sign + issue token + QR            |
| PATCH  | `/api/v1/documents/:documentId/reject`              | admin  |                                    |
| POST   | `/api/v1/documents/:documentId/supersede`           | admin  | Replace with corrected document    |
| PATCH  | `/api/v1/documents/:documentId/revoke`              | admin  |                                    |
| POST   | `/api/v1/documents/students/:studentId/transcript`  | admin  | Stream signed PDF                  |
| GET    | `/api/v1/audit`                                     | admin  | Filterable audit log               |

## Verification flow

1. Frontend POSTs `token` from QR scan / paste to `/api/v1/verify`.
2. Backend looks up the document, blocks early if `superseded` / `revoked`.
3. Downloads file from Supabase Storage, **recomputes** SHA-256.
4. Compares to stored hash → tampered? Fails.
5. Verifies institutional RSA signature → invalid? Fails.
6. All checks pass → returns `{ status: "verified", ... }`.

Every verification attempt is logged in `verification_logs` and `audit_logs`.

## Docker

```bash
docker compose up --build
```

Brings up `api` (Express) plus local `postgres` and `minio` for fully
offline development. For production, point `DATABASE_URL` and Supabase env
vars at your real project.
