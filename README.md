# Author
Kay Habz

# TrustWork

A full-stack escrow payment platform for freelance work. Clients post jobs and lock funds in escrow before freelancers can apply — guaranteeing payment is secured before work begins. Built across two Agile sprints using a domain-driven design approach.

---

## Overview

TrustWork solves a core problem in freelance marketplaces: trust. Clients worry about paying for work that never arrives. Freelancers worry about completing work and never getting paid. TrustWork removes both risks by holding funds in escrow — locked at job creation, released only on client approval.

**Key flows:**
- Client posts a job and funds escrow from their wallet
- Freelancers browse only funded jobs (escrow secured before applications open)
- Client accepts a freelancer and work begins
- On completion, the client approves and escrow is released to the freelancer
- Disputes are escalated to an admin who resolves them and directs funds

---

## Tech Stack

| Layer              | Technology                                        |
|--------------------|---------------------------------------------------|
| Frontend           | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend            | Node.js, Express, TypeScript                      |
| Database           | PostgreSQL (raw SQL via `pg` pool)                |
| Auth               | JWT + bcrypt                                      |
| Dev Environment    | GitHub Codespaces                                 |
| Database Hosting   | Supabase (IPv4)                                   |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│         Next.js App Router (port 3000)       │
│                                              │
│  /                  Landing page             │
│  /register          Register                 │
│  /login             Login                    │
│  /client/dashboard  Client dashboard         │
│  /freelancer/…      Freelancer dashboard     │
│  /admin/login       Admin login              │
│  /admin/dashboard   Admin portal             │
└────────────────────┬────────────────────────┘
                     │ HTTP (Axios)
┌────────────────────▼────────────────────────┐
│                  Backend                     │
│           Express REST API (port 5000)       │
│                                              │
│  /api/auth          Register, login          │
│  /api/wallet        Balance, deposit, txns   │
│  /api/jobs          CRUD, lifecycle          │
│  /api/escrow        Fund escrow              │
│  /api/admin         Admin portal             │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│              PostgreSQL (Supabase)           │
│  users · wallets · jobs · job_applications  │
│  escrows · transactions                     │
└─────────────────────────────────────────────┘
```

---

## Job Lifecycle

```
Client creates job    →  status: open
Client funds escrow   →  status: funded      ← freelancers can apply
Client accepts bid    →  status: assigned
Freelancer submits    →  status: submitted
Client approves       →  status: released
        OR
Either party          →  status: disputed    → admin resolves
```

Escrow is funded **before** freelancers can browse the job. This is a deliberate design decision — freelancers only see work where payment is already locked in.

---

## Database Schema

```sql
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('client', 'freelancer')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
)

wallets (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  balance    DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0)
)

jobs (
  id            SERIAL PRIMARY KEY,
  client_id     UUID REFERENCES users(id),
  freelancer_id UUID REFERENCES users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  budget        DECIMAL(10,2) NOT NULL,
  status        VARCHAR DEFAULT 'open',
  created_at    TIMESTAMPTZ DEFAULT NOW()
)

job_applications (
  id            SERIAL PRIMARY KEY,
  job_id        INT REFERENCES jobs(id),
  freelancer_id UUID REFERENCES users(id),
  proposal      TEXT NOT NULL,
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW()
)

escrows (
  id            SERIAL PRIMARY KEY,
  job_id        INT REFERENCES jobs(id),
  client_id     UUID REFERENCES users(id),
  freelancer_id UUID REFERENCES users(id),
  amount        DECIMAL(10,2) NOT NULL,
  status        TEXT DEFAULT 'funded',
  created_at    TIMESTAMPTZ DEFAULT NOW()
)

