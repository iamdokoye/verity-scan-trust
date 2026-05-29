# Votta

Votta is a tamper-evident academic records management and credential verification system.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript, Prisma
- Storage and auth: Supabase
- Cryptography: SHA-256 hashes and RSA-2048 signatures

## Project Structure

```text
.
├── app/                  # Next.js frontend routes
├── components/           # Shared UI components
├── lib/                  # Frontend API and auth helpers
├── backend/              # Express API
│   ├── prisma/           # Prisma schema and seed
│   └── src/              # Backend source
└── supabase/             # Supabase setup notes
```

## Environment

Copy the frontend example:

```bash
cp .env.example .env.local
```

Copy the backend example:

```bash
cp backend/.env.example backend/.env
```

Fill in Supabase, database, and institution signing key values in `backend/.env`.

Generate institution keys with:

```bash
cd backend
npm run keys:generate
```

## Install

Install frontend dependencies from the repo root:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

## Development

Run the backend:

```bash
cd backend
npm run dev
```

Run the frontend:

```bash
npm run dev -- -p 3001
```

Health check:

```bash
curl http://localhost:3000/health
```

## Verification Flow

1. Admin uploads or generates a document.
2. The backend hashes the file, signs the hash, stores the file, and creates a verification token.
3. The student sees the document QR code and verification link.
4. A verifier scans the QR code or enters the token at `/verify?token=...`.
5. The backend recomputes the file hash and verifies the RSA signature before returning the result.

## Build

Frontend:

```bash
npm run build
```

Backend:

```bash
cd backend
npm run build
```
