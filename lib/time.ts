import type { Restaurant } from "./types";

// ---------------------------------------------------------------------------
// All date math lives here. Everything is computed in America/New_York via
// Intl.DateTimeFormat — no date libraries, no reliance on the host timezone.
// Functions are pure: they take an absolute `now` (ms epoch) where time-of-day
// matters, so they are deterministic and unit-testable.
// ---------------------------------------------------------------------------

export const NY_TZ = "America/New_York";

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

// Cached formatter — building these is comparatively expensive.
const etPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  weekday: "long",
});

export interface EtParts {
  year: number;
  month: number; // 1-12
  day: number; // day of month
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: string; // lowercase, e.g. "monday"
  weekdayIndex: number; // 0 = sunday
}

/** Decompose an absolute instant into its wall-clock parts in NY time. */
export function getEtParts(at: number | Date = Date.now()): EtParts {
  const parts = etPartsFormatter.formatToParts(
    typeof at === "number" ? new Date(at) : at
  );
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  // Intl can render hour "24" at midnight under hour12:false — normalize.
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0;

  const weekday = get("weekday").toLowerCase();

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour,
    minute: parseInt(get("minute"), 10),
    second: parseInt(get("second"), 10),
    weekday,
    weekdayIndex: DAYS.indexOf(weekday),
  };
}

export interface ParsedTime {
  hours: number; // 0-23
  minutes: number;
}

