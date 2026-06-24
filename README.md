# hard to book 🥀

Mission control for NYC's hardest reservations. Not a directory — an instrument.

## Modes

- **Drops** — live agenda of upcoming reservation releases, hero countdown to the next one, "dropping now" alerts.
- **Tonight** — time-aware walk-in playbook off the live NYC clock: when to line up, when to go now, when to snipe a cancellation instead.
- **Plan** — pick the date you want to eat; get the exact date and time to be online for every restaurant, with Google Calendar / .ics one-taps.
- **Spots** — the full directory: search, filters, difficulty, sort by soonest drop, watchlist.

Watchlist is stored locally (localStorage). Everything runs client-side — the site is fully static.

## Setup

```bash
npm install
npm run dev
```

## Tech

- Next.js 14 (app router), TypeScript
- Tailwind CSS
- Static JSON data (`data/restaurants.json`) — no backend
- All Eastern-time math in `lib/time.ts` via `Intl.DateTimeFormat`, no date libraries

## Agent API

Free, CORS-enabled JSON endpoints so AI agents can consume the data and computed
booking intelligence directly. All times are ET; responses use a `meta` envelope.
Full docs for agents: [`/llms.txt`](https://www.hardtobook.xyz/llms.txt).

### `GET /api/v1/spots`
Full records for all tracked restaurants (static, cacheable).

```bash
curl https://www.hardtobook.xyz/api/v1/spots
```

### `GET /api/v1/drops`
Next upcoming reservation drop per restaurant with a release schedule, sorted by
time. Each entry has `dropAtIso`, `dropAtEt`, `secondsUntil`, `becomesBookable`.
Computed per request.

```bash
curl https://www.hardtobook.xyz/api/v1/drops
```

### `GET /api/v1/plan?date=YYYY-MM-DD`
Given a target dining date, returns the exact action per restaurant
(`mark-calendar` | `bookable-now` | `walk-in` | `call` | `invitation-only`), with
`bookAtIso`/`bookAtEt` for calendar actions. `date` is required and must be today
or later (otherwise HTTP 400 with a JSON `error`). Computed per request.

```bash
curl "https://www.hardtobook.xyz/api/v1/plan?date=2026-07-15"
```

### Agent Skill

An installable [Agent Skill](https://www.hardtobook.xyz/skill.md) teaches agents the full
playbook (which endpoint when, reminder timing, no-auto-booking rules). Canonical copy:
`skills/hardtobook-nyc/SKILL.md` — drop the folder into your agent's skills directory.
