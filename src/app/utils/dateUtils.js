/**
 * dateUtils.js — IST-aware date helpers
 *
 * India Standard Time is UTC+5:30.
 * JavaScript's Date always works in UTC internally, so we need
 * explicit conversions when comparing "today's date" for users in IST.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m

/**
 * Returns today's date string in IST as "YYYY-MM-DD".
 */
export function todayIST() {
  const now    = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  return istNow.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

/**
 * Returns { start, end } — the start-of-day and end-of-day
 * UTC timestamps that correspond to "today in IST".
 */
export function todayISTRange() {
  const t = todayIST();          // "YYYY-MM-DD"
  // start-of-day IST = midnight IST = midnight - 5h30m UTC
  const start = new Date(`${t}T00:00:00+05:30`);
  const end   = new Date(`${t}T23:59:59+05:30`);
  return { start, end };
}

/**
 * Returns true if the given Date (or ISO string) falls on today in IST.
 */
export function isToday(date) {
  const d   = new Date(date);
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.toISOString().split("T")[0] === todayIST();
}
