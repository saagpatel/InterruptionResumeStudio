use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;
use tauri::Manager;

const MIGRATIONS: &[&str] = &[
    // Migration 1: snapshots table
    "CREATE TABLE IF NOT EXISTS snapshots (
        id                       INTEGER PRIMARY KEY AUTOINCREMENT,
        current_task             TEXT NOT NULL,
        progress_note            TEXT NOT NULL,
        next_step                TEXT NOT NULL,
        energy_state             TEXT NOT NULL CHECK(energy_state IN ('drained', 'okay', 'focused')),
        interruption_type        TEXT CHECK(interruption_type IN ('meeting', 'slack', 'personal', 'other')),
        interruption_note        TEXT,
        linked_project           TEXT,
        open_questions           TEXT,
        created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
        resumed_at               DATETIME,
        resume_duration_seconds  INTEGER
    );",
    "CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_snapshots_resumed ON snapshots(resumed_at);",
    "CREATE INDEX IF NOT EXISTS idx_snapshots_date ON snapshots(date(created_at));",
    // Migration 1: app_state table
    "CREATE TABLE IF NOT EXISTS app_state (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );",
];

pub async fn init_db(app: &tauri::App) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {e}"))?;

    let db_path = app_data_dir.join("irs.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    log::info!("Initializing database at: {}", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(3)
        .connect(&db_url)
        .await
        .map_err(|e| format!("Failed to connect to SQLite: {e}"))?;

    sqlx::query("PRAGMA journal_mode=WAL")
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to set WAL mode: {e}"))?;

    sqlx::query("PRAGMA foreign_keys=ON")
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to enable foreign keys: {e}"))?;

    for sql in MIGRATIONS {
        let result = sqlx::query(sql).execute(&pool).await;
        match result {
            Ok(_) => {}
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("already exists") || msg.contains("duplicate column") {
                    log::debug!("Migration skipped (already applied): {msg}");
                } else {
                    return Err(format!("Migration failed: {msg}").into());
                }
            }
        }
    }

    log::info!("Database migrations complete");
    Ok(pool)
}
