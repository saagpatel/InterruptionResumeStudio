use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

use crate::types::{
    DayCount, EnergyCount, HourCount, TypeBreakdown, WeeklyReport,
};

const DAY_NAMES: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

#[tauri::command]
#[specta::specta]
pub async fn get_weekly_report(app: AppHandle, week_offset: i32) -> Result<WeeklyReport, String> {
    let pool = app.state::<SqlitePool>();
    let offset_days = week_offset * 7;

    // Calculate week boundaries (Monday-based)
    let (week_start, week_end): (String, String) = sqlx::query_as(
        "SELECT
           date('now', 'weekday 1', '-7 days', ? || ' days') as week_start,
           date('now', 'weekday 1', '-1 days', ? || ' days') as week_end",
    )
    .bind(offset_days)
    .bind(offset_days)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to calculate week boundaries: {e}"))?;

    // Summary stats
    let (total_interruptions, total_time_lost_seconds): (i32, i32) = sqlx::query_as(
        "SELECT CAST(COUNT(*) AS INTEGER), CAST(COALESCE(SUM(resume_duration_seconds), 0) AS INTEGER)
         FROM snapshots WHERE date(created_at) BETWEEN ? AND ?",
    )
    .bind(&week_start)
    .bind(&week_end)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Failed to get summary stats: {e}"))?;

    // By day of week
    let day_rows: Vec<(i32, i32, i32)> = sqlx::query_as(
        "SELECT CAST(strftime('%w', created_at) AS INTEGER) as day,
                CAST(COUNT(*) AS INTEGER) as count,
                CAST(COALESCE(SUM(resume_duration_seconds), 0) AS INTEGER) as time_lost_seconds
         FROM snapshots WHERE date(created_at) BETWEEN ? AND ?
         GROUP BY day ORDER BY day",
    )
    .bind(&week_start)
    .bind(&week_end)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to get day breakdown: {e}"))?;

    let by_day: Vec<DayCount> = day_rows
        .into_iter()
        .map(|(day, count, time_lost)| DayCount {
            day,
            day_name: DAY_NAMES.get(day as usize).unwrap_or(&"?").to_string(),
            count,
            time_lost_seconds: time_lost,
        })
        .collect();

    // By interruption type
    let by_type: Vec<TypeBreakdown> = sqlx::query_as(
        "SELECT COALESCE(interruption_type, 'unspecified') as interruption_type,
                CAST(COUNT(*) AS INTEGER) as count,
                CAST(COALESCE(SUM(resume_duration_seconds), 0) AS INTEGER) as time_lost_seconds
         FROM snapshots WHERE date(created_at) BETWEEN ? AND ?
         GROUP BY interruption_type ORDER BY count DESC",
    )
    .bind(&week_start)
    .bind(&week_end)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to get type breakdown: {e}"))?;

    let most_common_type = by_type.first().map(|t| t.interruption_type.clone());

    // By energy state
    let by_energy: Vec<EnergyCount> = sqlx::query_as(
        "SELECT energy_state, CAST(COUNT(*) AS INTEGER) as count
         FROM snapshots WHERE date(created_at) BETWEEN ? AND ?
         GROUP BY energy_state",
    )
    .bind(&week_start)
    .bind(&week_end)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to get energy breakdown: {e}"))?;

    // By hour
    let by_hour: Vec<HourCount> = sqlx::query_as(
        "SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
                CAST(COUNT(*) AS INTEGER) as count
         FROM snapshots WHERE date(created_at) BETWEEN ? AND ?
         GROUP BY hour ORDER BY hour",
    )
    .bind(&week_start)
    .bind(&week_end)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Failed to get hour breakdown: {e}"))?;

    // Average gap between interruptions
    let avg_gap_seconds: i32 = if total_interruptions > 1 {
        let avg: Option<i32> = sqlx::query_scalar(
            "SELECT CAST(AVG(gap) AS INTEGER) FROM (
                SELECT CAST((julianday(created_at) - julianday(
                    LAG(resumed_at) OVER (ORDER BY created_at ASC)
                )) * 86400 AS INTEGER) as gap
                FROM snapshots
                WHERE date(created_at) BETWEEN ? AND ?
            ) WHERE gap IS NOT NULL AND gap > 0",
        )
        .bind(&week_start)
        .bind(&week_end)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Failed to calculate avg gap: {e}"))?;
        avg.unwrap_or(0)
    } else {
        0
    };

    Ok(WeeklyReport {
        week_start,
        week_end,
        total_interruptions,
        total_time_lost_seconds,
        avg_gap_seconds,
        most_common_type,
        by_day,
        by_type,
        by_energy,
        by_hour,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_day_names() {
        assert_eq!(DAY_NAMES.len(), 7);
        assert_eq!(DAY_NAMES[0], "Sun");
        assert_eq!(DAY_NAMES[1], "Mon");
        assert_eq!(DAY_NAMES[2], "Tue");
        assert_eq!(DAY_NAMES[3], "Wed");
        assert_eq!(DAY_NAMES[4], "Thu");
        assert_eq!(DAY_NAMES[5], "Fri");
        assert_eq!(DAY_NAMES[6], "Sat");
    }
}
