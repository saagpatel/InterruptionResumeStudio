//! Overlay window management commands.
//!
//! The overlay is a floating panel (NSPanel on macOS) that provides
//! quick context capture accessible via global shortcut (CmdOrCtrl+Shift+Space).

use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewUrl};

use crate::types::DEFAULT_OVERLAY_SHORTCUT;

const OVERLAY_LABEL: &str = "overlay";
const OVERLAY_WIDTH: f64 = 400.0;
const OVERLAY_HEIGHT: f64 = 320.0;

static CURRENT_OVERLAY_SHORTCUT: Mutex<Option<String>> = Mutex::new(None);

// ============================================================================
// macOS: NSPanel support
// ============================================================================

#[cfg(target_os = "macos")]
use tauri_nspanel::{
    tauri_panel, CollectionBehavior, ManagerExt, PanelBuilder, PanelLevel, StyleMask,
};

#[cfg(target_os = "macos")]
tauri_panel! {
    panel!(OverlayPanel {
        config: {
            can_become_key_window: true,
            can_become_main_window: false,
            is_floating_panel: true
        }
    })
}

// ============================================================================
// Window Initialization
// ============================================================================

pub fn init_overlay(app: &AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        init_overlay_macos(app)
    }

    #[cfg(not(target_os = "macos"))]
    {
        init_overlay_standard(app)
    }
}

#[cfg(target_os = "macos")]
fn init_overlay_macos(app: &AppHandle) -> Result<(), String> {
    use tauri::{LogicalSize, Size};

    log::debug!("Creating overlay as NSPanel (macOS)");

    let panel = PanelBuilder::<_, OverlayPanel>::new(app, OVERLAY_LABEL)
        .url(WebviewUrl::App("overlay.html".into()))
        .title("Capture Context")
        .size(Size::Logical(LogicalSize::new(
            OVERLAY_WIDTH,
            OVERLAY_HEIGHT,
        )))
        .level(PanelLevel::Status)
        .transparent(true)
        .has_shadow(true)
        .collection_behavior(
            CollectionBehavior::new()
                .full_screen_auxiliary()
                .can_join_all_spaces(),
        )
        .style_mask(StyleMask::empty().nonactivating_panel())
        .hides_on_deactivate(false)
        .works_when_modal(true)
        .with_window(|w| {
            w.decorations(false)
                .transparent(true)
                .skip_taskbar(true)
                .resizable(false)
                .center()
        })
        .build()
        .map_err(|e| format!("Failed to create overlay panel: {e}"))?;

    panel.hide();
    log::info!("Overlay NSPanel created (hidden)");
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn init_overlay_standard(app: &AppHandle) -> Result<(), String> {
    use tauri::webview::WebviewWindowBuilder;

    log::debug!("Creating overlay as standard window");

    WebviewWindowBuilder::new(app, OVERLAY_LABEL, WebviewUrl::App("overlay.html".into()))
        .title("Capture Context")
        .inner_size(OVERLAY_WIDTH, OVERLAY_HEIGHT)
        .always_on_top(true)
        .skip_taskbar(true)
        .decorations(false)
        .transparent(true)
        .visible(false)
        .resizable(false)
        .center()
        .build()
        .map_err(|e| format!("Failed to create overlay window: {e}"))?;

    log::info!("Overlay window created (hidden)");
    Ok(())
}

// ============================================================================
// Window Positioning
// ============================================================================

fn get_monitor_for_cursor(
    app: &AppHandle,
    cursor_pos: tauri::PhysicalPosition<f64>,
) -> Option<tauri::Monitor> {
    match app.monitor_from_point(cursor_pos.x, cursor_pos.y) {
        Ok(Some(m)) => Some(m),
        Ok(None) => app.primary_monitor().ok().flatten(),
        Err(_) => app.primary_monitor().ok().flatten(),
    }
}

fn get_centered_position(app: &AppHandle) -> Option<tauri::PhysicalPosition<i32>> {
    let cursor_pos = app.cursor_position().ok()?;
    let monitor = get_monitor_for_cursor(app, cursor_pos)?;

    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let scale_factor = monitor.scale_factor();

    let scaled_width = (OVERLAY_WIDTH * scale_factor) as i32;
    let scaled_height = (OVERLAY_HEIGHT * scale_factor) as i32;

    let x = monitor_pos.x + (monitor_size.width as i32 - scaled_width) / 2;
    let y = monitor_pos.y + (monitor_size.height as i32 - scaled_height) / 2;

    Some(tauri::PhysicalPosition::new(x, y))
}

fn position_overlay(app: &AppHandle) {
    if let Some(position) = get_centered_position(app) {
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            let _ = window.set_position(position);
        }
    }
}

