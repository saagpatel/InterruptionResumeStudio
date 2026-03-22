use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

use crate::types::{
    DayTimelineEntry, InterruptionLogEntry, InterruptionLogResult, Snapshot, TimelineRow,
};

#[tauri::command]
#[specta::specta]
pub async fn get_interruption_log(
    app: AppHandle,
    date: Option<String>,
    project: Option<String>,
) -> Result<InterruptionLogResult, String> {
    let pool = app.state::<SqlitePool>();

    let snapshots = sqlx::query_as::<_, Snapshot>(
        "SELECT * FROM snapshots
         WHERE date(created_at) = COALESCE(?, date('now'))
           AND (? IS NULL OR linked_project = ?)
         ORDER BY created_at DESC",
    )
    .bind(date.as_deref())
    .bind(project.as_deref())
    .bind(project.as_deref())
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get interruption log: {e}");
        format!("Failed to get interruption log: {e}")
    })?;

    let entries: Vec<InterruptionLogEntry> = snapshots
        .into_iter()
        .map(|s| {
            let duration_str = s
                .resume_duration_seconds
                .map(format_duration_short)
                .unwrap_or_default();

            let interruption_display = match (&s.interruption_type, s.resume_duration_seconds) {
                (Some(t), Some(_)) => format!("{} · {}", capitalize(t), duration_str),
                (Some(t), None) => capitalize(t),
                (None, Some(_)) => duration_str,
                (None, None) => "—".to_string(),
            };

            InterruptionLogEntry {
                time_away_seconds: s.resume_duration_seconds,
                interruption_display,
                snapshot: s,
            }
        })
        .collect();

    let total_interruptions = entries.len() as i32;
    let total_time_lost_seconds = entries
        .iter()
        .filter_map(|e| e.time_away_seconds)
        .sum();

    Ok(InterruptionLogResult {
        entries,
        total_interruptions,
        total_time_lost_seconds,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_day_timeline(
    app: AppHandle,
    date: String,
    project: Option<String>,
) -> Result<Vec<DayTimelineEntry>, String> {
    let pool = app.state::<SqlitePool>();

    let rows = sqlx::query_as::<_, TimelineRow>(
        "SELECT s.*,
           CAST((julianday(s.created_at) - julianday(
               LAG(s.resumed_at) OVER (ORDER BY s.created_at ASC)
           )) * 86400 AS INTEGER) AS gap_before_seconds
         FROM snapshots s
         WHERE date(s.created_at) = ?
           AND (? IS NULL OR s.linked_project = ?)
         ORDER BY s.created_at ASC",
    )
    .bind(&date)
    .bind(project.as_deref())
    .bind(project.as_deref())
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get day timeline: {e}");
        format!("Failed to get day timeline: {e}")
    })?;

    let entries = rows
        .into_iter()
        .map(|row| DayTimelineEntry {
            snapshot: Snapshot {
                id: row.id,
                current_task: row.current_task,
                progress_note: row.progress_note,
                next_step: row.next_step,
                energy_state: row.energy_state,
                interruption_type: row.interruption_type,
                interruption_note: row.interruption_note,
                linked_project: row.linked_project,
                open_questions: row.open_questions,
                created_at: row.created_at,
                resumed_at: row.resumed_at,
                resume_duration_seconds: row.resume_duration_seconds,
            },
            gap_before_seconds: row.gap_before_seconds,
        })
        .collect();

    Ok(entries)
}

fn format_duration_short(seconds: i32) -> String {
    if seconds < 60 {
        format!("{seconds}s")
    } else if seconds < 3600 {
        format!("{}m", seconds / 60)
    } else {
        let h = seconds / 3600;
        let m = (seconds % 3600) / 60;
        if m > 0 {
            format!("{h}h {m}m")
        } else {
            format!("{h}h")
        }
    }
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_duration_short() {
        assert_eq!(format_duration_short(0), "0s");
        assert_eq!(format_duration_short(45), "45s");
        assert_eq!(format_duration_short(59), "59s");
        assert_eq!(format_duration_short(60), "1m");
        assert_eq!(format_duration_short(90), "1m");
        assert_eq!(format_duration_short(3599), "59m");
        assert_eq!(format_duration_short(3600), "1h");
        assert_eq!(format_duration_short(3900), "1h 5m");
        assert_eq!(format_duration_short(7200), "2h");
        assert_eq!(format_duration_short(7260), "2h 1m");
    }

    #[test]
    fn test_capitalize() {
        assert_eq!(capitalize("hello"), "Hello");
        assert_eq!(capitalize(""), "");
        assert_eq!(capitalize("a"), "A");
        assert_eq!(capitalize("HELLO"), "HELLO");
        assert_eq!(capitalize("meeting"), "Meeting");
        assert_eq!(capitalize("slack"), "Slack");
    }
}
