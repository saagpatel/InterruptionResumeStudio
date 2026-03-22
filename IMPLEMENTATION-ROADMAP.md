# Interruption Resume Studio — Implementation Roadmap

## Architecture

### System Overview

```
[Global Hotkey: CmdOrCtrl+Shift+Space] ──┐
[Menu Bar: "Snapshot Now"]               ├──→ [Rust Core: commands/snapshot_cmd.rs]
[App Window: manual open]               ─┘         │
                                                    ↓
                                         [tauri-plugin-sql → SQLite]
                                    ~/Library/Application Support/
                                         interruption-resume-studio/irs.db
                                                    │
                                         ┌──────────┴──────────┐
                                         ↓                      ↓
                                [Overlay Window]         [Main App Window]
                               overlay.html (400×320)    index.html
                               SnapshotForm.tsx           ResumeCard.tsx (auto)
                                                          SnapshotHistory.tsx
                                                          InterruptionLog.tsx
                                                          DayTimeline.tsx
```

### File Structure

```
interruption-resume-studio/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                   # App bootstrap, window setup, tray icon, plugin init
│   │   ├── commands/
│   │   │   ├── snapshot_cmd.rs       # save_snapshot, get_latest_snapshot, get_snapshots
│   │   │   ├── resume_cmd.rs         # get_resume_card, mark_resumed
│   │   │   └── log_cmd.rs            # get_interruption_log, get_day_timeline
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   ├── 001_initial.sql   # snapshots + app_state tables
│   │   │   │   └── 002_projects.sql  # placeholder — linked_project already in snapshots
│   │   │   └── setup.rs              # DB init at correct path, migration runner
│   │   └── hotkey.rs                 # Global shortcut registration, Accessibility check
│   ├── icons/                        # Tauri auto-generated app icons
│   ├── Cargo.toml
│   ├── tauri.conf.json               # Window configs: main + overlay; capabilities
│   └── capabilities/
│       └── default.json              # Tauri v2 permissions (no http, no fs outside app dir)
├── src/
│   ├── main.tsx                      # React entry point → App.tsx (main window)
│   ├── overlay.tsx                   # React entry point → OverlayApp.tsx
│   ├── App.tsx                       # Main window: view router, resume card auto-trigger
│   ├── OverlayApp.tsx                # Overlay: SnapshotForm only, Escape to dismiss
│   ├── components/
│   │   ├── SnapshotForm.tsx          # 4-required-field form; used in both windows
│   │   ├── ResumeCard.tsx            # Context restoration display with "Mark Resumed" CTA
│   │   ├── SnapshotHistory.tsx       # Paginated list of past snapshots, expand to see detail
│   │   ├── InterruptionLog.tsx       # Table: date, task, interruption type, time away
│   │   ├── DayTimeline.tsx           # CSS horizontal timeline, 9am–7pm axis
│   │   └── EnergyPicker.tsx          # 🔴🟡🟢 three-button selector
│   ├── hooks/
│   │   ├── useSnapshot.ts            # invoke wrappers: saveSnapshot, getLatestSnapshot, getSnapshots
│   │   └── useResume.ts              # getResumeCard, markResumed, is_stale detection (>900s)
│   ├── store/
│   │   └── appStore.ts               # Zustand: activeView, lastSnapshot, overlayOpen
│   ├── types/
│   │   └── index.ts                  # All shared interfaces (see Data Model section)
│   └── lib/
│       └── time.ts                   # Duration formatting: "47 min ago", "2h 13m away"
├── public/
│   ├── overlay.html                  # Separate HTML entry for overlay WebviewWindow
│   └── tray-icon.png                 # 16×16 template image (black, transparent bg)
├── package.json
├── tsconfig.json
├── vite.config.ts                    # Two entry points: main (index.html) + overlay (overlay.html)
├── tailwind.config.js
├── CLAUDE.md
└── IMPLEMENTATION-ROADMAP.md
```

### Data Model

