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

- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Auth**: NextAuth.js v4
- **Animations**: GSAP 3
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Excel**: SheetJS (xlsx)
- **Notifications**: react-hot-toast
