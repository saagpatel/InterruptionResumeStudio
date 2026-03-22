export type EnergyState = "drained" | "okay" | "focused";
export type InterruptionType = "meeting" | "slack" | "personal" | "other";
export type AppView =
	| "resume"
	| "snapshot"
	| "history"
	| "log"
	| "timeline"
	| "insights";

export interface Snapshot {
	id: number;
	current_task: string;
	progress_note: string;
	next_step: string;
	energy_state: EnergyState;
	interruption_type: InterruptionType | null;
	interruption_note: string | null;
	linked_project: string | null;
	open_questions: string | null;
	created_at: string;
	resumed_at: string | null;
	resume_duration_seconds: number | null;
}

export interface SnapshotFormData {
	current_task: string;
	progress_note: string;
	next_step: string;
	energy_state: EnergyState;
	interruption_type?: InterruptionType;
	interruption_note?: string;
	linked_project?: string;
	open_questions?: string;
}

export interface ResumeCard {
	snapshot: Snapshot;
	away_duration_seconds: number;
	is_stale: boolean;
}

export interface DayTimelineEntry {
	snapshot: Snapshot;
	gap_before_seconds: number | null;
}

export interface InterruptionLogEntry {
	snapshot: Snapshot;
	time_away_seconds: number | null;
	interruption_display: string;
}

export interface InterruptionLogResult {
	entries: InterruptionLogEntry[];
	total_interruptions: number;
	total_time_lost_seconds: number;
}
