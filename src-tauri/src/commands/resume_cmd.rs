use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

use crate::types::{ResumeCard, Snapshot};

#[tauri::command]
#[specta::specta]
pub async fn get_resume_card(app: AppHandle) -> Result<Option<ResumeCard>, String> {
    let pool = app.state::<SqlitePool>();

    // Find the latest unresumed snapshot
    let snapshot = sqlx::query_as::<_, Snapshot>(
        "SELECT * FROM snapshots WHERE resumed_at IS NULL ORDER BY created_at DESC LIMIT 1",
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to query unresumed snapshot: {e}");
        format!("Failed to query unresumed snapshot: {e}")
    })?;

    let snapshot = match snapshot {
        Some(s) => s,
        None => return Ok(None),
    };

    // Calculate seconds elapsed since snapshot was created using SQLite julianday
    let away_seconds: i32 = sqlx::query_scalar(
        "SELECT CAST((julianday('now') - julianday(?)) * 86400 AS INTEGER)",
    )
    .bind(&snapshot.created_at)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to calculate away duration: {e}");
        format!("Failed to calculate away duration: {e}")
    })?;

    Ok(Some(ResumeCard {
        is_stale: away_seconds > 900, // >15 minutes
        away_duration_seconds: away_seconds,
        snapshot,
    }))
}

#[tauri::command]
#[specta::specta]
pub async fn mark_resumed(app: AppHandle, id: i32) -> Result<(), String> {
    let pool = app.state::<SqlitePool>();

    // Calculate how long the user was away
    let duration: i32 = sqlx::query_scalar(
        "SELECT CAST((julianday('now') - julianday(created_at)) * 86400 AS INTEGER)
         FROM snapshots WHERE id = ?",
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to calculate resume duration: {e}");
        format!("Failed to calculate resume duration: {e}")
    })?;

    let result = sqlx::query(
        "UPDATE snapshots SET resumed_at = datetime('now'), resume_duration_seconds = ?
         WHERE id = ? AND resumed_at IS NULL",
    )
    .bind(duration)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to mark resumed: {e}");
        format!("Failed to mark resumed: {e}")
    })?;

    if result.rows_affected() == 0 {
        return Err(format!("Snapshot {id} not found or already resumed"));
    }

    log::info!("Marked snapshot {id} as resumed (away {duration}s)");
    Ok(())
}
