import { emit } from "@tauri-apps/api/event";
import { PauseCircle } from "lucide-react";
import { useEffect } from "react";
import { commands } from "@/lib/bindings";
import { SnapshotForm } from "./SnapshotForm";
import { ThemeProvider } from "./ThemeProvider";

export function OverlayApp() {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				commands.dismissOverlay();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const handleSaved = async () => {
		await emit("snapshot-saved");
		commands.dismissOverlay();
	};

	return (
		<ThemeProvider>
			<div className="flex h-screen flex-col rounded-xl overflow-hidden bg-background/90 backdrop-blur-2xl">
				<div
					className="flex shrink-0 items-center gap-2 px-4 py-2 border-b border-border/50"
					data-tauri-drag-region
				>
					<PauseCircle className="size-4 text-muted-foreground" />
					<span className="text-sm font-semibold">Capture Context</span>
				</div>
				<div className="flex-1 overflow-y-auto px-4 py-3">
					<SnapshotForm onSaved={handleSaved} compact />
				</div>
			</div>
		</ThemeProvider>
	);
}
