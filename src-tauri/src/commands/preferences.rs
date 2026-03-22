//! Preferences management commands.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::{validate_theme, AppPreferences};

fn get_preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join("preferences.json"))
}

/// Load the saved overlay shortcut from preferences at startup.
pub fn load_overlay_shortcut(app: &AppHandle) -> Option<String> {
    let path = get_preferences_path(app).ok()?;
    if !path.exists() {
        return None;
    }
    let contents = std::fs::read_to_string(&path)
        .inspect_err(|e| log::warn!("Failed to read preferences: {e}"))
        .ok()?;
    let prefs: AppPreferences = serde_json::from_str(&contents)
        .inspect_err(|e| log::warn!("Failed to parse preferences: {e}"))
        .ok()?;
    prefs.overlay_shortcut
}

#[tauri::command]
#[specta::specta]
pub async fn load_preferences(app: AppHandle) -> Result<AppPreferences, String> {
    let prefs_path = get_preferences_path(&app)?;

    if !prefs_path.exists() {
        return Ok(AppPreferences::default());
    }

    let contents = std::fs::read_to_string(&prefs_path)
        .map_err(|e| format!("Failed to read preferences: {e}"))?;

    serde_json::from_str(&contents).map_err(|e| format!("Failed to parse preferences: {e}"))
}

#[tauri::command]
#[specta::specta]
pub async fn save_preferences(app: AppHandle, preferences: AppPreferences) -> Result<(), String> {
    validate_theme(&preferences.theme)?;

    let prefs_path = get_preferences_path(&app)?;
    let json_content = serde_json::to_string_pretty(&preferences)
        .map_err(|e| format!("Failed to serialize preferences: {e}"))?;

    let temp_path = prefs_path.with_extension("tmp");
    std::fs::write(&temp_path, json_content)
        .map_err(|e| format!("Failed to write preferences: {e}"))?;

    if let Err(e) = std::fs::rename(&temp_path, &prefs_path) {
        let _ = std::fs::remove_file(&temp_path);
        return Err(format!("Failed to finalize preferences: {e}"));
    }

    Ok(())
}
