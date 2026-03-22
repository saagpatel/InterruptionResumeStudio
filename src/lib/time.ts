/**
 * Format seconds into a human-readable duration string.
 * Examples: "47 min ago", "2h 13m away", "just now"
 */
export function formatDuration(seconds: number): string {
	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
	const hours = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format seconds as "X min ago" or "Xh Ym ago".
 */
export function formatAgo(seconds: number): string {
	if (seconds < 60) return "just now";
	return `${formatDuration(seconds)} ago`;
}

/**
 * Format seconds as "X min away" or "Xh Ym away".
 */
export function formatAway(seconds: number): string {
	if (seconds < 60) return "just now";
	return `${formatDuration(seconds)} away`;
}