/** Parse "10:00 AM ET", "12:00 PM (Noon) ET", "9:00 AM ET" → {hours,minutes}. */
export function parseReleaseTime(releaseTime: string): ParsedTime | null {
  if (!releaseTime || releaseTime.toLowerCase() === "none") return null;

  const match = releaseTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  else if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

/** Parse a clock label like "5:00 PM" or "4:15 PM" into minutes-since-midnight. */
export function parseClockMinutes(label: string | undefined): number | null {
  if (!label) return null;
  const parsed = parseReleaseTime(label);
  if (!parsed) return null;
  return parsed.hours * 60 + parsed.minutes;
}

/**
 * Milliseconds from `now` until the next release for a daily/weekly/monthly
 * schedule. Returns null when there is no computable schedule.
 *
 * Ported from v1's getNextReleaseMs but parameterised on `now` for purity.
 */
export function getNextReleaseMs(
  release: ParsedTime,
  releaseSchedule: Restaurant["releaseSchedule"],
  releaseDay: string | undefined,
  now: number = Date.now()
): number | null {
  const p = getEtParts(now);
  const currentMinutes = p.hour * 60 + p.minute;
  const releaseMinutes = release.hours * 60 + release.minutes;
  const secondsRemainder = p.second * MS_PER_SECOND;

  if (releaseSchedule === "daily") {
    let minutesUntil = releaseMinutes - currentMinutes;
    if (minutesUntil <= 0) minutesUntil += 24 * 60;
    return minutesUntil * MS_PER_MINUTE - secondsRemainder;
  }

  if (releaseSchedule === "weekly" && releaseDay) {
    const targetDayIndex = DAYS.indexOf(releaseDay.toLowerCase());
    if (targetDayIndex === -1) return null;
    let daysUntil = targetDayIndex - p.weekdayIndex;
    if (daysUntil < 0 || (daysUntil === 0 && releaseMinutes <= currentMinutes)) {
      daysUntil += 7;
    }
    const minutesUntil = daysUntil * 24 * 60 + (releaseMinutes - currentMinutes);
    return minutesUntil * MS_PER_MINUTE - secondsRemainder;
  }

  if (releaseSchedule === "monthly" && releaseDay) {
    const dayMatch = releaseDay.match(/(\d+)/);
    if (!dayMatch) return null;
    let daysUntil = parseInt(dayMatch[1], 10) - p.day;
    if (daysUntil < 0 || (daysUntil === 0 && releaseMinutes <= currentMinutes)) {
      daysUntil += 30;
    }
    const minutesUntil = daysUntil * 24 * 60 + (releaseMinutes - currentMinutes);
    return minutesUntil * MS_PER_MINUTE - secondsRemainder;
  }

  // calendar-month (e.g. EMP/Per Se): the whole next month opens on the 1st.
  // The drop instant is the next 1st-of-month at the release time.
  if (releaseSchedule === "calendar-month") {
    return msUntilNextMonthlyOccurrence([1], release, now);
  }

  // twice-monthly (e.g. Ramen by Ra): drops on the 1st and the 15th.
  if (releaseSchedule === "twice-monthly") {
    return msUntilNextMonthlyOccurrence([1, 15], release, now);
  }

  return null;
}

/**
 * Ms from `now` until the next occurrence of any `daysOfMonth` (e.g. [1] or
 * [1,15]) at the release time-of-day, computed on the real NY calendar so it
 * respects variable month lengths and DST. Looks ahead through next month,
 * which is sufficient since the smallest cadence here is twice a month.
 */
function msUntilNextMonthlyOccurrence(
  daysOfMonth: number[],
  release: ParsedTime,
  now: number
): number | null {
  const p = getEtParts(now);
  const months = [
    { y: p.year, m: p.month },
    { y: p.month === 12 ? p.year + 1 : p.year, m: p.month === 12 ? 1 : p.month + 1 },
  ];
  let best = Infinity;
  for (const { y, m } of months) {
    for (const d of daysOfMonth) {
      const t = etDateTimeToMs(y, m, d, release.hours, release.minutes);
      if (t > now && t < best) best = t;
    }
  }
  return best === Infinity ? null : best - now;
}

/** Format a positive ms duration into a compact countdown string. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** A coarser "how far away" label for the PLAN view, e.g. "in 12 days". */
export function formatRelativeDays(ms: number): string {
  if (ms <= 0) return "now";
  const days = Math.round(ms / MS_PER_DAY);
  if (days <= 0) {
    const hours = Math.max(1, Math.round(ms / (60 * MS_PER_MINUTE)));
    return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Live ET clock string HH:MM:SS for a given instant. */
export function formatEtClock(now: number = Date.now()): string {
  const p = getEtParts(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * "today" / "tomorrow" / "Mon Jun 16" for a drop instant relative to `now`,
 * both interpreted in NY wall-clock terms.
 */
export function formatDropDay(dropAt: number, now: number = Date.now()): string {
  const today = getEtParts(now);
  const drop = getEtParts(dropAt);

  if (
    drop.year === today.year &&
    drop.month === today.month &&
    drop.day === today.day
  ) {
    return "today";
  }

  // tomorrow check: build tomorrow's parts by adding ~1 day and comparing.
  const tomorrow = getEtParts(now + MS_PER_DAY);
  if (
    drop.year === tomorrow.year &&
    drop.month === tomorrow.month &&
    drop.day === tomorrow.day
  ) {
    return "tomorrow";
  }

  return `${WEEKDAYS_SHORT[drop.weekdayIndex]} ${MONTHS_SHORT[drop.month - 1]} ${drop.day}`;
}

/**
 * Absolute NY day label "Mon Jun 16" for an instant — unlike formatDropDay this
 * never collapses to "today"/"tomorrow", so it is stable for API payloads that
 * agents may cache or display out of context.
 */
export function formatEtDayAbsolute(at: number): string {
  const p = getEtParts(at);
  return `${WEEKDAYS_SHORT[p.weekdayIndex]} ${MONTHS_SHORT[p.month - 1]} ${p.day}`;
}

/** "10:00 AM" clock label from a ParsedTime. */
export function formatClockLabel(t: ParsedTime): string {
  const period = t.hours >= 12 ? "PM" : "AM";
  let h = t.hours % 12;
  if (h === 0) h = 12;
  return `${h}:${String(t.minutes).padStart(2, "0")} ${period}`;
}

// ---------------------------------------------------------------------------
// PLAN view math
// ---------------------------------------------------------------------------

/** Parse a "YYYY-MM-DD" date input value into Y/M/D numbers (calendar date). */
export function parseDateInput(
  value: string
): { year: number; month: number; day: number } | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    day: parseInt(m[3], 10),
  };
}

/** Today's date in NY as a "YYYY-MM-DD" input string. */
export function todayInputValue(now: number = Date.now()): string {
  const p = getEtParts(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Add `days` to a "YYYY-MM-DD" input string (UTC-noon anchored to dodge DST). */
export function addDaysToInput(value: string, days: number): string {
  const d = parseDateInput(value);
  if (!d) return value;
  const anchor = Date.UTC(d.year, d.month - 1, d.day, 12, 0, 0);
  const shifted = new Date(anchor + days * MS_PER_DAY);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Build an absolute epoch ms for a NY wall-clock date + time. We find the UTC
 * instant whose NY rendering matches the requested Y/M/D/H/M by correcting for
 * NY's offset at a nearby instant (handles EST/EDT without a date library).
 */
export function etDateTimeToMs(
  year: number,
  month: number, // 1-12
  day: number,
  hours: number,
  minutes: number
): number {
  // First guess: treat the wall-clock as if it were UTC.
  const guess = Date.UTC(year, month - 1, day, hours, minutes, 0);
  // See what NY thinks that instant is, and correct by the delta.
  const p = getEtParts(guess);
  const asRenderedUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
  const offset = guess - asRenderedUtc; // = -(NY offset from UTC)
  return guess + offset;
}

export type PlanBucket =
  | "MARK YOUR CALENDAR"
  | "BOOKABLE NOW"
  | "JUST SHOW UP"
  | "CALL AHEAD"
  | "GOOD LUCK";

export interface PlanResult {
  restaurant: Restaurant;
  bucket: PlanBucket;
  // For MARK YOUR CALENDAR: the absolute instant the user should book.
  bookAtMs?: number;
  // Human "Book {weekday} {Mon D} at {releaseTime}" line.
  actionLabel?: string;
  // "in 12 days" style relative label.
  relativeLabel?: string;
  // A dry status line shown for non-calendar buckets.
  note?: string;
}

/**
 * Given a target dining date T (NY calendar date) and a restaurant, decide
 * which bucket it falls into and (for daily/weekly/monthly) when to book.
 */
export function computePlan(
  restaurant: Restaurant,
  targetDate: { year: number; month: number; day: number },
  now: number = Date.now()
): PlanResult {
  const { releaseSchedule, walkIns, platform } = restaurant;

  // Non-scheduled releases first.
  if (releaseSchedule === "none") {
    if (platform === "Invitation Only") {
      return {
        restaurant,
        bucket: "GOOD LUCK",
        note: "Know someone. That's the whole strategy.",
      };
    }
    if (walkIns) {
      return {
        restaurant,
        bucket: "JUST SHOW UP",
        note: restaurant.walkIn?.advice ?? "No reservations. Walk in and wait.",
      };
    }
    if (platform === "Phone" || restaurant.phoneNumber) {
      return {
        restaurant,
        bucket: "CALL AHEAD",
        note: restaurant.phoneNumber
          ? `Call ${restaurant.phoneNumber}. Be polite, be flexible.`
          : "Call the restaurant directly.",
      };
    }
    // Fallback: no schedule, no walk-in, no phone.
    return {
      restaurant,
      bucket: "GOOD LUCK",
      note: "No public release. You're on your own.",
    };
  }

  // Monthly-rule releases (calendar-month, twice-monthly) don't use a fixed
  // day window — derive the exact book moment from the rule itself.
  if (
    releaseSchedule === "calendar-month" ||
    releaseSchedule === "twice-monthly"
  ) {
    const ruleRelease = parseReleaseTime(restaurant.releaseTime);
    if (ruleRelease) {
      const bookAtMs = bookMomentForMonthlyRule(
        releaseSchedule,
        targetDate,
        ruleRelease
      );
      return buildScheduledPlanResult(restaurant, bookAtMs, now);
    }
  }

  const release = parseReleaseTime(restaurant.releaseTime);
  const W = restaurant.bookingWindowDays;

  // If we can't parse the release time or window, we can't compute a moment.
  if (!release || W == null) {
    // Still scheduled but underspecified — treat as bookable-ish / call ahead.
    if (restaurant.phoneNumber || platform === "Phone") {
      return {
        restaurant,
        bucket: "CALL AHEAD",
        note: "Release details unclear. Call to confirm timing.",
      };
    }
    return {
      restaurant,
      bucket: "BOOKABLE NOW",
      note: "Release timing unclear — check the platform now.",
    };
  }

  // The "window opens" calendar date = T - W days.
  const targetInput = `${targetDate.year}-${String(targetDate.month).padStart(2, "0")}-${String(targetDate.day).padStart(2, "0")}`;

  let bookAtMs: number;

  if (releaseSchedule === "daily") {
    const windowOpenInput = addDaysToInput(targetInput, -W);
    const d = parseDateInput(windowOpenInput)!;
    bookAtMs = etDateTimeToMs(d.year, d.month, d.day, release.hours, release.minutes);
  } else {
    // weekly / monthly: earliest release occurrence on/after (T - W).
    const windowOpenInput = addDaysToInput(targetInput, -W);
    bookAtMs = earliestScheduledRelease(
      windowOpenInput,
      release,
      releaseSchedule,
      restaurant.releaseDay
    );
  }

  return buildScheduledPlanResult(restaurant, bookAtMs, now);
}

/**
 * The exact instant to book for a monthly-rule release, given a target dining
 * date. `calendar-month`: the whole target month opens on the 1st of the prior
 * month. `twice-monthly`: dates on/after the 16th open on the 1st of that month;
 * dates on/before the 15th open on the 15th of the prior month.
 */
function bookMomentForMonthlyRule(
  schedule: "calendar-month" | "twice-monthly",
  target: { year: number; month: number; day: number },
  release: ParsedTime
): number {
  if (schedule === "calendar-month") {
    let y = target.year;
    let m = target.month - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    return etDateTimeToMs(y, m, 1, release.hours, release.minutes);
  }

  // twice-monthly
  if (target.day >= 16) {
    return etDateTimeToMs(target.year, target.month, 1, release.hours, release.minutes);
  }
  let y = target.year;
  let m = target.month - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return etDateTimeToMs(y, m, 15, release.hours, release.minutes);
}

/** Shared PLAN result for any computed book instant (BOOKABLE NOW vs MARK YOUR CALENDAR). */
function buildScheduledPlanResult(
  restaurant: Restaurant,
  bookAtMs: number,
  now: number
): PlanResult {
  if (bookAtMs <= now) {
    return {
      restaurant,
      bucket: "BOOKABLE NOW",
      note: "The window's already open — grab whatever's left.",
    };
  }

  const p = getEtParts(bookAtMs);
  const actionLabel = `Book ${WEEKDAYS_LONG[p.weekdayIndex]} ${MONTHS_SHORT[p.month - 1]} ${p.day} at ${restaurant.releaseTime}`;

  return {
    restaurant,
    bucket: "MARK YOUR CALENDAR",
    bookAtMs,
    actionLabel,
    relativeLabel: formatRelativeDays(bookAtMs - now),
  };
}

/**
 * Earliest weekly/monthly release instant on or after the given NY date
 * (input "YYYY-MM-DD"), at the release time-of-day.
 */
function earliestScheduledRelease(
  fromInput: string,
  release: ParsedTime,
  schedule: Restaurant["releaseSchedule"],
  releaseDay: string | undefined
): number {
  const from = parseDateInput(fromInput)!;

  if (schedule === "weekly" && releaseDay) {
    const targetDayIndex = DAYS.indexOf(releaseDay.toLowerCase());
    if (targetDayIndex !== -1) {
      // weekday index of the `from` date
      const fromParts = getEtParts(
        etDateTimeToMs(from.year, from.month, from.day, 12, 0)
      );
      let delta = targetDayIndex - fromParts.weekdayIndex;
      if (delta < 0) delta += 7;
      const occInput = addDaysToInput(fromInput, delta);
      const occ = parseDateInput(occInput)!;
      return etDateTimeToMs(
        occ.year,
        occ.month,
        occ.day,
        release.hours,
        release.minutes
      );
    }
  }

  if (schedule === "monthly" && releaseDay) {
    const dayMatch = releaseDay.match(/(\d+)/);
    if (dayMatch) {
      const dom = parseInt(dayMatch[1], 10);
      // This month's occurrence; if it's before `from`, roll to next month.
      let y = from.year;
      let m = from.month;
      if (from.day > dom) {
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
      return etDateTimeToMs(y, m, dom, release.hours, release.minutes);
    }
  }

  // Fallback: just use the from-date at release time.
  return etDateTimeToMs(
    from.year,
    from.month,
    from.day,
    release.hours,
    release.minutes
  );
}

// ---------------------------------------------------------------------------
// DROPS helpers
// ---------------------------------------------------------------------------

export interface UpcomingDrop {
  restaurant: Restaurant;
  msUntil: number; // ms from now until the drop (may be slightly negative if live)
  dropAtMs: number; // absolute instant of the drop
}

/** Compute the next upcoming drop for every restaurant that has a schedule. */
export function computeUpcomingDrops(
  restaurants: Restaurant[],
  now: number = Date.now()
): UpcomingDrop[] {
  const drops: UpcomingDrop[] = [];
  for (const r of restaurants) {
    if (r.releaseSchedule === "none") continue;
    const release = parseReleaseTime(r.releaseTime);
    if (!release) continue;
    const msUntil = getNextReleaseMs(
      release,
      r.releaseSchedule,
      r.releaseDay,
      now
    );
    if (msUntil == null) continue;
    drops.push({ restaurant: r, msUntil, dropAtMs: now + msUntil });
  }
  drops.sort((a, b) => a.msUntil - b.msUntil);
  return drops;
}

/** TONIGHT walk-in status from structured times. */
export type WalkInStatus = "GO NOW" | "GO LATER" | "LONG SHOT" | "NEUTRAL";

export interface WalkInPlay {
  restaurant: Restaurant;
  status: WalkInStatus;
  message: string;
}

const NINE_PM = 21 * 60;

export function computeWalkInStatus(
  restaurant: Restaurant,
  now: number = Date.now()
): WalkInPlay {
  const advice = restaurant.walkIn?.advice ?? "Walk in and put your name down.";
  const doorsMin = parseClockMinutes(restaurant.walkIn?.doors);
  const lineByMin = parseClockMinutes(restaurant.walkIn?.lineBy);
  const p = getEtParts(now);
  const nowMin = p.hour * 60 + p.minute;

  // No structured times → neutral, surface the advice.
  if (doorsMin == null && lineByMin == null) {
    return { restaurant, status: "NEUTRAL", message: advice };
  }

  if (nowMin >= NINE_PM) {
    return {
      restaurant,
      status: "LONG SHOT",
      message: "Long shot tonight. Try tomorrow.",
    };
  }

  if (lineByMin != null && nowMin < lineByMin) {
    const doorsLabel = restaurant.walkIn?.doors ?? "open";
    const lineLabel = restaurant.walkIn?.lineBy ?? "soon";
    return {
      restaurant,
      status: "GO LATER",
      message: `Doors at ${doorsLabel}. Be in line by ${lineLabel}.`,
    };
  }

  if (lineByMin != null && doorsMin != null && nowMin >= lineByMin && nowMin < doorsMin) {
    return { restaurant, status: "GO NOW", message: "Line is forming. Go now." };
  }

  if (doorsMin != null && nowMin >= doorsMin && nowMin < NINE_PM) {
    return {
      restaurant,
      status: "GO NOW",
      message: "Doors are open. Put your name in now.",
    };
  }

  // Only lineBy known and we're past it (no doors time): go now.
  if (lineByMin != null && nowMin >= lineByMin) {
    return { restaurant, status: "GO NOW", message: "Line is forming. Go now." };
  }

  // Only doors known and we're before it: go later.
  if (doorsMin != null && nowMin < doorsMin) {
    return {
      restaurant,
      status: "GO LATER",
      message: `Doors at ${restaurant.walkIn?.doors}. Get there a little early.`,
    };
  }

  return { restaurant, status: "NEUTRAL", message: advice };
}