```sql
-- src-tauri/src/db/migrations/001_initial.sql

CREATE TABLE snapshots (
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
);

CREATE INDEX idx_snapshots_created ON snapshots(created_at DESC);
CREATE INDEX idx_snapshots_resumed  ON snapshots(resumed_at);
CREATE INDEX idx_snapshots_date     ON snapshots(date(created_at));

CREATE TABLE app_state (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Keys used: 'onboarding_complete', 'accessibility_granted', 'last_hotkey_ts'
```

### Type Definitions

```typescript
// src/types/index.ts

export type EnergyState = 'drained' | 'okay' | 'focused'
export type InterruptionType = 'meeting' | 'slack' | 'personal' | 'other'
export type AppView = 'resume' | 'snapshot' | 'history' | 'log' | 'timeline'

export interface Snapshot {
  id: number
  current_task: string
  progress_note: string
  next_step: string
  energy_state: EnergyState
  interruption_type: InterruptionType | null
  interruption_note: string | null
  linked_project: string | null
  open_questions: string | null
  created_at: string // ISO datetime from SQLite
  resumed_at: string | null
  resume_duration_seconds: number | null
}

export interface SnapshotFormData {
  current_task: string
  progress_note: string
  next_step: string
  energy_state: EnergyState
  interruption_type?: InterruptionType
  interruption_note?: string
  linked_project?: string
  open_questions?: string
}

export interface ResumeCard {
  snapshot: Snapshot
  away_duration_seconds: number
  is_stale: boolean // true if away > 900 seconds (15 min)
}

export interface DayTimelineEntry {
  snapshot: Snapshot
  gap_before_seconds: number | null
}

export interface InterruptionLogEntry {
  snapshot: Snapshot
  time_away_seconds: number | null
  interruption_display: string // e.g. "Slack · 47 min"
}
```

### Rust Command Signatures

```rust
// All commands registered via tauri-specta collect_commands![] in bindings.rs
// DB access: app.state::<SqlitePool>() via AppHandle (sqlx, not tauri-plugin-sql)
// All integers are i32 (specta rejects i64 for TypeScript export)

// snapshot_cmd.rs
#[tauri::command] async fn save_snapshot(app: AppHandle, data: SnapshotInput) -> Result<i32, String>
#[tauri::command] async fn get_latest_snapshot(app: AppHandle) -> Result<Option<Snapshot>, String>
#[tauri::command] async fn get_snapshots(app: AppHandle, limit: i32, offset: i32) -> Result<Vec<Snapshot>, String>

// resume_cmd.rs
#[tauri::command] async fn get_resume_card(app: AppHandle) -> Result<Option<ResumeCard>, String>
#[tauri::command] async fn mark_resumed(app: AppHandle, id: i32) -> Result<(), String>

// log_cmd.rs
#[tauri::command] async fn get_interruption_log(app: AppHandle, date: Option<String>) -> Result<Vec<InterruptionLogEntry>, String>
#[tauri::command] async fn get_day_timeline(app: AppHandle, date: String) -> Result<Vec<DayTimelineEntry>, String>

// hotkey.rs (Accessibility spike)
#[tauri::command] fn check_accessibility() -> bool
```

### Dependencies

```bash
# Scaffolded from dannysmith/tauri-template (React 19, Tailwind v4, Zustand v5)
# Includes: tauri-specta, tauri-nspanel, global-shortcut, shadcn/ui, vitest

# Additional frontend dependencies
npm install date-fns

# Key Cargo.toml dependencies (see Cargo.toml for full list):
# sqlx = { version = "0.8", features = ["sqlite", "runtime-tokio"] }  # NOT tauri-plugin-sql
# tauri-plugin-global-shortcut = "2"
# specta + tauri-specta  # type-safe Rust→TS command bridge
# tauri-nspanel  # macOS NSPanel for overlay window
```

---

## Scope Boundaries

**In scope (v1):**

