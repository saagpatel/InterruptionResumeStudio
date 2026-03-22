/// Check if the app has macOS Accessibility permission (required for global shortcuts).
/// Returns true on non-macOS platforms.
#[tauri::command]
#[specta::specta]
pub fn check_accessibility() -> bool {
    #[cfg(target_os = "macos")]
    {
        // SAFETY: AXIsProcessTrusted is a stable macOS API with no side effects.
        unsafe { AXIsProcessTrusted() }
    }

    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Open macOS System Settings → Privacy → Accessibility.
#[tauri::command]
#[specta::specta]
pub fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|e| format!("Failed to open Accessibility settings: {e}"))?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn AXIsProcessTrusted() -> bool;
}
