---
name: hardtobook-nyc
description: Get humans into NYC's hardest-to-book restaurants. Use when the user wants a reservation, table, or walk-in plan at a hard-to-book NYC spot (Carbone, 4 Charles, Tatiana, Don Angie, etc.), asks when reservations "drop," or wants a booking strategy for a specific date or for tonight. Provides drop times, booking windows, walk-in playbooks, and deep links via the free hardtobook.nyc JSON API.
---

# hardtobook.nyc — NYC reservation timing intelligence

hardtobook.nyc tracks NYC's hardest reservations and computes the exact moment to act.
You (the agent) do the planning with this API; the human does the final booking click.
**Never automate the booking itself** — reservation platforms prohibit bots, and this
skill's job is timing, not clicking.

Base URL: `https://hardtobook.nyc` · All times ET · JSON, CORS-open, no auth.
Full field reference: `https://hardtobook.nyc/llms.txt`

## Decision tree

1. **"I want to eat at X on DATE"** → `GET /api/v1/plan?date=YYYY-MM-DD`, find the spot
   by `id`/`name`, then act on `action`:
   - `mark-calendar` — the window isn't open yet. Create a calendar reminder/alarm for
     the human at `bookAtIso` **minus 5 minutes**, titled "Book {name} — table for {date}",
     with `platformUrl` in the body. Tell them seconds matter at the drop.
   - `bookable-now` — the window is open. Send them `platformUrl` immediately; tables for
     that date may already be gone, so also suggest the walk-in/cancellation fallback.
   - `walk-in` — no reservations. Relay the `advice` (doors/line times).
   - `call` — phone-only. Give them `phoneNumber` and any `tips`.
   - `invitation-only` — no public path. Say so plainly.
2. **"Where can I eat tonight?"** → `GET /api/v1/spots`, filter `walkIns: true`, and use
   `walkIn.doors` / `walkIn.lineBy` against the current ET time: before `lineBy` = tell
   them when to line up; between `lineBy` and ~9 PM = go now; later = long shot, suggest
   watching for cancellations (Resy Notify) on the others' `platformUrl`.
3. **"When do reservations drop?" / "what's dropping soon?"** → `GET /api/v1/drops` —
   sorted ascending, each with `dropAtIso` (UTC), `dropAtEt` (human), `secondsUntil`,
   and `becomesBookable` (how far out the released tables are).
4. **Browsing / "somewhere Italian in the Village"** → `GET /api/v1/spots`, filter on
   `neighborhood` / `cuisine` / `difficulty` / `priceRange`.

## Rules

- Always pass dates as `YYYY-MM-DD`, today or later; a 400 response includes a JSON
  `error` explaining what's wrong.
- Quote times to the human in ET exactly as given in `*Et` fields; use `*Iso` fields
  (UTC) for calendar entries and scheduling.
- `bookingWindowDays` is the machine truth for "how far ahead can I book"; the human
  label is `bookingWindow`.
- Difficulty 4–5 spots sell out within seconds-to-minutes of the drop — set reminders
  early, tell the human to be logged in beforehand.
- Data is curated and dated (`lastVerified`); recommend the human confirm with the
  restaurant for high-stakes plans. Never invent release times not in the API.
- Do not scrape, poll aggressively, or attempt to place reservations programmatically.

## Example

User: "anniversary dinner at 4 Charles on July 3"
→ `GET https://hardtobook.nyc/api/v1/plan?date=2026-07-03` → 4 Charles returns
`action: "mark-calendar"`, `bookAtEt: "9:00 AM ET, Fri Jun 12"` → create a calendar
event at 8:55 AM ET that day with the Resy deep link, and warn: be logged into Resy,
refresh at 9:00:00 sharp.