- Snapshot capture via global hotkey overlay, menu bar, and main window
- Resume card with auto-show on app focus (>15 min away from unresumed snapshot)
- Snapshot history (last 100, paginated 30 at a time)
- Interruption log with "time lost" aggregate
- Day timeline (CSS-based, no D3)
- JSON export to Downloads
- Onboarding flow (Accessibility permission, first snapshot, hotkey confirm)
- 5 keyboard shortcuts in main window: N / R / H / L / T

**Out of scope (never):**

- Cloud sync, accounts, telemetry
- Windows / Linux support
- Obsidian / Notion integration
- Auto-capture (reading window titles, clipboard, etc.)

**Deferred (v2+):**

- Hotkey customization UI
- Project-linked snapshot grouping and filtering
- Weekly pattern reports ("You lose most time to Slack on Tuesdays")
- Notification on return ("You've been away 47 min — ready to resume?")
- JSON import / restore

---

## Security & Credentials

- No credentials. Zero external API calls. Zero accounts.
- All data lives at `~/Library/Application Support/interruption-resume-studio/irs.db`
- Network blocked at Tauri capabilities level: `"http": { "scope": { "allow": [] } }`
- Filesystem access restricted to app support dir only in `capabilities/default.json`
- Export JSON carries header comment: `// Interruption Resume Studio export — contains work context, handle accordingly`
- Accessibility permission required for global hotkey (standard macOS pattern, user grants explicitly)

---

## Phase 0: Scaffold + DB (Days 1–3)

**Objective:** Tauri 2.0 project boots on M4 Pro; SQLite initializes at correct path with full schema; all Rust commands stubbed with correct signatures; Vite configured with dual entry points.

**Tasks:**

1. Run `npm create tauri-app@latest interruption-resume-studio -- --template react-ts`, verify `npm run tauri dev` opens a window without errors.
   **Acceptance:** Window renders default Tauri template at runtime; no console errors; `cargo build` completes clean.

2. Add `tauri-plugin-sql` and `tauri-plugin-global-shortcut` to `Cargo.toml` and register in `main.rs`; add capabilities to `capabilities/default.json`; block all HTTP in capabilities.
   **Acceptance:** `cargo build` succeeds with plugins linked; `tauri.conf.json` capabilities includes sql and global-shortcut; no HTTP capability present.

3. Implement `db/setup.rs` — initialize DB at `~/Library/Application Support/interruption-resume-studio/irs.db`, run `001_initial.sql` migration on first launch, skip if tables already exist.
   **Acceptance:** `sqlite3 ~/Library/Application\ Support/interruption-resume-studio/irs.db ".schema"` shows `snapshots` and `app_state` tables with all columns after first launch.

4. Stub all 7 Rust commands in their respective files (`snapshot_cmd.rs`, `resume_cmd.rs`, `log_cmd.rs`) with correct signatures and `todo!()` bodies; register all in `main.rs` invoke handler.
   **Acceptance:** `cargo build` succeeds; calling any stubbed command from DevTools `invoke('save_snapshot', {...})` returns a Rust panic error (not "command not found").

5. Configure `vite.config.ts` with two entry points: `index.html` → main window, `public/overlay.html` → overlay. Add `overlay.html` to `public/`. Create `src/overlay.tsx` with placeholder `<div>Overlay</div>`.
   **Acceptance:** `npm run build` produces two JS bundles without error; no TypeScript errors in `src/`.

**Verification checklist:**

- [ ] `sqlite3 ~/Library/Application\ Support/interruption-resume-studio/irs.db ".schema"` → shows both tables with correct columns
- [ ] `npm run tauri dev` → window opens, no console errors
- [ ] `cargo build` → 0 errors, 0 warnings (excluding `todo!()` unreachable warnings)
- [ ] `npm run build` → succeeds, two JS output bundles present in `dist/`

**Risks:**

