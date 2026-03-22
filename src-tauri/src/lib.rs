mod bindings;
mod commands;
pub mod db;
mod types;

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

pub use types::DEFAULT_OVERLAY_SHORTCUT;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = bindings::generate_bindings();

    #[cfg(debug_assertions)]
    bindings::export_ts_bindings();

    let mut app_builder = tauri::Builder::default();

    // Single instance: focus existing window if user re-launches
    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }));
    }

    // Restore window position/size between sessions
    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(tauri_plugin_window_state::StateFlags::all())
                .build(),
        );
    }

    app_builder = app_builder
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                    #[cfg(target_os = "macos")]
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                ])
                .build(),
        );

    #[cfg(target_os = "macos")]
    {
        app_builder = app_builder.plugin(tauri_nspanel::init());
    }

    app_builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            log::info!("Interruption Resume Studio starting up");

            // Initialize SQLite database
            let pool = tauri::async_runtime::block_on(db::init_db(app))?;
            app.manage(pool);
            log::info!("Database initialized");

            // Register global shortcut plugin
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::Builder;
                app.handle().plugin(Builder::new().build())?;
            }

            // Register overlay shortcut
            #[cfg(desktop)]
            {
                let saved_shortcut = commands::preferences::load_overlay_shortcut(app.handle());
                let shortcut_to_register = saved_shortcut
                    .as_deref()
                    .unwrap_or(DEFAULT_OVERLAY_SHORTCUT);

                log::info!("Registering overlay shortcut: {shortcut_to_register}");
                commands::overlay::register_overlay_shortcut(
                    app.handle(),
                    shortcut_to_register,
                )?;
            }

            // Create overlay window (hidden) — pre-loaded for <200ms appear time
            if let Err(e) = commands::overlay::init_overlay(app.handle()) {
                log::error!("Failed to create overlay: {e}");
            }

            // System tray
            let snapshot_now = MenuItem::with_id(
                app,
                "snapshot_now",
                "Snapshot Now",
                true,
                Some("CmdOrCtrl+Shift+Space"),
            )?;
            let resume_last =
                MenuItem::with_id(app, "resume_last", "Resume Last", true, None::<&str>)?;
            let show_app =
                MenuItem::with_id(app, "show_app", "Show App", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit =
                MenuItem::with_id(app, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

            let menu = Menu::with_items(
                app,
                &[&snapshot_now, &resume_last, &show_app, &separator, &quit],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(
                    Image::from_bytes(include_bytes!("../icons/tray-icon.png"))
                        .map_err(|e| format!("Failed to load tray icon: {e}"))?,
                )
                .icon_as_template(true)
                .menu(&menu)
                .tooltip("Interruption Resume Studio")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "snapshot_now" => {
                        if let Err(e) = commands::overlay::show_overlay(app.clone()) {
                            log::error!("Tray: failed to show overlay: {e}");
                        }
                    }
                    "resume_last" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate", "resume");
                        }
                    }
                    "show_app" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)
                .map_err(|e| format!("Failed to build tray icon: {e}"))?;

            log::info!("System tray initialized");

            Ok(())
        })
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