// ============================================================================
// Visibility
// ============================================================================

fn is_overlay_visible(app: &AppHandle) -> bool {
    #[cfg(target_os = "macos")]
    {
        app.get_webview_panel(OVERLAY_LABEL)
            .map(|panel| panel.is_visible())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "macos"))]
    {
        app.get_webview_window(OVERLAY_LABEL)
            .and_then(|window| window.is_visible().ok())
            .unwrap_or(false)
    }
}

#[tauri::command]
#[specta::specta]
pub fn show_overlay(app: AppHandle) -> Result<(), String> {
    log::info!("Showing overlay");
    position_overlay(&app);

    #[cfg(target_os = "macos")]
    {
        let panel = app
            .get_webview_panel(OVERLAY_LABEL)
            .map_err(|e| format!("Overlay panel not found: {e:?}"))?;
        panel.show_and_make_key();
    }

    #[cfg(not(target_os = "macos"))]
    {
        let window = app
            .get_webview_window(OVERLAY_LABEL)
            .ok_or("Overlay window not found")?;
        window.show().map_err(|e| format!("Failed to show: {e}"))?;
        window
            .set_focus()
            .map_err(|e| format!("Failed to focus: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn dismiss_overlay(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(panel) = app.get_webview_panel(OVERLAY_LABEL) {
            if !panel.is_visible() {
                return Ok(());
            }
            log::info!("Dismissing overlay");
            panel.resign_key_window();
            panel.hide();
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            if !window.is_visible().unwrap_or(false) {
                return Ok(());
            }
            log::info!("Dismissing overlay");
            window.hide().map_err(|e| format!("Failed to hide: {e}"))?;
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn toggle_overlay(app: AppHandle) -> Result<(), String> {
    if is_overlay_visible(&app) {
        dismiss_overlay(app)
    } else {
        show_overlay(app)
    }
}

// ============================================================================
// Shortcut Management
// ============================================================================

#[cfg(desktop)]
pub fn register_overlay_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

    let global_shortcut = app.global_shortcut();

    let mut current_shortcut = CURRENT_OVERLAY_SHORTCUT
        .lock()
        .map_err(|e| format!("Failed to lock shortcut mutex: {e}"))?;

    if let Some(old_shortcut_str) = current_shortcut.take() {
        if let Ok(old_shortcut) = old_shortcut_str.parse::<Shortcut>() {
            let _ = global_shortcut.unregister(old_shortcut);
        }
    }

    let app_handle = app.clone();
    global_shortcut
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            use tauri_plugin_global_shortcut::ShortcutState;
            if event.state == ShortcutState::Pressed {
                log::info!("Overlay shortcut triggered");
                if let Err(e) = toggle_overlay(app_handle.clone()) {
                    log::error!("Failed to toggle overlay: {e}");
                }
            }
        })
        .map_err(|e| format!("Failed to register shortcut '{shortcut}': {e}"))?;

    *current_shortcut = Some(shortcut.to_string());
    log::info!("Registered overlay shortcut: {shortcut}");

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_default_overlay_shortcut() -> String {
    DEFAULT_OVERLAY_SHORTCUT.to_string()
}

#[tauri::command]
#[specta::specta]
pub fn update_overlay_shortcut(app: AppHandle, shortcut: Option<String>) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let new_shortcut = shortcut.as_deref().unwrap_or(DEFAULT_OVERLAY_SHORTCUT);
        log::info!("Updating overlay shortcut to: {new_shortcut}");
        register_overlay_shortcut(&app, new_shortcut)?;
    }

    #[cfg(not(desktop))]
    {
        let _ = (app, shortcut);
    }

    Ok(())
}
