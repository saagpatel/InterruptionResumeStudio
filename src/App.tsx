import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
	isPermissionGranted,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import {
	BarChart3,
	Clock,
	GanttChart,
	List,
	PauseCircle,
	Play,
	Settings2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { DayTimeline } from "./components/DayTimeline";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Insights } from "./components/Insights";
import { InterruptionLog } from "./components/InterruptionLog";
import { Onboarding } from "./components/Onboarding";
import { ResumeCard } from "./components/ResumeCard";
import { Settings } from "./components/Settings";
import { SnapshotForm } from "./components/SnapshotForm";
import { SnapshotHistory } from "./components/SnapshotHistory";
import { ThemeProvider } from "./components/ThemeProvider";
import { Skeleton } from "./components/ui/skeleton";
import { Toaster } from "./components/ui/sonner";
import { useAppState } from "./hooks/use-app-state";
import { commands } from "./lib/bindings";
import { logger } from "./lib/logger";
import { formatDuration } from "./lib/time";
import { cn } from "./lib/utils";
import { useAppStore } from "./store/app-store";
import type { AppView } from "./types";
import "./App.css";

const NAV_ITEMS: {
	view: AppView;
	label: string;
	icon: typeof Play;
	shortcut: string;
}[] = [
	{ view: "resume", label: "Resume", icon: Play, shortcut: "R" },
	{ view: "snapshot", label: "Snapshot", icon: PauseCircle, shortcut: "N" },
	{ view: "history", label: "History", icon: Clock, shortcut: "H" },
	{ view: "log", label: "Log", icon: List, shortcut: "L" },
	{ view: "timeline", label: "Timeline", icon: GanttChart, shortcut: "T" },
	{ view: "insights", label: "Insights", icon: BarChart3, shortcut: "I" },
	{ view: "settings", label: "Settings", icon: Settings2, shortcut: "S" },
];

function AppContent() {
	const { data: onboardingComplete, isLoading: onboardingLoading } =
		useAppState("onboarding_complete");
	const activeView = useAppStore((s) => s.activeView);
	const setActiveView = useAppStore((s) => s.setActiveView);
	const queryClient = useQueryClient();
	const lastNotifiedRef = useRef<number | null>(null);

	// Auto-resume: check for stale unresumed snapshots on mount + window focus
	useEffect(() => {
		const checkResume = async () => {
			try {
				const result = await commands.getResumeCard();
				if (result.status === "ok" && result.data?.is_stale) {
					setActiveView("resume");

					// Send notification (spam guard: max once per 5 min)
					const now = Date.now();
					if (
						!lastNotifiedRef.current ||
						now - lastNotifiedRef.current > 300_000
					) {
						lastNotifiedRef.current = now;
						const permitted = await isPermissionGranted();
						if (permitted) {
							sendNotification({
								title: "Ready to resume?",
								body: `You've been away for ${formatDuration(result.data.away_duration_seconds)} — your context is saved.`,
							});
						}
					}
				}
			} catch (err) {
				logger.warn("Failed to check resume card", { err });
			}
		};

		checkResume();

		const unlisten = getCurrentWindow().onFocusChanged(
			({ payload: focused }) => {
				if (focused) checkResume();
			},
		);

		return () => {
			unlisten.then((fn) => fn());
		};
	}, [setActiveView]);

	// Listen for tray "navigate" events
	useEffect(() => {
		const unlisten = listen<string>("navigate", (event) => {
			if (event.payload === "resume") setActiveView("resume");
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [setActiveView]);

	// Listen for overlay "snapshot-saved" events to invalidate cache
	useEffect(() => {
		const unlisten = listen("snapshot-saved", () => {
			queryClient.invalidateQueries({ queryKey: ["snapshots"] });
			queryClient.invalidateQueries({ queryKey: ["resume-card"] });
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [queryClient]);

	// Keyboard shortcuts — only when no input/textarea is focused
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}

			switch (e.key.toLowerCase()) {
				case "n":
					setActiveView("snapshot");
					break;
				case "r":
					setActiveView("resume");
					break;
				case "h":
					setActiveView("history");
					break;
				case "l":
					setActiveView("log");
					break;
				case "t":
					setActiveView("timeline");
					break;
				case "i":
					setActiveView("insights");
					break;
				case "s":
					setActiveView("settings");
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [setActiveView]);

	if (onboardingLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="space-y-4 w-64">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
				</div>
			</div>
		);
	}

	if (!onboardingComplete) {
		return <Onboarding onComplete={() => {}} />;
	}

	return (
		<div className="flex h-screen">
			{/* Sidebar */}
			<nav className="flex w-48 shrink-0 flex-col border-r bg-muted/30 p-3 gap-1">
				<div className="mb-4 px-2 pt-1">
					<h1 className="text-sm font-bold tracking-tight">IRS</h1>
					<p className="text-xs text-muted-foreground">Context Capture</p>
				</div>
				{NAV_ITEMS.map((item) => {
					const Icon = item.icon;
					return (
						<button
							key={item.view}
							type="button"
							onClick={() => setActiveView(item.view)}
							className={cn(
								"flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
								activeView === item.view
									? "bg-accent text-accent-foreground font-medium"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							<Icon className="size-4" />
							{item.label}
							<span className="ml-auto text-xs opacity-50">
								{item.shortcut}
							</span>
						</button>
					);
				})}
			</nav>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto p-8">
				{activeView === "resume" && <ResumeCard />}
				{activeView === "snapshot" && (
					<SnapshotForm onSaved={() => setActiveView("history")} />
				)}
				{activeView === "history" && <SnapshotHistory />}
				{activeView === "log" && <InterruptionLog />}
				{activeView === "timeline" && <DayTimeline />}
				{activeView === "insights" && <Insights />}
				{activeView === "settings" && <Settings />}
			</main>
		</div>
	);
}

function App() {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<AppContent />
				<Toaster />
			</ThemeProvider>
		</ErrorBoundary>
	);
}

export default App;
