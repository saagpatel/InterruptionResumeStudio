use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

#[tauri::command]
#[specta::specta]
pub async fn get_app_state(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_scalar::<_, String>("SELECT value FROM app_state WHERE key = ?")
        .bind(&key)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to get app_state '{key}': {e}");
            format!("Failed to get app_state: {e}")
        })
}

#[tauri::command]
#[specta::specta]
pub async fn set_app_state(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query(
        "INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
    )
    .bind(&key)
    .bind(&value)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to set app_state '{key}': {e}");
        format!("Failed to set app_state: {e}")
    })?;

    log::debug!("Set app_state '{key}' = '{value}'");
    Ok(())
}
