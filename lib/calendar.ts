import type { Restaurant } from "./types";
import { getEtParts, NY_TZ } from "./time";

// ---------------------------------------------------------------------------
// Calendar builders for the PLAN view. Two outputs:
//  - a Google Calendar render URL
//  - a downloadable .ics blob (VCALENDAR/VEVENT with a 10-minute VALARM)
// Both anchor to the absolute `bookAtMs` instant and label by the target date.
// ---------------------------------------------------------------------------

/** YYYYMMDDTHHMMSSZ in UTC for an absolute instant. */
function toUtcStamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Jun 16" style label for a target NY calendar date. */
function targetDayLabel(target: { month: number; day: number }): string {
  return `${MONTHS_SHORT[target.month - 1]} ${target.day}`;
}

interface CalendarInput {
  restaurant: Restaurant;
  bookAtMs: number;
  target: { year: number; month: number; day: number };
}

function buildTitleAndDetails({ restaurant, target }: CalendarInput) {
  const title = `Book ${restaurant.name} — table for ${targetDayLabel(target)}`;
  const lines: string[] = [];
  lines.push(`Release: ${restaurant.releaseTime} on ${restaurant.platform}.`);
  if (restaurant.platformUrl) lines.push(restaurant.platformUrl);
  if (restaurant.tips[0]) lines.push("", `Tip: ${restaurant.tips[0]}`);
  return { title, details: lines.join("\n") };
}

/** Google Calendar render URL. 15-minute event window, anchored in ET. */
export function buildGoogleCalendarUrl(input: CalendarInput): string {
  const { bookAtMs } = input;
  const { title, details } = buildTitleAndDetails(input);

  const start = toUtcStamp(bookAtMs);
  const end = toUtcStamp(bookAtMs + 15 * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details,
    ctz: NY_TZ,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escape per RFC 5545 text rules. */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Build a VCALENDAR string with a single timed VEVENT + 10-minute VALARM. */
export function buildIcs(input: CalendarInput): string {
  const { bookAtMs, restaurant } = input;
  const { title, details } = buildTitleAndDetails(input);

  const dtStart = toUtcStamp(bookAtMs);
  const dtEnd = toUtcStamp(bookAtMs + 15 * 60 * 1000);
  const dtStamp = toUtcStamp(Date.now());
  const uid = `htb-${restaurant.id}-${bookAtMs}@hardtobook.nyc`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//hard to book//PLAN//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(details)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`10 minutes until ${restaurant.name} opens`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n");
}

/** Trigger a client-side download of an .ics file. No-op during SSR. */
export function downloadIcs(input: CalendarInput): void {
  if (typeof window === "undefined") return;
  const ics = buildIcs(input);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const p = getEtParts(input.bookAtMs);
  a.href = url;
  a.download = `book-${input.restaurant.id}-${p.year}${String(p.month).padStart(2, "0")}${String(p.day).padStart(2, "0")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the click has a chance to consume the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
