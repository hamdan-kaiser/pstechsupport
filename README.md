# Team Employee Portal

A full-featured employee management portal built with Next.js 14, Prisma (CockroachDB), NextAuth, GSAP animations, and Tailwind CSS.

## Features

- **Authentication & Roles** — Email/password login, magic-key recovery, password reset; Admin / Employee / Viewer (read-only) roles
- **Dashboard** — Role-aware overview: pending requests, today's shift, team timetable snapshot
- **Holiday Management** — Request days off, admin approval, holiday balance tracking
- **Sick Calls** — Report sick days, admin approval
- **Sudden Leave** — Request to leave early today; on approval, updates the timetable for that day and applies a leaderboard penalty
- **Late Arrival** — Report (or admin-record) a late start; on approval, updates the timetable for that day and applies a leaderboard penalty
- **Additional Shift** — Pick up a shift on a scheduled day off; approval credits back a holiday day
- **Shift Swap** — Full 3-step flow (requester → target accepts → admin approves); timetable auto-updates for both employees
- **Change Shift** (admin) — Reassign an employee to a different shift on a specific day directly
- **Move Shift** (employee) — Move a scheduled shift to a different day, pending admin approval
- **Timetable** — Weekly schedule view with Excel upload/download; one-off overrides for approved requests that don't disrupt the recurring schedule, with carry-forward between weeks
- **Stats & Leaderboard** — Monthly case/call stats with ranked, penalty-adjusted scoring
- **Employee Management** (admin) — Add/edit/remove employees, roles, holiday balances, magic keys
- **Notifications** — In-app bell with inline approve/reject actions, plus email alerts to admins for leave-type requests
- **Getting Bored?** — A quiz mini-game with scoring
- **Mobile-responsive design**
- **Dark/light theme** with an animated sunrise/sunset transition
- **GSAP Animations** — Smooth transitions throughout

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
***Confidential***

## Excel Timetable Format

Upload `.xlsx` files with this column structure:

| Name          | Mon        | Tue        | Wed | Thu        | Fri        | Sat | Sun |
|---------------|------------|------------|-----|------------|------------|-----|-----|


Cell values: `Day Shift`, `Night Shift`, or `OFF`


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

- **Framework**: Next.js 14 (App Router), TypeScript
- **Database**: CockroachDB (Serverless), via Prisma ORM
- **Auth**: NextAuth.js v4 (credentials/JWT), bcryptjs for password hashing
- **Animations**: GSAP 3
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Excel import/export**: SheetJS (xlsx)
- **Email**: Nodemailer (SMTP)
- **Icons**: lucide-react
- **Toast notifications (UI)**: react-hot-toast
- **Architecture**: modular monolith — domain modules under `src/modules/` (auth, notifications, employees, leave-attendance, shift-management, timetable, leaderboard, iq-game, dashboard), each with its own public API
