import { format } from "date-fns";
import { Clock } from "lucide-react";
import { useState } from "react";
import { ProjectFilter } from "@/components/ProjectFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInterruptionLog } from "@/hooks/use-log";
import { formatSnapshotDate } from "@/lib/date";
import { formatDuration } from "@/lib/time";
import { useAppStore } from "@/store/app-store";

const ENERGY_EMOJI: Record<string, string> = {
	drained: "🔴",
	okay: "🟡",
	focused: "🟢",
};

function truncate(str: string, max: number): string {
	return str.length > max ? `${str.slice(0, max)}…` : str;
}

export function InterruptionLog() {
	const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
	const [project, setProject] = useState<string | null>(null);
	const { data: logResult, isLoading } = useInterruptionLog(date, project);
	const setActiveView = useAppStore((s) => s.setActiveView);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-2xl">
				<h2 className="text-xl font-bold mb-4">Interruption Log</h2>
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
					))}
				</div>
			</div>
		);
	}

	if (!logResult || logResult.entries.length === 0) {
		return (
			<div className="mx-auto max-w-2xl">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">Interruption Log</h2>
					<Input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-40 cursor-pointer"
					/>
				</div>
				<div className="text-center py-16">
					<Clock className="mx-auto size-12 text-muted-foreground mb-4" />
					<h3 className="text-lg font-bold mb-2">
						No interruptions on this date
					</h3>
					<p className="text-muted-foreground mb-6">
						Either you had a focused day, or no snapshots were captured.
					</p>
					<Button
						className="cursor-pointer"
						onClick={() => setActiveView("snapshot")}
					>
						Take a Snapshot
					</Button>
				</div>
			</div>
		);
	}

	const { entries, total_interruptions, total_time_lost_seconds } = logResult;

	return (
		<div className="mx-auto max-w-2xl">
			<div className="flex items-center justify-between mb-2">
				<h2 className="text-xl font-bold">Interruption Log</h2>
				<div className="flex items-center gap-2">
					<ProjectFilter value={project} onChange={setProject} />
					<Input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-40 cursor-pointer"
					/>
				</div>
			</div>

			<p className="text-sm text-muted-foreground mb-4">
				{total_interruptions} interruption{total_interruptions !== 1 ? "s" : ""}{" "}
				· {formatDuration(total_time_lost_seconds)} lost
			</p>

			<ScrollArea className="h-[calc(100vh-14rem)]">
				<div className="rounded-md border">
					{/* Header row */}
					<div className="grid grid-cols-[80px_1fr_120px_80px_80px] gap-2 px-4 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
						<span>Time</span>
						<span>Task</span>
						<span>Interrupted By</span>
						<span>Away</span>
						<span>Status</span>
					</div>

					{entries.map((entry) => (
						<div
							key={entry.snapshot.id}
							className="grid grid-cols-[80px_1fr_120px_80px_80px] gap-2 px-4 py-3 border-b border-border last:border-0 items-center text-sm"
						>
							<span className="text-muted-foreground text-xs">
								{formatSnapshotDate(entry.snapshot.created_at)}
							</span>
							<span className="flex items-center gap-2 min-w-0">
								<span className="shrink-0">
									{ENERGY_EMOJI[entry.snapshot.energy_state] ?? "⚪"}
								</span>
								<span className="truncate">
									{truncate(entry.snapshot.current_task, 60)}
								</span>
							</span>
							<span className="text-muted-foreground text-xs">
								{entry.snapshot.interruption_type
									? entry.snapshot.interruption_type.charAt(0).toUpperCase() +
										entry.snapshot.interruption_type.slice(1)
									: "—"}
							</span>
							<span className="text-xs">
								{entry.time_away_seconds
									? formatDuration(entry.time_away_seconds)
									: "Still active"}
							</span>
							<Badge
								variant={entry.snapshot.resumed_at ? "outline" : "secondary"}
								className="justify-center"
							>
								{entry.snapshot.resumed_at ? "Resumed" : "Active"}
							</Badge>
						</div>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}
