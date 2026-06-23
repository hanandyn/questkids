# 🏰 FunDo

> Gamified chore & task platform for kids ages 3–18  
> **v1.0.1** - Production Release

## Overview

FunDo turns everyday chores and tasks into an adventure game. Kids earn points, level up, build streaks, and redeem rewards — while parents configure tasks, set point values, and manage the reward shop.

## Features

### For Parents
- 👨‍👩‍👧‍👦 Family account with parent login
- 👶 Create child profiles with age tiers (1–5)
- 📋 Create task templates (one-shot, timed, checklist, bonus, team)
- ⭐ Configure points, timer durations, compliance settings
- 🎁 Set up reward shop items with star/gem costs
- 📊 View family leaderboard with ranking
- 🎯 Set family goals with progress tracking
- 📈 Weekly recaps & AI-powered insights
- 🔧 Smart task suggestions
- 🏫 School integration — create homework assignments
- 📅 iCal calendar feeds for task schedules
- 🔑 API key management for integrations
- 🌐 Template marketplace — share tasks with community
- 🏢 Organizations for schools, classrooms, scouts
- 📧 Email verification & photo verification
- 🔔 Notification system with preferences
- 💰 Allowance tracking for teens
- 📊 Analytics dashboard with PDF/CSV export
- 🎛️ Reward fulfillment queue
- 📝 Family message board
- 🌅 Daily rituals (morning/after-school/evening)
- 🔇 Sound settings with volume control
- 🕯️ Shabbat mode with auto-detect
- 🧭 Onboarding wizard for new families (v0.9)
- 🎨 Theme preferences (focus mode, colorblind, high contrast)

### For Kids (All Ages)
- ⚔️ Quest board showing daily tasks
- ⏱ Big animated countdown timer for timed tasks
- ⭐ Earn points with dynamic scoring (base + compliance + speed + streaks)
- 🔥 Streak tracking with freeze tokens
- 🛒 Reward shop to redeem earned stars & gems
- 🏆 Family leaderboard with enhanced ranking
- 🎨 Colorful, playful UI with animations

### Tier 1: Little Explorers (Ages 3-5)
- 🐾 Pet companion with mood & expressions
- 🎨 Sticker collection system
- 🔊 Audio-guided task prompts
- 🧸 Simplified touch-friendly UI with big buttons

### Tier 4: Teen Champions (Ages 13-15)
- 💰 Allowance tracker — link stars to real money
- 📊 Personal analytics & trends
- 🎯 Savings goal tracking
- 📈 Advanced view with charts

### Tier 5: Young Adults (Ages 16-18)
- 🎯 Minimalist, professional dashboard — not childish
- 📊 Habit tracker with weekly consistency grid
- 💰 Financial literacy — allowance, savings goals, exchange rates
- 🏆 Goal & milestone tracking — streaks, level progress
- 📅 Calendar sync (iCal feed) for task schedules
- 📈 Personal insights & weekly analytics

### Parent Tools
- 📸 Photo approval queue — review & approve/reject task photos
- 🔧 Smart task suggestions with AI-powered insights

### Social & Engagement
- 👏 Cheer system — siblings encourage each other
- 🎉 Confetti animations on achievements
- 🎰 Daily spin wheel for bonus rewards
- 🎁 Mystery chest every 10 completions
- 🏅 Achievement system (common/rare/epic/legendary)
- 💪 Power-up shop (double points, streak shield, time freeze)
- 👥 Team quests & family goals

### Seasonal Events
- 🎃 Halloween event with spooky multiplier
- 🕎 Hanukkah 8-day event
- 🎄 Christmas event
- 🐣 Easter event

### Multi-Language (i18n)
- 🇺🇸 English · 🇮🇱 Hebrew (RTL) · 🇪🇸 Spanish · 🇫🇷 French · 🇦🇪 Arabic (RTL) · 🇷🇺 Russian

### Security
- 🔐 JWT authentication with bcrypt
- 🛡️ Account lockout after 5 failed attempts
- 🔒 CSRF protection with origin validation
- 🔑 Rate limiting (200 req/min)
- 📧 Email verification
- 📸 Photo verification for task completion
- 🔒 Security headers (CSP, HSTS, XSS protection)
- 🔑 API key scopes for external integrations