transactions (
  id         SERIAL PRIMARY KEY,
  wallet_id  INT REFERENCES wallets(id),
  type       TEXT NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

Transaction types: `deposit`, `escrow_funding`, `escrow_release`, `platform_fee`, `refund`

---

## Platform Fee

A configurable platform fee (default 10%) is deducted from the freelancer's payout on escrow release. The fee is set via environment variable and logged as a separate `platform_fee` transaction.

```
Job budget:       $500.00
Platform fee:      $50.00  (10%)
Freelancer payout: $450.00
```

The fee also applies when an admin resolves a dispute in favour of the freelancer. Full refunds to clients carry no fee.

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register (client or freelancer) |
| POST | `/api/auth/login` | Public | Login → `{ token, role }` |

### Wallet
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet/balance` | 🔒 User | Get balance |
| POST | `/api/wallet/deposit` | 🔒 User | Top up wallet |
| GET | `/api/wallet/transactions` | 🔒 User | Transaction history |

### Jobs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/jobs` | 🔒 Client | Create job |
| GET | `/api/jobs` | Public | List funded jobs |
| GET | `/api/jobs/my-jobs` | 🔒 Client | Client's jobs |
| GET | `/api/jobs/my-work` | 🔒 Freelancer | Assigned jobs |
| GET | `/api/jobs/:id/applications` | 🔒 Client | Job applications |
| POST | `/api/jobs/apply` | 🔒 Freelancer | Apply to job |
| POST | `/api/jobs/accept` | 🔒 Client | Accept application |
| POST | `/api/jobs/complete` | 🔒 Freelancer | Submit work |
| POST | `/api/jobs/approve` | 🔒 Client | Approve & release escrow |
| POST | `/api/jobs/dispute` | 🔒 Either | Raise dispute |

### Escrow
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/escrow/fund` | 🔒 Client | Fund escrow for a job |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | Public | Admin login |
| GET | `/api/admin/stats` | 🔒 Admin | Platform stats |
| GET | `/api/admin/jobs` | 🔒 Admin | All jobs |
| GET | `/api/admin/disputes` | 🔒 Admin | Active disputes |
| POST | `/api/admin/resolve` | 🔒 Admin | Resolve dispute |
| GET | `/api/admin/transactions` | 🔒 Admin | All transactions |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or Supabase)

### 1. Clone the repo

```bash
git clone https://github.com/KayHabz/freelance-escrow.git
cd freelance-escrow
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `.env`:

```env
PORT=5000
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
PLATFORM_FEE_PERCENT=10
ADMIN_EMAIL=admin@trustwork.com
ADMIN_PASSWORD=your_admin_password
```

Run database migrations (create tables from schema above), then:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

### 4. GitHub Codespaces

Both ports (3000 and 5000) must be set to **Public** in the Ports tab. The frontend auto-detects Codespaces preview URLs and rewrites the API base URL accordingly.

---

## Security Highlights

- **Role whitelist** — only `client` and `freelancer` are accepted at registration; role escalation is blocked
- **Ownership checks** — every job and escrow action verifies the calling user owns the resource
- **Atomic transactions** — all fund movements use PostgreSQL transactions with `BEGIN / COMMIT / ROLLBACK`
- **DB constraint** — `balance >= 0` enforced at the database level as a safety net
- **JWT expiry** — user tokens expire after 1 day, admin tokens after 8 hours
- **Interceptor safety** — Axios request interceptor skips attaching user token if `Authorization` is already set (prevents admin token being overwritten)
- **Deposit limits** — deposits capped at $1,000,000 per transaction; amount validated as a positive number

---

## Project Structure

```
freelance-escrow/
├── backend/
│   └── src/
│       ├── controllers/
│       │   ├── authController.ts
│       │   ├── walletController.ts
│       │   ├── jobController.ts
│       │   ├── escrowController.ts
│       │   └── adminController.ts
│       ├── middlewares/
│       │   └── authMiddleware.ts
│       ├── routes/
│       │   ├── authRoutes.ts
│       │   ├── walletRoutes.ts
│       │   ├── jobRoutes.ts
│       │   ├── escrowRoutes.ts
│       │   └── adminRoutes.ts
│       ├── db.ts
│       └── index.ts
└── frontend/
    ├── app/
    │   ├── page.tsx                   # Landing page
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── client/dashboard/page.tsx
    │   ├── freelancer/dashboard/page.tsx
    │   ├── admin/login/page.tsx
    │   └── admin/dashboard/page.tsx
    ├── components/
    │   └── Navbar.tsx
    └── services/
        └── api.ts
```

---

## Sprints

**Sprint 1 — Core platform** (14 days)
Built the complete backend (auth, wallets, jobs, escrow, disputes, admin) and functional frontend dashboards for all three roles.

**Sprint 2 — Frontend & production readiness** (9 days)
Added platform fee logic, redesigned all dashboards with a consistent card-based UI, built the TrustWork landing page and improved auth pages, extracted a shared Navbar component, and resolved an Axios interceptor bug affecting admin authentication.
