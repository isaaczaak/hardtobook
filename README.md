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
