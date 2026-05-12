# Interruption Resume Studio — Portfolio Disposition

**Status:** Release Frozen — Tauri 2 + Rust + React TypeScript +
`tauri-nspanel` global-overlay context-capture app at **v1.0.0** on
`origin/main`, with .dmg distribution build dependencies,
reverse-DNS bundle identifier fix, **CSP unsafe-inline removal**
(stricter security posture than other Tauri cluster members), and
full OSS scaffolding wave. Joins signing cluster as **member #25**.
Note: significant **local uncommitted refactor in flight** (~50+
files modified) — disposition documents `origin/main` (the canonical
v1.0.0 ship), not the local in-flight state.

> Disposition uses strict `origin/main` verification.
> Operator has substantial uncommitted work; document for follow-up.

---

## Verification posture

Only `origin` (`saagpatel/InterruptionResumeStudio`). Clean
migration state.

`origin/main`:

- Tip: `c8c74c8` chore: update build dependencies for .dmg
  distribution
- v1.0.0 release closeout cadence (matches APIReverse / NetworkDecoder
  signature, with extra security hardening):
  - `c8c74c8` .dmg distribution build deps
  - `0bb6678` **fix(build): use reverse-DNS bundle identifier**
    (standard Apple convention)
  - `651a8b1` chore: bump version to 1.0.0
  - `62fe449` **fix(security): remove unsafe-inline from script-src
    CSP directive** (stricter than CSP-with-unsafe-inline)
  - `e1b47d2` initial CHANGELOG + scaffolding wave
- Default branch: `main`

**Local working-tree state (substantial)**: 50+ files modified
across `.github/`, `CLAUDE.md`, `README.md`, `SECURITY.md`,
`overlay.html`, `package.json`/`package-lock.json`, `src-tauri/`
(capabilities, commands, lib.rs, tauri config for all platforms),
all React components and hooks, lib utilities, store, types, test
setup. Untracked: `.claude/skills/`, `.codex/`, `AGENTS.md`,
`pnpm-lock.yaml`. Stashed as `r15-irs-stash`. Operator should
inspect before discarding — this is a major refactor or feature
work in flight, not minor drift.

---

## Current state in one paragraph

Interruption Resume Studio is a Tauri 2 desktop app for capturing
cognitive snapshots at interruption time. Workflow: a global
shortcut (`Cmd+Shift+I`) opens a `tauri-nspanel`-backed overlay
window from any app; user fills a structured form (current task /
progress / next step / energy / open questions) in under 30
seconds; on return, a Resume Card surfaces the snapshot so re-entry
is one-glance. The app also tracks interruption patterns: day
timeline, interruption log with time-lost estimates, weekly
insights by interruption type / energy / hour / day. Per memory:
Phases 0-4 complete. v1.0.0 on origin/main with `.dmg` build deps,
reverse-DNS bundle ID fix, and CSP unsafe-inline removed
(stricter security than baseline Tauri CSP cluster sibling).

---

## Why "Release Frozen" — 25th signing cluster member

Standard Tauri 2 v1.0 signature with two extras worth noting:

| Standard signature | IRS extras |
|---|---|
| v1.0.0 bump + .dmg deps + CSP + baseline tests | ✓ (CSP + .dmg) |
| Stale "WIP" README badge | **No — README is clean** |
| Single capability descriptor (default) | **Multi-capability (default / desktop / overlay) — appropriate for nspanel overlay window** |
| CSP with `unsafe-inline` | **`unsafe-inline` removed** (security hardening; pattern other Tauri cluster members may want to adopt) |

The CSP hardening is a category-improvement worth flagging for
sibling Tauri cluster members.

---

## Cluster taxonomy update

| Cluster | Count |
|---|---|
| **Signing (Apple desktop)** | **25** |

---

## Unblock trigger (operator)

1. **Decide disposition of substantial local in-flight work**
   (stashed `r15-irs-stash`, 50+ files). Either commit + push (and
   potentially cut v1.1), or discard if abandoned.
2. **Apple Developer ID + notarization credentials wired** (standard
   signing cluster prerequisite).
3. **macOS Accessibility / Screen Recording permissions** — global
   shortcuts and nspanel overlay typically require Accessibility
   grant; document install flow.
4. **`tauri-nspanel` macOS-only?** — verify if cross-platform builds
   (Linux, Windows) are supported or if the app is macOS-only
   (`tauri.linux.conf.json` + `tauri.windows.conf.json` exist in
   the working tree — suggests cross-platform intent).
5. **Verify signed/notarized DMG** opens cleanly.

Estimated operator time: ~2-3 hours once credentials + local-state
decision made.

---

## Portfolio operating system instructions

| Aspect | Posture |
|---|---|
| Portfolio status | `Release Frozen` |
| Distribution channel | **DMG via Apple Developer ID** (cross-platform possible) |
| Version | **v1.0.0** |
| Review cadence | Suspend overdue counting |
| Resurface conditions | (a) Local in-flight work disposition, (b) Apple signing credentials, (c) macOS Accessibility permission UX, (d) v1.1 from local work, (e) tauri-nspanel API change |
| Co-batch with | Signing cluster — **now 25 repos** |
| Special concern | **Substantial uncommitted local work.** Operator decision required before further development. |
| Special concern | **CSP unsafe-inline removed** — pattern other Tauri cluster members should adopt. |
| Special concern | **macOS Accessibility grant** for global shortcuts + nspanel overlay. |

---

## Reactivation procedure

1. Verify branch tracking.
2. **Review stash `r15-irs-stash` FIRST** — 50+ file refactor /
   feature work; operator needs to decide disposition.
3. Untracked: `.claude/skills/`, `.codex/`, `AGENTS.md`,
   `pnpm-lock.yaml`. The pnpm vs npm switch is operator
   experimentation (package-lock.json is on canonical main).
4. Test `tauri-nspanel` overlay behavior on macOS.
5. Run `cargo test` + `npm test`.

---

## Last known reference

| Field | Value |
|---|---|
| `origin/main` tip | `c8c74c8` chore: update build dependencies for .dmg distribution |
| Default branch | `main` |
| Build system | Tauri 2 + Rust + React + TypeScript + tauri-nspanel |
| Version | **v1.0.0** |
| Phases shipped | 0-4 per memory |
| Notable | **CSP unsafe-inline removed** (`62fe449`) — stricter than baseline Tauri CSP; pattern worth adopting. **Reverse-DNS bundle ID fix** (`0bb6678`). **`tauri-nspanel` for overlay window**. |
| Local state | **Substantial uncommitted refactor** (50+ files modified) — stashed as `r15-irs-stash` |
| Migration state | No `legacy-origin` remote |
| Distinguishing feature | **25th signing cluster member.** First to remove CSP `unsafe-inline` (stricter security than cluster baseline). nspanel overlay sub-pattern shared with GlassLayer. |
