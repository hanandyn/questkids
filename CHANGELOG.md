# Changelog

All notable changes to FunDo will be documented in this file.

## [Unreleased]

### Added
- IndexedDB-backed offline queue for JSON state changes, with reconnect sync and a pending-sync status indicator.
- Browser push subscription support, service-worker push handling, and VAPID configuration placeholders.
- Capacitor native Android/iOS project shells and mobile build scripts.
- Responsive viewport regression coverage for phone, tablet, desktop, and wide layouts.

### Changed
- Backend health/version metadata now uses the app release version and includes both FunDo and legacy QuestKids production origins.
- Global layout styles now include safe-area support, media overflow guards, and small-screen sizing safeguards.

## [v1.0.1] - 2026-06-23 - Audio Stabilization

### Fixed
- English voice prompts now use browser SpeechSynthesis so they speak with a proper English voice.
- Hebrew voice prompts continue to use the existing prerecorded phonikud-tts clips.

## [v0.9.0] — 2026-06-19 — Polish & Quality

### 🚀 Performance
- Code splitting with React.lazy + Suspense for all major routes
- Manual chunk splitting: vendor-react, vendor-animation, vendor-charts, vendor-i18n
- CSS code splitting enabled
- Chunk size warning at 500KB

### 🎨 UI Polish
- Skeleton component for loading states (cards, lists, text)
- EmptyState component with emoji illustrations for empty views
- ErrorBoundary with friendly error display and retry button
- PageTransition component with Framer Motion fade-in
- Enhanced Toast system with stacking (flex-col-reverse)
- Micro-interactions: button press, hover lift, focus rings, card hover
- Skip-to-content link for accessibility

### 🧭 Onboarding Wizard
- Multi-step guided setup for new families (5 steps)
- Step 1: Welcome + family name
- Step 2: Add children with age-tier auto-detection
- Step 3: Quick-start task templates (age-appropriate)
- Step 4: Set up first reward
- Step 5: Done — auto-create children, tasks, rewards
- Backend: POST /api/v1/onboarding/complete, GET /api/v1/onboarding/status
- Backend: GET /api/v1/onboarding/templates?age_tiers=1,2,...

### 🔍 Advanced Search & Filtering
- SearchBar component with debounce and clear button
- FilterPanel component: collapsible, select/toggle/range filters
- Enhanced task templates endpoint: search, category, task_type, age_tier, sort
- Enhanced rewards endpoint: search, category, sort
- Sort by name, points, created_at with asc/desc order

### ♿ Accessibility
- aria-labels on all interactive elements
- aria-expanded on collapsible panels
- aria-pressed on toggle buttons
- aria-live regions on Toast and dynamic content
- Skip-to-content link on all pages
- Focus management: visible focus rings, keyboard navigation
- prefers-reduced-motion media query support

### 🧪 Testing
- 18 new backend tests (148 total)
- Tests for: Tier 1, Avatar Shop, Allowance, Suggestions, Security, Onboarding
- Account lockout timezone bug fix
- Enhanced search/filter/sort tests

### 📚 Documentation
- Complete README rewrite with feature list, API docs, architecture diagram
- Added CHANGELOG.md
- Architecture diagram (ASCII art)

## [v0.8.0] — 2026-06-18 — Engagement & Intelligence

### Added
- Sound settings system (master, music, SFX volume)
- Daily rituals (morning, after-school, evening, weekend)
- Family message board with pinned messages
- Smart task suggestions (timer, difficulty, schedule, new task, pricing)
- Child trends analytics with charts
- Analytics export (PDF per child, CSV per family)
- Reward fulfillment queue
- @tanstack/react-query for data fetching

## [v0.7.0] — 2026-06-17 — Adaptive UI & Enhanced Gamification

### Added
- Tier 1 (Ages 3-5): Little Explorer Dashboard
- Pet companion system with mood/expressions
- Sticker collection
- Avatar shop (buy, equip, unequip items)
- Allowance system for teens (link stars to money)
- Tier 4 (Ages 13-15): Teen Dashboard
- Notification preferences
- Enhanced leaderboard with ranking changes
- Weekly recap endpoint for kids

## [v0.6.0] — 2026-06-16 — Production Readiness

### Added
- Email verification flow
- Photo verification for tasks
- Notification system (streak_risk, milestone, leaderboard, achievement)
- Rate limiting (200 req/min)
- Health check with detailed metrics (DB latency, disk, uptime)
- Admin metrics panel
- Request ID middleware for tracing
- Security headers (CSP, HSTS, XSS, Referrer-Policy)
- CSRF protection on auth endpoints
- Account lockout after 5 failed attempts
- Password strength validation

## [v0.5.0] — 2026-06-15 — Community & Scale

### Added
- Organizations (school, classroom, youth_group, scouts)
- Organization join codes
- Template marketplace with sharing
- Template forking and rating
- API key management for integrations
- API key scopes
- External API endpoints
- School integration (homework assignments)
- iCal calendar feeds
- Seasonal events system (Halloween, Hanukkah, Christmas, Easter)
- Multi-language support: English, Hebrew (RTL), Spanish, French, Arabic, Russian

## [v0.4.0] — 2026-06-14 — Polish & Expand

### Added
- Power-up shop (double points, streak shield, time freeze, mystery boost, skip pass)
- Shabbat mode with auto-detect
- Theme preferences (focus mode, colorblind themes, high contrast)
- Enhanced scheduling with calendar integration
- Schedule preview
- Shabbat banner on all views

## [v0.3.0] — 2026-06-13 — Social & Competition

### Added
- Family goals with progress tracking
- Cheer system — siblings encourage each other
- Enhanced leaderboard with handicap multipliers
- Weekly family recap with highlights
- AI-powered tips engine
- Insights analytics dashboard
- Team quests

## [v0.2.0] — 2026-06-12 — Timer, Streaks & Achievements

### Added
- Big animated countdown timer
- Pomodoro-style timer with cycles
- Streak tracking with freeze tokens
- Dynamic scoring engine (base + compliance + speed + streaks)
- Achievement system (common, rare, epic, legendary)
- Daily spin wheel
- Mystery chests
- Confetti celebrations
- Avatar customization

## [v0.1.0] — 2026-06-11 — MVP

### Added
- Parent registration and login (JWT auth)
- Family account with child profiles
- Age tiers (1-5)
- Task template creation (one-shot, timed, checklist, bonus)
- Task instances with completion flow
- Reward shop with star/gem costs
- Family leaderboard
- Playful kid-friendly UI with Tailwind CSS
- Framer Motion animations
- Async SQLAlchemy with SQLite
- Docker support with Nginx + Supervisor
