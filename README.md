![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri-2.x-ffc131?logo=tauri&logoColor=white) ![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white) ![SQLite](https://img.shields.io/badge/SQLite-sqlx-003b57?logo=sqlite&logoColor=white) ![License](https://img.shields.io/badge/license-unlicensed-lightgrey)

# Interruption Resume Studio

Capture cognitive work context during interruptions, resume with full context. Tauri 2 + React + TypeScript + SQLite.

## What It Does

Interruption Resume Studio is a native desktop app that captures a structured snapshot of what you were doing at the moment you get interrupted — the current task, progress so far, your next planned step, energy state, and any open questions. When you return, a **Resume Card** surfaces the full context so you can re-enter flow without having to reconstruct it from scratch.

The app also tracks interruption patterns over time: a day timeline shows when snapshots were captured and the gaps between them, an interruption log quantifies time lost per session, and a weekly insights view breaks down interruptions by type (meeting, Slack, personal, other), energy state, hour of day, and day of week. A global keyboard shortcut opens a lightweight overlay window for capturing snapshots without leaving your current app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (`tauri-plugin-global-shortcut`, `tauri-plugin-notification`, `tauri-nspanel`) |
| Frontend | React 19, TypeScript 5, Tailwind CSS 4, Radix UI, Zustand, TanStack Query |
| Backend | Rust 1.82+, SQLite via `sqlx` |
| Type safety | `specta` + `tauri-specta` for generated TypeScript bindings |
| Testing | Vitest, Testing Library |

## Prerequisites

- Node.js 20+
- Rust 1.82+ (via `rustup`)
- Tauri CLI v2 (`cargo install tauri-cli --version "^2"`)
- macOS 10.15+ (primary target; Windows/Linux configs included)

## Getting Started

```bash
# Install frontend dependencies
npm install

# Start in development mode (Vite dev server + Tauri)
npm run tauri:dev

# Build a release binary
npm run tauri:build
```

## Project Structure

```
InterruptionResumeStudio/
├── src/                        # React frontend
│   ├── components/             # UI components (ResumeCard, SnapshotForm, DayTimeline, Insights, …)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Tauri bindings, logger, time utils
│   ├── store/                  # Zustand app store
│   ├── types/                  # Shared TypeScript types
│   ├── App.tsx                 # Root component + nav
│   └── overlay-main.tsx        # Entry point for the global-shortcut overlay window
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── commands/           # Tauri command handlers
│   │   ├── db/                 # SQLite schema + query layer
│   │   ├── types.rs            # Shared types (Snapshot, ResumeCard, WeeklyReport, …)
│   │   ├── bindings.rs         # specta-generated TypeScript bindings export
│   │   └── lib.rs / main.rs    # App setup and plugin registration
│   └── tauri.conf.json         # App config (also .linux / .macos / .windows variants)
├── overlay.html                # Separate HTML entry for the overlay window
└── scripts/                    # Release prep and task management scripts
```

## Key Views

| View | Shortcut | Purpose |
|------|----------|---------|
| Resume | `R` | Resume card for the most recent unresumed snapshot |
| Snapshot | `N` | Capture a new work context snapshot |
| History | `H` | Browsable list of all past snapshots |
| Log | `L` | Interruption log with time-lost totals |
| Timeline | `T` | Day timeline with gap visualization |
| Insights | `I` | Weekly analytics by type, energy, hour, and day |
| Settings | `S` | Theme, overlay shortcut, data import/export |

<!-- TODO: Add screenshot -->

## Development

```bash
# Run frontend tests
npm run test

# Run Rust tests
npm run rust:test

# Run all checks (typecheck, lint, format, clippy, tests)
npm run check:all

# Auto-fix lint + format issues
npm run fix:all

# Generate Rust → TypeScript type bindings
npm run rust:bindings
```

## License

No license file is present in this repository.
