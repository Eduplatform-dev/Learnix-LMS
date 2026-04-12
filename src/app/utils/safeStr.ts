/**
 * safeStr.ts
 * Utility helpers to safely extract display strings from fields
 * that the API may return as either a primitive or a populated object.
 *
 * Drop this file at:  src/app/utils/safeStr.ts
 */

type MaybeUser = string | { _id?: string; username?: string; email?: string } | null | undefined;
type MaybeObj  = string | Record<string, any> | null | undefined;

/**
 * Returns a display name string from a user field that may be a populated
 * object { _id, username, email } or a plain string ID.
 */
export function userName(u: MaybeUser): string {
  if (!u) return "—";
  if (typeof u === "string") return u;
  return u.username || u.email || "—";
}

/**
 * Returns a display string from any field that may be a populated object
 * or a plain string.  Tries `name`, then `title`, then `username`,
 * then `email`, then falls back to `"—"`.
 */
export function safeStr(v: MaybeObj, fallback = "—"): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v || fallback;
  return (
    (v as any).name     ||
    (v as any).title    ||
    (v as any).username ||
    (v as any).email    ||
    fallback
  );
}

/**
 * Safely extracts the `_id` string from a field that may be a populated
 * object or already a string ID.
 */
export function safeId(v: MaybeObj): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return (v as any)._id || "";
}
