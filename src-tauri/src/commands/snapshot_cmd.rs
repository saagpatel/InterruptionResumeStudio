use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

use crate::types::{Snapshot, SnapshotInput};

#[tauri::command]
#[specta::specta]
pub async fn save_snapshot(app: AppHandle, data: SnapshotInput) -> Result<i32, String> {
    let pool = app.state::<SqlitePool>();
    let id = sqlx::query_scalar::<_, i32>(
        "INSERT INTO snapshots (current_task, progress_note, next_step, energy_state,
         interruption_type, interruption_note, linked_project, open_questions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id",
    )
    .bind(&data.current_task)
    .bind(&data.progress_note)
    .bind(&data.next_step)
    .bind(&data.energy_state)
    .bind(&data.interruption_type)
    .bind(&data.interruption_note)
    .bind(&data.linked_project)
    .bind(&data.open_questions)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to save snapshot: {e}");
        format!("Failed to save snapshot: {e}")
    })?;

    log::info!("Saved snapshot id={id}");
    Ok(id)
}

#[tauri::command]
#[specta::specta]
pub async fn get_latest_snapshot(app: AppHandle) -> Result<Option<Snapshot>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, Snapshot>("SELECT * FROM snapshots ORDER BY created_at DESC LIMIT 1")
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to get latest snapshot: {e}");
            format!("Failed to get latest snapshot: {e}")
        })
}

#[tauri::command]
#[specta::specta]
pub async fn get_snapshots(
    app: AppHandle,
    limit: i32,
    offset: i32,
    project: Option<String>,
) -> Result<Vec<Snapshot>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, Snapshot>(
        "SELECT * FROM snapshots
         WHERE (? IS NULL OR linked_project = ?)
         ORDER BY created_at DESC LIMIT ? OFFSET ?",
    )
    .bind(project.as_deref())
    .bind(project.as_deref())
    .bind(limit)
    .bind(offset)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get snapshots: {e}");
        format!("Failed to get snapshots: {e}")
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_projects(app: AppHandle) -> Result<Vec<String>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_scalar::<_, String>(
        "SELECT DISTINCT linked_project FROM snapshots
         WHERE linked_project IS NOT NULL AND linked_project != ''
         ORDER BY linked_project",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get projects: {e}");
        format!("Failed to get projects: {e}")
    })
}
