use serde::{Deserialize, Serialize};
use specta::Type;

/// Default shortcut for the overlay window
pub const DEFAULT_OVERLAY_SHORTCUT: &str = "CommandOrControl+Shift+Space";

// ============================================================================
// Preferences
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AppPreferences {
    pub theme: String,
    pub overlay_shortcut: Option<String>,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            overlay_shortcut: None,
        }
    }
}

// ============================================================================
// Snapshot Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Type, sqlx::FromRow)]
pub struct Snapshot {
    pub id: i32,
    pub current_task: String,
    pub progress_note: String,
    pub next_step: String,
    pub energy_state: String,
    pub interruption_type: Option<String>,
    pub interruption_note: Option<String>,
    pub linked_project: Option<String>,
    pub open_questions: Option<String>,
    pub created_at: String,
    pub resumed_at: Option<String>,
    pub resume_duration_seconds: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SnapshotInput {
    pub current_task: String,
    pub progress_note: String,
    pub next_step: String,
    pub energy_state: String,
    pub interruption_type: Option<String>,
    pub interruption_note: Option<String>,
    pub linked_project: Option<String>,
    pub open_questions: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ResumeCard {
    pub snapshot: Snapshot,
    pub away_duration_seconds: i32,
    pub is_stale: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DayTimelineEntry {
    pub snapshot: Snapshot,
    pub gap_before_seconds: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct InterruptionLogEntry {
    pub snapshot: Snapshot,
    pub time_away_seconds: Option<i32>,
    pub interruption_display: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct InterruptionLogResult {
    pub entries: Vec<InterruptionLogEntry>,
    pub total_interruptions: i32,
    pub total_time_lost_seconds: i32,
}

/// Internal row struct for timeline query with LAG() window function.
/// Not exported to TypeScript (no Type derive).
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TimelineRow {
    pub id: i32,
    pub current_task: String,
    pub progress_note: String,
    pub next_step: String,
    pub energy_state: String,
    pub interruption_type: Option<String>,
    pub interruption_note: Option<String>,
    pub linked_project: Option<String>,
    pub open_questions: Option<String>,
    pub created_at: String,
    pub resumed_at: Option<String>,
    pub resume_duration_seconds: Option<i32>,
    pub gap_before_seconds: Option<i32>,
}

// ============================================================================
// Weekly Report Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WeeklyReport {
    pub week_start: String,
    pub week_end: String,
    pub total_interruptions: i32,
    pub total_time_lost_seconds: i32,
    pub avg_gap_seconds: i32,
    pub most_common_type: Option<String>,
    pub by_day: Vec<DayCount>,
    pub by_type: Vec<TypeBreakdown>,
    pub by_energy: Vec<EnergyCount>,
    pub by_hour: Vec<HourCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, sqlx::FromRow)]
pub struct DayCount {
    pub day: i32,
    pub day_name: String,
    pub count: i32,
    pub time_lost_seconds: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, sqlx::FromRow)]
pub struct TypeBreakdown {
    pub interruption_type: String,
    pub count: i32,
    pub time_lost_seconds: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, sqlx::FromRow)]
pub struct EnergyCount {
    pub energy_state: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, sqlx::FromRow)]
pub struct HourCount {
    pub hour: i32,
    pub count: i32,
}

// ============================================================================
// Validation
// ============================================================================

pub fn validate_theme(theme: &str) -> Result<(), String> {
    match theme {
        "light" | "dark" | "system" => Ok(()),
        _ => Err("Invalid theme: must be 'light', 'dark', or 'system'".to_string()),
    }
}
