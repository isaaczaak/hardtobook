import type { Restaurant } from "@/lib/types";

/**
 * Pure prompt builders for the "copy agent prompt" CTAs.
 *
 * These produce ready-to-paste prompts for a visitor's own AI agent
 * (Claude / ChatGPT). They always reference canonical https://www.hardtobook.xyz
 * URLs so the agent can fetch live JSON regardless of where it runs.
 */

const BASE = "https://www.hardtobook.xyz";

/** Header prompt — general-purpose, no date or spot preselected. */
export function buildGeneralPrompt(): string {
  return `You're my restaurant booking strategist for NYC's hardest tables, powered by hardtobook.xyz. Ask me what I'm after: a specific restaurant, a specific date, or dinner tonight. Then fetch the JSON you need: ${BASE}/api/v1/plan?date=YYYY-MM-DD for a target date (act on each \`action\`), ${BASE}/api/v1/drops for what's dropping soon, ${BASE}/api/v1/spots for full details and walk-in strategy. For every spot on my shortlist with a \`mark-calendar\` result, set a reminder in my own tools 5 minutes before its \`bookAtIso\`, titled "Book {name}" with the \`platformUrl\` (ask once if I want a different lead time or which app to use). Never try to book it yourself — booking bots get blocked; your job is timing. Skill, if you support installing one: ${BASE}/skill.md`;
}

/** Plan-tab prompt — strategy for a specific target date. */
export function buildPlanPrompt(dateIso: string): string {
  return `You're my restaurant booking strategist. Fetch ${BASE}/api/v1/plan?date=${dateIso} (JSON). I want dinner that night at one of these spots — ask me which, or pick the 2–3 best fits. For every spot on my shortlist with a \`mark-calendar\` result, set a reminder in my own tools 5 minutes before its \`bookAtIso\`, titled "Book {name}" with the \`platformUrl\` (ask once if I want a different lead time or which app to use). For \`bookable-now\`, give me the link right now. Never try to book it yourself — booking bots get blocked; your job is timing. Skill, if you support installing one: ${BASE}/skill.md`;
}

/** Per-restaurant prompt — get me into this specific spot. */
export function buildSpotPrompt(spot: Restaurant): string {
  return `Get me into ${spot.name} (NYC, ${spot.neighborhood}). Fetch ${BASE}/api/v1/spots (JSON) and find id "${spot.id}" for booking details, then fetch ${BASE}/api/v1/plan?date=YYYY-MM-DD once I tell you my target date. Set a reminder in my own reminders/calendar for 5 minutes before the drop (or tell me exactly when to set it), with the booking link. Never try to book it yourself — your job is timing. Skill: ${BASE}/skill.md`;
}
