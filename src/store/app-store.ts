import { create } from "zustand";
import { devtools } from "zustand/middleware";

type AppView =
	| "resume"
	| "snapshot"
	| "history"
	| "log"
	| "timeline"
	| "insights"
	| "settings";

interface AppState {
	activeView: AppView;
	overlayOpen: boolean;

	setActiveView: (view: AppView) => void;
	setOverlayOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
	devtools(
		(set) => ({
			activeView: "resume",
			overlayOpen: false,

			setActiveView: (view) =>
				set({ activeView: view }, undefined, "setActiveView"),

			setOverlayOpen: (open) =>
				set({ overlayOpen: open }, undefined, "setOverlayOpen"),
		}),
		{ name: "app-store" },
	),
);