### Production
- 🐳 Single-container Docker deploy with Coolify
- 🗄️ SQLite with async SQLAlchemy
- 📊 Health check with detailed metrics (DB latency, disk, uptime)
- 🚦 Rate limiting via slowapi
- 🔄 Request ID tracing
- 📦 Code splitting & lazy loading (v0.9)
- 📱 Native Android/iOS shells via Capacitor

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI + SQLAlchemy (async) |
| Frontend | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (bcrypt + python-jose) |
| i18n | i18next + react-i18next |
| Deploy | Docker + Coolify |

## Quick Start (Development)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # then edit .env
PYTHONPATH=. python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Native Mobile

```bash
cd frontend
npm run native:sync       # build web assets and sync Android/iOS shells
npm run native:android    # open Android Studio
npm run native:ios        # open Xcode on macOS
```

The native apps are Capacitor shells around the production React build in `frontend/dist`.

### Docker

```bash
docker compose up --build
```

### Coolify Deploy

```bash
./deploy.sh <coolify_app_uuid>
```

Uses the Coolify API to trigger a redeploy of the running app.

## Running Tests

```bash
# Backend tests (148 total)
cd backend
PYTHONPATH=. python -m pytest tests/ -v --asyncio-mode=auto

# Frontend checks
cd frontend
npx tsc --noEmit            # TypeScript check
npx eslint src/ --max-warnings 0  # Lint
npm run build               # Production build
npm run test:e2e            # Responsive/browser smoke tests
```

## Project Structure

```
fundo/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI route handlers (21 modules)
│   │   │   ├── auth.py       # Auth endpoints + lockout
│   │   │   ├── tasks.py      # Task CRUD + completion + verification
│   │   │   ├── rewards.py    # Reward shop + fulfillment
│   │   │   ├── leaderboard.py
│   │   │   ├── achievements.py
│   │   │   ├── family_goals.py
│   │   │   ├── cheers.py     # Sibling encouragement
│   │   │   ├── powerups.py
│   │   │   ├── avatars.py    # Avatar shop
│   │   │   ├── tier1.py      # Little Explorer (ages 3-5)
│   │   │   ├── allowance.py  # Teen allowance
│   │   │   ├── suggestions.py # Smart task suggestions
│   │   │   ├── rituals.py    # Daily rituals
│   │   │   ├── sound.py      # Sound settings
│   │   │   ├── family_messages.py
│   │   │   ├── onboarding.py # Phase 9: New family wizard
│   │   │   ├── analytics.py  # Child trends + export
│   │   │   ├── events.py     # Seasonal events
│   │   │   ├── school.py     # Homework assignments
│   │   │   ├── calendar.py   # iCal feeds
│   │   │   ├── notifications.py
│   │   │   ├── admin_metrics.py
│   │   │   └── ...
│   │   ├── core/             # Config, DB, security, auth middleware
│   │   ├── models/           # SQLAlchemy models (15+ models)
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic
│   │       ├── scoring.py    # Point calculation engine
│   │       ├── streaks.py    # Streak management
│   │       └── ...
│   └── tests/                # 148 tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # Login, Email verification
│   │   │   ├── parent/       # Parent dashboard + sub-pages
│   │   │   ├── kid/          # Kid quest board, dashboards
│   │   │   ├── shared/       # Shared components
│   │   │   ├── settings/     # Settings panels
│   │   │   ├── timer/        # Countdown timer
│   │   │   └── onboarding/   # Phase 9: Onboarding wizard
│   │   ├── lazy/             # Phase 9: Lazy-load wrappers
│   │   ├── contexts/         # Auth context
│   │   ├── lib/              # API client, types, i18n, sounds
│   │   └── locales/          # 6 language translations
│   └── public/
├── scripts/                  # Deployment scripts
├── docker-compose.yml
├── Dockerfile
├── deploy.sh
└── PLAN.md                   # Full system design
```

