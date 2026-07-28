# Team Employee Portal

A full-featured employee management portal built with Next.js 14, Prisma (SQLite), NextAuth, GSAP animations, and Tailwind CSS.

## Features

- 🔐 **Authentication** — Email/password login for employees and admins
- 📅 **Holiday Management** — Request days off, admin approval with notifications
- 📊 **Stats & Leaderboard** — Monthly case/call stats with ranked leaderboard
- 🗓️ **Timetable** — Weekly schedule view; admin uploads via Excel file
- 🔄 **Shift Swap** — Full 3-step swap flow (requester → target accept → admin approve)
- 🔔 **Notifications** — Real-time bell icon for all actions
- 👥 **Employee Management** — Admin can add/edit/remove employees
- ✨ **GSAP Animations** — Smooth transitions throughout

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up database
npx prisma generate
npx prisma db push

# 3. Seed with sample employees
node prisma/seed.js

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Logins

| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@company.com        | password123   |
| Employee | imran@company.com        | password123   |
| Employee | nasrumul@company.com     | password123   |
| Employee | sarah@company.com        | password123   |
| Employee | mohammed@company.com     | password123   |
| Employee | priya@company.com        | password123   |
| Employee | james@company.com        | password123   |

## Excel Timetable Format

Upload `.xlsx` files with this column structure:

| Name          | Mon        | Tue        | Wed | Thu        | Fri        | Sat | Sun |
|---------------|------------|------------|-----|------------|------------|-----|-----|
| Imran Ahmed   | Day Shift  | Day Shift  | OFF | Day Shift  | Day Shift  | OFF | OFF |
| Nasrumul Islam| Night Shift| Night Shift| OFF | Night Shift| Night Shift| OFF | OFF |

Cell values: `Day Shift`, `Night Shift`, or `OFF`

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables:
   - `DATABASE_URL` — Use a hosted DB like [Turso](https://turso.tech) (SQLite-compatible) or switch to PostgreSQL
   - `NEXTAUTH_SECRET` — Any random string (run `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — Your Vercel deployment URL

### Switching to PostgreSQL for Vercel

In `prisma/schema.prisma`, change:
```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```
Then use a free [Neon](https://neon.tech) or [Supabase](https://supabase.com) PostgreSQL database.

## Shift Swap Flow

```
Imran logs in → Add Swap → picks date + shifts + selects Nasrumul
  ↓
System checks: Is Nasrumul already swapping that day? → If yes: "User already has a pending swap"
  ↓
If clear → "Request Sent!" → Nasrumul gets notification
  ↓
Nasrumul logs in → sees request with full details → Accept / Decline
  ↓
If accepted → Admin gets notification → Admin Approve / Reject
  ↓
If admin approves → Timetable auto-updated for both employees
  ↓
Both get notified ✅
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Auth**: NextAuth.js v4
- **Animations**: GSAP 3
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Excel**: SheetJS (xlsx)
- **Notifications**: react-hot-toast
