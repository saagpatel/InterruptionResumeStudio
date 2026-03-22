use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

use crate::types::Snapshot;

#[tauri::command]
#[specta::specta]
pub async fn export_snapshots(app: AppHandle, path: String) -> Result<i32, String> {
    let pool = app.state::<SqlitePool>();

    let snapshots = sqlx::query_as::<_, Snapshot>(
        "SELECT * FROM snapshots ORDER BY created_at DESC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to query snapshots for export: {e}");
        format!("Failed to query snapshots: {e}")
    })?;

    let count = snapshots.len() as i32;

    let exported_at: String = sqlx::query_scalar("SELECT datetime('now')")
        .fetch_one(pool.inner())
        .await
        .unwrap_or_else(|_| "unknown".to_string());

    let export = serde_json::json!({
        "_comment": "Interruption Resume Studio export — contains work context, handle accordingly",
        "exported_at": exported_at,
        "count": count,
        "snapshots": snapshots,
    });

    let json = serde_json::to_string_pretty(&export).map_err(|e| {
        log::error!("Failed to serialize export: {e}");
        format!("Failed to serialize: {e}")
    })?;

    std::fs::write(&path, json).map_err(|e| {
        log::error!("Failed to write export to {path}: {e}");
        format!("Failed to write file: {e}")
    })?;

    log::info!("Exported {count} snapshots to {path}");
    Ok(count)
}