## API Endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register-parent` | Register parent + family |
| POST | `/api/v1/auth/login` | Login (parent or child) |
| POST | `/api/v1/auth/create-child` | Parent creates child |
| GET | `/api/v1/auth/me` | Get current user |
| GET | `/api/v1/auth/children` | List family children |
| POST | `/api/v1/auth/verify-email/{token}` | Verify email |
| GET | `/api/v1/tasks/templates` | List task templates (search/filter/sort) |
| POST | `/api/v1/tasks/templates` | Create task template |
| GET | `/api/v1/tasks/instances` | List task instances |
| POST | `/api/v1/tasks/instances/{id}/complete` | Complete task |
| POST | `/api/v1/tasks/instances/{id}/approve` | Parent approves |
| GET | `/api/v1/rewards` | List rewards (search/filter/sort) |
| POST | `/api/v1/rewards` | Create reward |
| POST | `/api/v1/rewards/{id}/redeem` | Kid redeems reward |
| GET | `/api/v1/leaderboard/enhanced` | Enhanced leaderboard |
| GET | `/api/v1/recap/weekly` | Weekly family recap |
| GET | `/api/v1/insights/tips` | AI-powered tips |
| GET | `/api/v1/powerups` | List power-ups |
| GET | `/api/v1/avatar/shop` | Avatar shop |
| GET | `/api/v1/tier1/tasks` | Tier 1 tasks (ages 3-5) |
| GET | `/api/v1/allowance/status` | Allowance status |
| GET | `/api/v1/onboarding/templates` | Phase 9: Starter templates |
| POST | `/api/v1/onboarding/complete` | Phase 9: Complete onboarding |
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/health/detailed` | Detailed health metrics |

See [api.ts](frontend/src/lib/api.ts) for the full client API surface.

## Scoring Formula

```
Total = (Base + Compliance Bonus - Penalty + Speed Bonus - Overstay)
      × Streak Multiplier (1.0–3.0)
      × Random Bonus (1% jackpot chance)
      × Handicap Multiplier

Compliance: +10 on 1st ask, -5 per extra ask
Speed: +2/min early, -5/min overstay
Streak: 1.0→1.2 at 3d, 1.5 at 7d, 2.5 at 30d, 3.0 at 60d
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Coolify                     │
│  ┌───────────────────────────────────────┐   │
│  │           Docker Container             │   │
│  │  ┌──────────┐    ┌──────────────────┐ │   │
│  │  │  Nginx   │───▶│  Frontend SPA    │ │   │
│  │  │  :80     │    │  (React + Vite)  │ │   │
│  │  │          │    └──────────────────┘ │   │
│  │  │          │    ┌──────────────────┐ │   │
│  │  │  /api/*  │───▶│  Backend FastAPI │ │   │
│  │  │          │    │  (Python :8000)  │ │   │
│  │  │          │    │  ┌────────────┐  │ │   │
│  │  │          │    │  │  SQLite DB │  │ │   │
│  │  │          │    │  └────────────┘  │ │   │
│  │  └──────────┘    └──────────────────┘ │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Phase History

| Phase | Version | Theme |
|-------|---------|-------|
| 1 | v0.1.0 | MVP — Auth, tasks, rewards, leaderboard |
| 2 | v0.2.0 | Timer, streaks, Tier 1+4 UI, achievements |
| 3 | v0.3.0 | Social — cheers, family goals, team quests |
| 4 | v0.4.0 | Polish — power-ups, Shabbat, scheduling, themes |
| 5 | v0.5.0 | Community — orgs, marketplace, API keys, i18n |
| 6 | v0.6.0 | Production — notifications, verification, rate limits, health |
| 7 | v0.7.0 | Adaptive UI — Tier 1 pets, avatar shop, allowance |
| 8 | v0.8.0 | Engagement — sounds, rituals, messages, suggestions, analytics |
| 9 | v0.9.0 | Polish & Quality — performance, onboarding, search, testing |
| 10 | v1.0.0 | Production — Tier 5 Young Adult dashboard, photo approval queue, clear TTS voice prompts, v1.0 release |

## License

Copyright © 2025–2026. All rights reserved.
