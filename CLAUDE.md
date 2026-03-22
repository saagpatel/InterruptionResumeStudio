# Interruption Resume Studio

## Overview
A native macOS desktop app (Tauri 2.0 + React + TypeScript + SQLite) that captures cognitive work context via global hotkey overlay, menu bar, or manual entry — and surfaces a structured resume card on return. No cloud, no accounts, 100% local. Built for the user's own daily deep-work protection.

## Tech Stack
- Rust / Tauri: 2.x stable
- Frontend: React 19.x (hooks only, no class components)
- Language: TypeScript 5.x (strict mode)
- Styling: Tailwind CSS 4.x
- Database: SQLite via sqlx 0.8.x (Rust-side, not tauri-plugin-sql)
- Type-safe bridge: tauri-specta (auto-generated TS bindings from Rust commands)
- State: Zustand 5.x
- Date/Time: date-fns 3.x
- Icons: Lucide React 0.561.x
- Hotkey: tauri-plugin-global-shortcut 2.x
- Overlay: tauri-nspanel (macOS NSPanel for floating panel behavior)
- Scaffolded from: dannysmith/tauri-template

## Development Conventions
- TypeScript strict mode — no `any` types, no `!` non-null assertions without comment
- kebab-case for files, PascalCase for React components, camelCase for variables
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- All Tauri `invoke` calls wrapped in typed async functions in `src/hooks/`
- No network calls anywhere — enforce via Tauri capabilities config

## Current Phase
**Phase 0: Scaffold + DB**
See IMPLEMENTATION-ROADMAP.md for full phase details and acceptance criteria.

## Key Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Overlay vs full window on hotkey | Floating `WebviewWindow` (400×320, no titlebar, pre-loaded) | <200ms appear time; full window focus too jarring mid-deep-work |
| Global hotkey | `CmdOrCtrl+Shift+Space` | Avoids conflicts with common app shortcuts |
| Resume card trigger | Auto-show on app focus if unresumed snapshot >15 min old | Zero friction; no manual "resume" action needed |
| Multiple trigger modes | Hotkey + menu bar + manual (all v1) | All route through the same `save_snapshot` Rust command |
| SQLite path | `~/Library/Application Support/interruption-resume-studio/irs.db` | Standard macOS app support dir |
| Energy state options | `drained / okay / focused` (3-point enum) | Fast to select; meaningful enough for re-entry context |

## Do NOT
- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md
- Do not use localStorage, sessionStorage, or any browser storage — all persistence is SQLite via Rust commands
- Do not create/destroy the overlay window on each hotkey press — show/hide a pre-loaded WebviewWindow only
- Do not make any network requests — this app is 100% local; add `"http": { "all": false }` to Tauri capabilities
- Do not use class components — React hooks only throughout
- Do not store any user data outside `~/Library/Application Support/interruption-resume-studio/`
