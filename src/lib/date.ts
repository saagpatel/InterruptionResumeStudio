import { format, isToday } from "date-fns";

/**
 * Parse a SQLite datetime string into a JS Date.
 * SQLite returns "YYYY-MM-DD HH:MM:SS" (space separator, not T).
 */
export function parseSqliteDate(dateStr: string): Date {
	return new Date(dateStr.replace(" ", "T"));
}

/**
 * Format a SQLite datetime for display.
 * Today: "2:34 PM" — Other days: "Mar 20 3:12 PM"
 */
export function formatSnapshotDate(dateStr: string): string {
	const date = parseSqliteDate(dateStr);
	return isToday(date) ? format(date, "h:mm a") : format(date, "MMM d h:mm a");
}
