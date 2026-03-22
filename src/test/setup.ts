import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock matchMedia for tests
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock Tauri APIs for tests
vi.mock("@tauri-apps/api/event", () => ({
	listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
	save: vi.fn().mockResolvedValue(null),
}));

vi.mock("@tauri-apps/api/window", () => ({
	getCurrentWindow: vi.fn().mockReturnValue({
		onFocusChanged: vi.fn().mockResolvedValue(() => {}),
	}),
}));

// Mock typed Tauri bindings (tauri-specta generated)
vi.mock("@/lib/bindings", () => ({
	commands: {
		loadPreferences: vi.fn().mockResolvedValue({
			status: "ok",
			data: { theme: "system", overlay_shortcut: null },
		}),
		savePreferences: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		showOverlay: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		dismissOverlay: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		toggleOverlay: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		getDefaultOverlayShortcut: vi
			.fn()
			.mockResolvedValue("CommandOrControl+Shift+Space"),
		updateOverlayShortcut: vi
			.fn()
			.mockResolvedValue({ status: "ok", data: null }),
		saveSnapshot: vi.fn().mockResolvedValue({ status: "ok", data: 1 }),
		getLatestSnapshot: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		getSnapshots: vi.fn().mockResolvedValue({ status: "ok", data: [] }),
		getResumeCard: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		markResumed: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		getInterruptionLog: vi.fn().mockResolvedValue({
			status: "ok",
			data: { entries: [], total_interruptions: 0, total_time_lost_seconds: 0 },
		}),
		getDayTimeline: vi.fn().mockResolvedValue({ status: "ok", data: [] }),
		exportSnapshots: vi.fn().mockResolvedValue({ status: "ok", data: 0 }),
		checkAccessibility: vi.fn().mockResolvedValue(true),
		openAccessibilitySettings: vi
			.fn()
			.mockResolvedValue({ status: "ok", data: null }),
		getAppState: vi.fn().mockResolvedValue({ status: "ok", data: "1" }),
		setAppState: vi.fn().mockResolvedValue({ status: "ok", data: null }),
		getProjects: vi.fn().mockResolvedValue({ status: "ok", data: [] }),
		getWeeklyReport: vi.fn().mockResolvedValue({
			status: "ok",
			data: {
				week_start: "2026-03-16",
				week_end: "2026-03-22",
				total_interruptions: 0,
				total_time_lost_seconds: 0,
				avg_gap_seconds: 0,
				most_common_type: null,
				by_day: [],
				by_type: [],
				by_energy: [],
				by_hour: [],
			},
		}),
	},
}));

vi.mock("@tauri-apps/plugin-notification", () => ({
	isPermissionGranted: vi.fn().mockResolvedValue(true),
	requestPermission: vi.fn().mockResolvedValue("granted"),
	sendNotification: vi.fn(),
}));
