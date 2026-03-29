# Interruption Resume Studio

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript)](#) [![Rust](https://img.shields.io/badge/Rust-dea584?style=flat-square&logo=rust)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> The 30 seconds you spend capturing context before you switch tasks is worth more than the 10 minutes you spend reconstructing it afterward.

Interruption Resume Studio is a native desktop app that captures a structured snapshot of your cognitive state the moment you get interrupted — current task, progress, next planned step, energy level, and open questions. When you return, a Resume Card surfaces everything you need to re-enter flow without reconstructing it from scratch. A global shortcut (`Cmd+Shift+I`) opens a lightweight overlay from any app without breaking your current context.

The app also tracks interruption patterns over time: daily timeline, interruption log with time-lost estimates, and weekly insights broken down by interruption type, energy state, hour of day, and day of week.

## Features

- **Snapshot capture** — structured form captures task, progress, next step, energy, and open questions in under 30 seconds
- **Resume Cards** — on return, a card surfaces the full context snapshot so you re-enter flow immediately
- **Global shortcut** — `Cmd+Shift+I` opens an overlay window without leaving your current app
- **Day timeline** — visual timeline of snapshots showing interruption gaps throughout the day
- **Interruption log** — quantified time lost per session
- **Weekly insights** — breakdowns by interruption type (meeting, Slack, personal, other), energy state, hour, and day
- **Native overlay** — uses `tauri-nspanel` for proper fullscreen overlay behavior on macOS

## Quick Start

### Prerequisites

- Node.js 20+
- Rust 1.82+ (`rustup`)
- Tauri system dependencies: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/)

### Installation

```bash
git clone https://github.com/saagpatel/InterruptionResumeStudio
cd InterruptionResumeStudio
npm install
```

### Usage

```bash
# Start in development mode
npm run tauri:dev

# Build release binary
npm run tauri:build
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Tauri 2 (`tauri-plugin-global-shortcut`, `tauri-nspanel`) |
| Frontend | React 19, TypeScript 5, Tailwind CSS 4, Radix UI, Zustand, TanStack Query |
| Backend | Rust 1.82+, SQLite via `sqlx` |
| Type safety | `specta` + `tauri-specta` for generated TypeScript bindings |
| Testing | Vitest, Testing Library |

## Architecture

All snapshot data is stored in a local SQLite database via `sqlx`. The Rust backend handles persistence and pattern aggregation; the React frontend handles capture forms, resume cards, and analytics views. TypeScript bindings are generated from Rust types via `specta`, giving compile-time safety across the bridge. The overlay window is a separate Tauri window using `tauri-nspanel` so it renders above fullscreen apps on macOS.

## License

Unlicensed
