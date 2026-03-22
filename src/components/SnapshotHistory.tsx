import { save } from "@tauri-apps/plugin-dialog";
import { format } from "date-fns";
import { Clock, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProjectFilter } from "@/components/ProjectFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSnapshots } from "@/hooks/use-snapshot";
import type { Snapshot } from "@/lib/bindings";
import { commands } from "@/lib/bindings";
import { formatSnapshotDate } from "@/lib/date";
import { useAppStore } from "@/store/app-store";

const ENERGY_EMOJI: Record<string, string> = {
	drained: "🔴",
	okay: "🟡",
	focused: "🟢",
};

function truncate(str: string, max: number): string {
	return str.length > max ? `${str.slice(0, max)}…` : str;
}

function SnapshotRow({ snapshot }: { snapshot: Snapshot }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="border-b border-border last:border-0">
			<button
				type="button"
				className="w-full cursor-pointer px-4 py-3 text-left hover:bg-accent/50 transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center gap-3">
					<span className="shrink-0">
						{ENERGY_EMOJI[snapshot.energy_state] ?? "⚪"}
					</span>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium truncate">
							{truncate(snapshot.current_task, 60)}
						</p>
						<p className="text-xs text-muted-foreground">
							{formatSnapshotDate(snapshot.created_at)}
						</p>
					</div>
					<Badge
						variant={snapshot.resumed_at ? "outline" : "secondary"}
						className="shrink-0"
					>
						{snapshot.resumed_at ? "Resumed" : "Active"}
					</Badge>
				</div>
			</button>

			{expanded && (
				<div className="px-4 pb-4 pt-1 space-y-3 bg-muted/30">
					<div>
						<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
							Task
						</div>
						<p className="text-sm">{snapshot.current_task}</p>
					</div>
					<div>
						<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
							Progress
						</div>
						<p className="text-sm">{snapshot.progress_note}</p>
					</div>
					<div>
						<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
							Next Step
						</div>
						<p className="text-sm">{snapshot.next_step}</p>
					</div>
					{snapshot.interruption_type && (
						<div>
							<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
								Interrupted By
							</div>
							<p className="text-sm capitalize">
								{snapshot.interruption_type}
								{snapshot.interruption_note
									? ` — ${snapshot.interruption_note}`
									: ""}
							</p>
						</div>
					)}
					{snapshot.linked_project && (
						<Badge variant="outline">{snapshot.linked_project}</Badge>
					)}
					{snapshot.open_questions && (
						<div>
							<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
								Open Questions
							</div>
							<p className="text-sm text-muted-foreground">
								{snapshot.open_questions}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export function SnapshotHistory() {
	const [project, setProject] = useState<string | null>(null);
	const { data: snapshots, isLoading } = useSnapshots(30, 0, project);
	const setActiveView = useAppStore((s) => s.setActiveView);

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

	if (isLoading) {
		return (
			<div className="mx-auto max-w-lg">
				<h2 className="text-xl font-bold mb-4">Snapshot History</h2>
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
					))}
				</div>
			</div>
		);
	}

	if (!snapshots || snapshots.length === 0) {
		return (
			<div className="mx-auto max-w-lg text-center py-16">
				<div className="mb-4 text-4xl">
					<Clock className="mx-auto size-12 text-muted-foreground" />
				</div>
				<h2 className="text-xl font-bold mb-2">No snapshots yet</h2>
				<p className="text-muted-foreground mb-6">
					Capture your first context snapshot to get started.
				</p>
				<Button
					className="cursor-pointer"
					onClick={() => setActiveView("snapshot")}
				>
					Take Your First Snapshot
				</Button>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-lg">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-bold">Snapshot History</h2>
				<div className="flex items-center gap-3">
					<ProjectFilter value={project} onChange={setProject} />
					<span className="text-sm text-muted-foreground">
						{snapshots.length} snapshots
					</span>
					<Button
						variant="outline"
						size="sm"
						className="cursor-pointer gap-1"
						onClick={handleExport}
					>
						<Download className="size-3.5" />
						Export
					</Button>
				</div>
			</div>

			<ScrollArea className="h-[calc(100vh-12rem)]">
				<div className="rounded-md border">
					{snapshots.map((snapshot) => (
						<SnapshotRow key={snapshot.id} snapshot={snapshot} />
					))}
				</div>
			</ScrollArea>
		</div>
	);
}
