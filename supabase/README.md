# Supabase Project

## Structure

```
supabase/
├── config.toml                                          # Supabase CLI config
├── functions/
│   └── healthcheck/index.ts                            # Deno Edge Function (status check)
└── migrations/
    ├── 20240101000001_custom_access_token_hook.sql     # JWT claims injection (CRITICAL)
    ├── 20240101000002_append_only_audit_log.sql        # Audit log tamper protection
    ├── 20240101000003_rls_policies.sql                 # Row Level Security
    └── 20240101000004_tamper_simulation.sql            # Demo tamper helper
```

## Deployment order

### 1. Link your Supabase project

```bash
supabase link --project-ref <your-project-ref>
```

Or set `project_id` in `config.toml` manually.

### 2. Run Prisma migration (creates all tables)

```bash
cd backend
npm run db:migrate
```

### 3. Push SQL migrations via CLI or SQL Editor

**Option A — Supabase CLI (recommended):**
```bash
supabase db push
```

**Option B — Supabase SQL Editor:**

Open your project → SQL Editor → New query. Paste and run each file in order:

| File | What it does |
|------|-------------|
| `20240101000001_custom_access_token_hook.sql` | JWT hook — injects `user_role` + `institution_id` into every token |
| `20240101000002_append_only_audit_log.sql` | Trigger that blocks UPDATE/DELETE on `audit_logs` |
| `20240101000003_rls_policies.sql` | Row Level Security on all 10 tables |
| `20240101000004_tamper_simulation.sql` | Demo helper — simulates document tampering (optional) |

### 4. Register the Custom Access Token Hook — CRITICAL

Without this step, all authenticated API requests will fail because `user_role` and `institution_id` won't be present in the JWT.

1. Go to **Supabase Dashboard → Authentication → Hooks**
2. Under **"Custom Access Token"**, click **Add hook**
3. Select:
   - Schema: `public`
   - Function: `custom_access_token_hook`
4. Click **Save**

Verify it works: log in via `POST /api/v1/auth/login`, decode the returned JWT at [jwt.io](https://jwt.io), and confirm you see:
```json
{
  "user_role": "admin",
  "institution_id": "your-institution-uuid"
}
```

### 5. Generate RSA keys and seed

```bash
cd backend
npm run keys:generate   # copy both PEM values into backend/.env
npm run db:seed         # creates admin@votta.demo / VottaDemo2024!
```

### 6. Test the verification flow

```bash
# Login
POST /api/v1/auth/login  {"email":"admin@votta.demo","password":"VottaDemo2024!"}

# Upload a document
POST /api/v1/documents/students/:studentId  (multipart, file + documentType)

# Approve it
PATCH /api/v1/documents/:documentId/approve

# Verify publicly (no auth)
GET /api/v1/verify?token=<token>
# → { status: "verified", studentName: "...", ... }

# Simulate tampering (demo only)
PATCH /api/v1/admin/tamper/:documentId

# Re-verify
GET /api/v1/verify?token=<token>
# → { status: "tampered" }
```

## Edge Functions

`functions/healthcheck` — a minimal Deno function that returns `{ status: "ok" }`. Deploy with:

```bash
supabase functions deploy healthcheck
```
