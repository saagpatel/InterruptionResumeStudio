import { useQueryClient } from "@tanstack/react-query";
import { open, save } from "@tauri-apps/plugin-dialog";
import { format } from "date-fns";
import { Download, Keyboard, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePreferences } from "@/hooks/use-preferences";
import { commands } from "@/lib/bindings";

export function Settings() {
	const { data: prefs } = usePreferences();
	const queryClient = useQueryClient();

	const [shortcut, setShortcut] = useState("");
	const [recording, setRecording] = useState(false);
	const [defaultShortcut, setDefaultShortcut] = useState("");

	useEffect(() => {
		commands.getDefaultOverlayShortcut().then(setDefaultShortcut);
	}, []);

	useEffect(() => {
		if (prefs) {
			setShortcut(prefs.overlay_shortcut ?? defaultShortcut);
		}
	}, [prefs, defaultShortcut]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!recording) return;
		e.preventDefault();

		const parts: string[] = [];
		if (e.metaKey || e.ctrlKey) parts.push("CommandOrControl");
		if (e.shiftKey) parts.push("Shift");
		if (e.altKey) parts.push("Alt");

		if (!["Meta", "Control", "Shift", "Alt"].includes(e.key)) {
			parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
		}

		if (parts.length >= 2) {
			setShortcut(parts.join("+"));
			setRecording(false);
		}
	};

	const handleSave = async () => {
		const result = await commands.updateOverlayShortcut(shortcut);
		if (result.status === "ok") {
			await commands.savePreferences({
				theme: prefs?.theme ?? "system",
				overlay_shortcut: shortcut,
			});
			queryClient.invalidateQueries({ queryKey: ["preferences"] });
			toast.success("Shortcut updated");
		} else {
			toast.error(`Failed to update shortcut: ${result.error}`);
		}
	};

	const handleReset = async () => {
		const result = await commands.updateOverlayShortcut(null);
		if (result.status === "ok") {
			await commands.savePreferences({
				theme: prefs?.theme ?? "system",
				overlay_shortcut: null,
			});
			setShortcut(defaultShortcut);
			queryClient.invalidateQueries({ queryKey: ["preferences"] });
			toast.success("Shortcut reset to default");
		}
	};

	const handleExport = async () => {
		const path = await save({
			defaultPath: `irs-export-${format(new Date(), "yyyy-MM-dd")}.json`,
			filters: [{ name: "JSON", extensions: ["json"] }],
		});
		if (!path) return;
		const result = await commands.exportSnapshots(path);
		if (result.status === "ok")
			toast.success(`Exported ${result.data} snapshots`);
		else toast.error(`Export failed: ${result.error}`);
	};

	const handleImport = async () => {
		const path = await open({
			filters: [{ name: "JSON", extensions: ["json"] }],
		});
		if (!path) return;
		const result = await commands.importSnapshots(path as string);
		if (result.status === "ok") {
			toast.success(
				`Imported ${result.data.imported} snapshots (${result.data.skipped} skipped)`,
			);
			queryClient.invalidateQueries({ queryKey: ["snapshots"] });
			queryClient.invalidateQueries({ queryKey: ["interruption-log"] });
			queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
		} else {
			toast.error(`Import failed: ${result.error}`);
		}
	};

	const displayShortcut = shortcut
		.replace("CommandOrControl", "Cmd")
		.replace("+", " + ");

	return (
		<div className="mx-auto max-w-lg space-y-6">
			<h2 className="text-xl font-bold">Settings</h2>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Keyboard className="size-4" />
						Global Shortcut
					</CardTitle>
					<CardDescription>
						The keyboard shortcut to open the overlay from any app.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Current shortcut</Label>
						<div className="flex gap-2">
							<Input
								value={
									recording ? "Press a key combination..." : displayShortcut
								}
								onFocus={() => setRecording(true)}
								onKeyDown={handleKeyDown}
								onBlur={() => setRecording(false)}
								readOnly
								className="cursor-pointer font-mono"
							/>
							<Button
								variant="outline"
								onClick={handleSave}
								disabled={
									shortcut === (prefs?.overlay_shortcut ?? defaultShortcut)
								}
								className="cursor-pointer"
							>
								Save
							</Button>
							<Button
								variant="ghost"
								onClick={handleReset}
								disabled={!prefs?.overlay_shortcut}
								className="cursor-pointer"
							>
								Reset
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Click the field and press your desired key combination (e.g.
							Cmd+Shift+K).
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Data</CardTitle>
					<CardDescription>
						Export all snapshots to JSON or import from a previous export.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-3">
						<Button
							variant="outline"
							className="cursor-pointer gap-2 flex-1"
							onClick={handleExport}
						>
							<Download className="size-4" />
							Export JSON
						</Button>
						<Button
							variant="outline"
							className="cursor-pointer gap-2 flex-1"
							onClick={handleImport}
						>
							<Upload className="size-4" />
							Import JSON
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