- `tauri-plugin-sql` v2 API differences from v1 docs → Pin to `tauri-plugin-sql = "2.x"`, check official Tauri v2 migration guide before writing any queries → Fallback: serde_json + flat JSON files if plugin is fundamentally broken on M4
- Vite dual-entry config not documented clearly → Reference Vite `build.rollupOptions.input` multi-page example → Fallback: serve overlay as a route in the main window temporarily

---

## Phase 1: Main Window + Snapshot Form + Resume Card (Days 3–7)

**Objective:** Full working core loop in the main app window — save a snapshot, quit, relaunch, see resume card automatically.

**Tasks:**

1. Implement `save_snapshot` Rust command fully — insert row into `snapshots`, return new `id`.
   **Acceptance:** `invoke('save_snapshot', { current_task: "test", progress_note: "test", next_step: "test", energy_state: "focused" })` returns an integer ID; row appears in `SELECT * FROM snapshots;`.

2. Build `src/types/index.ts` with all interfaces from the Data Model section above. Build `src/hooks/useSnapshot.ts` wrapping `invoke` calls with correct TypeScript types.
   **Acceptance:** `tsc --noEmit` passes with 0 errors.

3. Build `EnergyPicker.tsx` — three buttons (`🔴 Drained`, `🟡 Okay`, `🟢 Focused`), single-select, highlights active state with colored ring.
   **Acceptance:** Clicking each button updates selected state visually; value passed to parent onChange.

4. Build `SnapshotForm.tsx` — fields: `current_task` (textarea), `progress_note` (textarea), `next_step` (textarea), `energy_state` (EnergyPicker), plus collapsible optional section (`interruption_type` select, `interruption_note` textarea, `linked_project` text, `open_questions` textarea). Tab key navigates all required fields in order. Enter in last required field submits.
   **Acceptance:** Form submits with all 4 required fields filled → toast "Context saved ✓" → row in SQLite with correct values. Tab navigation works without mouse. Optional section toggles open/closed.

5. Implement `get_resume_card` Rust command — query latest unresumed snapshot; calculate `away_duration_seconds` as `(now - created_at)`; set `is_stale = away_duration_seconds > 900`.
   **Acceptance:** After saving a snapshot, manually set `created_at` 20 min back in SQLite (`UPDATE snapshots SET created_at = datetime('now', '-20 minutes') WHERE id = 1`), call `invoke('get_resume_card')` → returns `ResumeCard` with `is_stale: true` and `away_duration_seconds` ≈ 1200.

6. Build `ResumeCard.tsx` — displays: task, progress note, next step, energy state badge, "Away for X min" duration string. "Mark Resumed" button calls `mark_resumed`. Shows stale warning banner if `is_stale`. Formats duration via `src/lib/time.ts`.
   **Acceptance:** Card renders all fields correctly. "Mark Resumed" sets `resumed_at` and `resume_duration_seconds` in DB (verify via sqlite3). Card hides "Mark Resumed" if `resumed_at` already set.

7. Implement auto-show logic in `App.tsx` — on mount and on window focus event, call `get_resume_card`; if result is non-null and `is_stale`, set active view to `resume`.
   **Acceptance:** Save snapshot → manually back-date `created_at` → quit app → relaunch → resume card shown as first view without any user action.

8. Build `SnapshotHistory.tsx` — list of last 30 snapshots via `get_snapshots(limit: 30, offset: 0)`, each row shows: task (truncated to 60 chars), created_at formatted as "Today 2:34 PM" or "Mar 20 3:12 PM", energy state emoji, resumed/not badge. Click row to expand full detail.
   **Acceptance:** 10+ test snapshots inserted via sqlite3 → history shows in correct descending order → expand/collapse works for each row.

**Verification checklist:**

- [ ] Full save → quit → reopen → resume card flow works end-to-end (manually back-date created_at)
- [ ] Tab key navigates all 4 required fields without touching mouse
- [ ] `SELECT * FROM snapshots ORDER BY created_at DESC LIMIT 1;` shows correct values matching form input
- [ ] `tsc --noEmit` → 0 errors

---

