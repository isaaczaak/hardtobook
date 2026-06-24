import type { Restaurant } from "@/lib/types";

/**
 * Pure prompt builders for the "copy agent prompt" CTAs.
 *
 * These produce ready-to-paste prompts for a visitor's own AI agent
 * (Claude / ChatGPT). They always reference canonical https://hardtobook.nyc
 * URLs so the agent can fetch live JSON regardless of where it runs.
 */

const BASE = "https://hardtobook.nyc";

/** Header prompt — general-purpose, no date or spot preselected. */
export function buildGeneralPrompt(): string {
  return `You're my restaurant booking strategist for NYC's hardest tables, powered by hardtobook.nyc. Ask me what I'm after: a specific restaurant, a specific date, or dinner tonight. Then fetch the JSON you need: ${BASE}/api/v1/plan?date=YYYY-MM-DD for a target date (act on each \`action\`), ${BASE}/api/v1/drops for what's dropping soon, ${BASE}/api/v1/spots for full details and walk-in strategy. For any \`mark-calendar\` result, set a reminder in my own tools — ask once how I like reminders (lead time + which app), then default to a heads-up the night before plus a final alarm 5 min before \`bookAtIso\`, titled "Book {name}" with the \`platformUrl\`. Never try to book it yourself — booking bots get blocked; your job is timing. Skill, if you support installing one: ${BASE}/skill.md`;
}

/** Plan-tab prompt — strategy for a specific target date. */
export function buildPlanPrompt(dateIso: string): string {
  return `You're my restaurant booking strategist. Fetch ${BASE}/api/v1/plan?date=${dateIso} (JSON). I want dinner that night at one of these spots — ask me which, or pick the 2–3 best fits. For any \`mark-calendar\` result, set a reminder in my own tools — ask once how I like reminders (lead time + which app), then default to a heads-up the night before plus a final alarm 5 min before \`bookAtIso\`, titled "Book {name}" with the \`platformUrl\`. For \`bookable-now\`, give me the link right now. Never try to book it yourself — booking bots get blocked; your job is timing. Skill, if you support installing one: ${BASE}/skill.md`;
}

/** Per-restaurant prompt — get me into this specific spot. */
export function buildSpotPrompt(spot: Restaurant): string {
  return `Get me into ${spot.name} (NYC, ${spot.neighborhood}). Fetch ${BASE}/api/v1/spots (JSON) and find id "${spot.id}" for booking details, then fetch ${BASE}/api/v1/plan?date=YYYY-MM-DD once I tell you my target date. Tell me exactly when to set my alarm — or set the reminder in my own reminders/calendar if you can — with the booking link. Never try to book it yourself — your job is timing. Skill: ${BASE}/skill.md`;
}
