use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

use crate::types::ImportResult;

#[tauri::command]
#[specta::specta]
pub async fn import_snapshots(app: AppHandle, path: String) -> Result<ImportResult, String> {
    let pool = app.state::<SqlitePool>();

    let contents = std::fs::read_to_string(&path).map_err(|e| {
        log::error!("Failed to read import file: {e}");
        format!("Failed to read file: {e}")
    })?;

    let parsed: serde_json::Value = serde_json::from_str(&contents).map_err(|e| {
        log::error!("Failed to parse import JSON: {e}");
        format!("Invalid JSON: {e}")
    })?;

    let snapshots = parsed
        .get("snapshots")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "Missing or invalid 'snapshots' array in import file".to_string())?;

    let mut imported = 0;
    let mut skipped = 0;

    for snapshot in snapshots {
        let current_task = snapshot
            .get("current_task")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Snapshot missing 'current_task'".to_string())?;
        let progress_note = snapshot
            .get("progress_note")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Snapshot missing 'progress_note'".to_string())?;
        let next_step = snapshot
            .get("next_step")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Snapshot missing 'next_step'".to_string())?;
        let energy_state = snapshot
            .get("energy_state")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Snapshot missing 'energy_state'".to_string())?;
        let created_at = snapshot
            .get("created_at")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Snapshot missing 'created_at'".to_string())?;

        // Check for duplicate (same created_at + current_task)
        let exists: i32 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM snapshots WHERE created_at = ? AND current_task = ?",
        )
        .bind(created_at)
        .bind(current_task)
        .fetch_one(pool.inner())
        .await
        .unwrap_or(0);

        if exists > 0 {
            skipped += 1;
            continue;
        }

        let interruption_type = snapshot.get("interruption_type").and_then(|v| v.as_str());
        let interruption_note = snapshot.get("interruption_note").and_then(|v| v.as_str());
        let linked_project = snapshot.get("linked_project").and_then(|v| v.as_str());
        let open_questions = snapshot.get("open_questions").and_then(|v| v.as_str());
        let resumed_at = snapshot.get("resumed_at").and_then(|v| v.as_str());
        let resume_duration = snapshot
            .get("resume_duration_seconds")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        sqlx::query(
            "INSERT INTO snapshots (current_task, progress_note, next_step, energy_state,
             interruption_type, interruption_note, linked_project, open_questions,
             created_at, resumed_at, resume_duration_seconds)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(current_task)
        .bind(progress_note)
        .bind(next_step)
        .bind(energy_state)
        .bind(interruption_type)
        .bind(interruption_note)
        .bind(linked_project)
        .bind(open_questions)
        .bind(created_at)
        .bind(resumed_at)
        .bind(resume_duration)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to import snapshot: {e}");
            format!("Failed to import snapshot: {e}")
        })?;

        imported += 1;
    }

    log::info!("Imported {imported} snapshots, skipped {skipped}");
    Ok(ImportResult { imported, skipped })
}