## Phase 2: Global Hotkey + Overlay Window + Menu Bar (Days 7–14)

**Objective:** ⌘+Shift+Space from any app opens overlay in <200ms. Menu bar icon operational. Accessibility onboarding complete.

**Tasks:**

1. Implement Accessibility permission check in `hotkey.rs` — on app start, check `AXIsProcessTrusted()` via `core-graphics` or `accessibility` crate; store result in `app_state` table key `accessibility_granted`; expose as Tauri command `check_accessibility() -> bool`.
   **Acceptance:** With Accessibility denied in System Settings → Privacy → Accessibility, `invoke('check_accessibility')` returns `false`. After granting and relaunching, returns `true`.

2. Build onboarding screen in `App.tsx` — shown on first launch if `app_state.onboarding_complete` is null. Three steps: (1) Accessibility permission with "Open System Settings" deeplink button using `shell.open()`, (2) "Take your first snapshot" CTA, (3) "Test your hotkey" instruction. Each step auto-advances when complete. Store `onboarding_complete = '1'` in `app_state` on finish.
   **Acceptance:** Delete `app_state` row `onboarding_complete` → relaunch → onboarding shown. Complete all 3 steps → stored in DB → relaunch → onboarding not shown.

3. Register global shortcut `CmdOrCtrl+Shift+Space` in `main.rs` using `tauri-plugin-global-shortcut`; handler calls `toggle_overlay` which shows/hides the pre-loaded overlay `WebviewWindow`.
   **Acceptance:** With Accessibility granted, press ⌘+Shift+Space while Terminal is focused → overlay window appears. Press again → overlay hides. Measure with stopwatch × 5 successive presses → all <200ms.

4. Configure overlay `WebviewWindow` in `tauri.conf.json`: `decorations: false`, `always_on_top: true`, `width: 400`, `height: 320`, `visible: false`, `url: "overlay.html"`. Pre-create on app start (invisible); `toggle_overlay` command shows/hides, never creates/destroys.
   **Acceptance:** First hotkey press ≤ second hotkey press in render time (pre-load confirmed). Overlay is frameless with no system title bar. Overlay centers on primary display.

5. Wire `OverlayApp.tsx` — renders `SnapshotForm.tsx` with a thin header ("⏸ Capture Context"). On successful save, close overlay via `invoke('hide_overlay')`. Escape key also hides overlay without saving.
   **Acceptance:** Save from overlay → overlay closes → open main app → new snapshot appears in history. Escape key dismisses with no save (verify row count in DB unchanged).

6. Implement menu bar (system tray) in `main.rs` — icon: `tray-icon.png` (16×16 template image); menu items: "Snapshot Now" (show overlay), "Resume Last" (focus main window, trigger resume view), "Show App" (focus main window), separator, "Quit". Use Tauri `tray::TrayIconBuilder`.
   **Acceptance:** Menu bar icon visible after launch. All 4 items trigger correct behavior. "Quit" closes app and removes tray icon.

**Verification checklist:**

- [ ] ⌘+Shift+Space from Terminal, Safari, and VS Code → overlay appears each time (3/3)
- [ ] Escape dismisses overlay; `SELECT COUNT(*) FROM snapshots;` unchanged
- [ ] Overlay save → main window history shows new snapshot
- [ ] Menu bar "Snapshot Now" → same overlay as hotkey
- [ ] Menu bar "Resume Last" → main window shows resume card for last unresumed snapshot
- [ ] Onboarding: delete DB row → relaunch → shown; complete → relaunch → not shown

---

## Phase 3: Interruption Log + Day Timeline + Polish (Days 14–21)

**Objective:** Tool is a complete daily driver — log with time-lost metrics, visual timeline, keyboard shortcuts, JSON export.

**Tasks:**

1. Implement `get_interruption_log` Rust command — query snapshots for a given date (default: today); return `Vec<InterruptionLogEntry>` sorted desc; include aggregate: `total_interruptions: i64`, `total_time_lost_seconds: i64` (sum of `resume_duration_seconds` for resumed snapshots only).
   **Acceptance:** 5+ test snapshots with varied types → log returns correct count and sum (`SELECT SUM(resume_duration_seconds) FROM snapshots WHERE date(created_at) = date('now') AND resumed_at IS NOT NULL` matches `total_time_lost_seconds`).

2. Build `InterruptionLog.tsx` — table columns: Time, Task (60 char truncated), Interrupted By, Time Away, Status (resumed/active). Header row: "Today: 3 interruptions · 1h 23m lost." Date picker (simple `<input type="date">`) to switch between days. Rows for active (not yet resumed) snapshots show "Still active" in Time Away.
   **Acceptance:** Date switch works; today's aggregate matches SQL query above; "Still active" rows display correctly.

3. Implement `get_day_timeline` Rust command — return snapshots for date sorted asc with `gap_before_seconds` (difference between previous snapshot's `resumed_at` and this snapshot's `created_at`; null for first snapshot of day).
   **Acceptance:** 4 test snapshots across 4 hours → all returned in order; `gap_before_seconds` values match manual calculation.

4. Build `DayTimeline.tsx` — CSS-only horizontal timeline, 9am–7pm axis (600px wide), snapshot blocks positioned by `created_at` offset from 9am. Block width = `resume_duration_seconds` scaled to axis (or 30px min for active/unknown). Block color = energy state color. Hover shows tooltip: task + duration. Gap periods shown as lighter gray.
   **Acceptance:** 4 snapshots spanning 4 hours render in correct horizontal positions (verify by checking pixel offset matches time math). Hover tooltip appears. Day picker matches InterruptionLog date picker.

5. Add keyboard shortcuts in `App.tsx` using `useEffect` + `keydown` listener — only active when no text input is focused: `N` → new snapshot view, `R` → resume card, `H` → history, `L` → log, `T` → timeline. Display shortcuts in nav as `[N]`, `[R]`, etc.
   **Acceptance:** All 5 shortcuts trigger correct view change from main window. Typing in a textarea does NOT trigger shortcuts. Nav labels show keyboard hint.

6. Implement JSON export in main window — "Export" button (or `File` menu) calls Tauri `dialog.save()` to pick destination, defaults to `~/Downloads/irs-export-YYYY-MM-DD.json`, writes all snapshots as JSON array with header comment.
   **Acceptance:** Export produces valid JSON file (verify with `jq . irs-export-*.json`). File includes all rows from `SELECT * FROM snapshots`. Header comment present.

7. Final polish pass: empty states for all 4 views (history, log, timeline, resume card with no data), consistent dark theme (`bg-gray-900` base, `bg-gray-800` cards), all toasts dismiss after 3 seconds, overlay Escape key always works even if form has content.
   **Acceptance:** Fresh DB install (delete `irs.db`) → all views show meaningful empty states, not blank screens. All toasts auto-dismiss.

**Verification checklist:**

- [ ] `jq . ~/Downloads/irs-export-*.json` → valid JSON, correct row count matches `SELECT COUNT(*) FROM snapshots`
- [ ] Day timeline with 4 snapshots spanning 4h renders all blocks in correct positions
- [ ] Interruption log "time lost" total matches `SELECT SUM(resume_duration_seconds) ...` SQL query
- [ ] All 5 keyboard shortcuts work; typing in textarea does not trigger them
- [ ] Fresh DB (delete irs.db) → relaunch → all views show non-blank empty states

---

## Build Sequence Note

**Spike hotkey + Accessibility first.** Before investing time in Phase 1 UI, complete Phase 0 steps 1–4 AND Phase 2 step 1 (Accessibility check) as a standalone spike. If `AXIsProcessTrusted()` works cleanly on M4 Pro under Tauri 2 sandbox, proceed with confidence. If it doesn't, you'll know before you've built anything else and can adjust the approach (entitlements, sandbox exceptions) without rework cost.
