import { format } from "date-fns";
import { GanttChart } from "lucide-react";
import { useState } from "react";
import { ProjectFilter } from "@/components/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDayTimeline } from "@/hooks/use-log";
import { parseSqliteDate } from "@/lib/date";
import { formatDuration } from "@/lib/time";
import { useAppStore } from "@/store/app-store";

const TIMELINE_WIDTH = 600;
const START_HOUR = 9;
const END_HOUR = 19; // 7 PM
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 600
const MIN_BLOCK_WIDTH = 30;

const ENERGY_COLORS: Record<string, string> = {
	drained: "bg-red-500",
	okay: "bg-yellow-500",
	focused: "bg-green-500",
};

const HOUR_LABELS = Array.from(
	{ length: END_HOUR - START_HOUR + 1 },
	(_, i) => {
		const hour = START_HOUR + i;
		if (hour === 12) return "12PM";
		if (hour > 12) return `${hour - 12}`;
		return `${hour}AM`;
	},
);

function timeToPixel(dateStr: string): number {
	const d = parseSqliteDate(dateStr);
	const minutes = (d.getHours() - START_HOUR) * 60 + d.getMinutes();
	return Math.max(
		0,
		Math.min(TIMELINE_WIDTH, (minutes / TOTAL_MINUTES) * TIMELINE_WIDTH),
	);
}

function truncate(str: string, max: number): string {
	return str.length > max ? `${str.slice(0, max)}…` : str;
}

export function DayTimeline() {
	const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
	const [project, setProject] = useState<string | null>(null);
	const { data: entries, isLoading } = useDayTimeline(date, project);
	const setActiveView = useAppStore((s) => s.setActiveView);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-2xl">
				<h2 className="text-xl font-bold mb-4">Day Timeline</h2>
				<div className="h-24 animate-pulse rounded-md bg-muted" />
			</div>
		);
	}

	if (!entries || entries.length === 0) {
		return (
			<div className="mx-auto max-w-2xl">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">Day Timeline</h2>
					<Input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-40 cursor-pointer"
					/>
				</div>
				<div className="text-center py-16">
					<GanttChart className="mx-auto size-12 text-muted-foreground mb-4" />
					<h3 className="text-lg font-bold mb-2">No snapshots on this date</h3>
					<p className="text-muted-foreground mb-6">
						Take snapshots throughout the day to see your timeline.
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

	return (
		<div className="mx-auto max-w-2xl">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-bold">Day Timeline</h2>
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
				{entries.length} snapshot{entries.length !== 1 ? "s" : ""} captured
			</p>

			<ScrollArea className="w-full">
				<div className="min-w-[640px]">
					{/* Hour labels */}
					<div
						className="relative h-6"
						style={{ width: TIMELINE_WIDTH, marginLeft: 20 }}
					>
						{HOUR_LABELS.map((label, i) => (
							<span
								key={label}
								className="absolute text-xs text-muted-foreground -translate-x-1/2"
								style={{
									left: (i / (HOUR_LABELS.length - 1)) * TIMELINE_WIDTH,
								}}
							>
								{label}
							</span>
						))}
					</div>

					{/* Timeline bar */}
					<TooltipProvider>
						<div
							className="relative h-12 rounded-md bg-muted/30 border"
							style={{ width: TIMELINE_WIDTH, marginLeft: 20 }}
						>
							{/* Hour grid lines */}
							{HOUR_LABELS.map((_, i) => (
								<div
									key={i}
									className="absolute top-0 bottom-0 w-px bg-border/50"
									style={{
										left: (i / (HOUR_LABELS.length - 1)) * TIMELINE_WIDTH,
									}}
								/>
							))}

							{/* Snapshot blocks */}
							{entries.map((entry) => {
								const left = timeToPixel(entry.snapshot.created_at);
								const width = entry.snapshot.resume_duration_seconds
									? Math.max(
											(entry.snapshot.resume_duration_seconds /
												60 /
												TOTAL_MINUTES) *
												TIMELINE_WIDTH,
											MIN_BLOCK_WIDTH,
										)
									: MIN_BLOCK_WIDTH;
								const color =
									ENERGY_COLORS[entry.snapshot.energy_state] ?? "bg-gray-500";
								const duration = entry.snapshot.resume_duration_seconds
									? formatDuration(entry.snapshot.resume_duration_seconds)
									: "Active";

								return (
									<Tooltip key={entry.snapshot.id}>
										<TooltipTrigger asChild>
											<div
												className={`absolute top-1 bottom-1 rounded cursor-pointer ${color} opacity-80 hover:opacity-100 transition-opacity`}
												style={{
													left: `${left}px`,
													width: `${Math.min(width, TIMELINE_WIDTH - left)}px`,
												}}
											/>
										</TooltipTrigger>
										<TooltipContent>
											<p className="font-medium">
												{truncate(entry.snapshot.current_task, 50)}
											</p>
											<p className="text-xs text-muted-foreground">
												{duration}
											</p>
										</TooltipContent>
									</Tooltip>
								);
							})}
						</div>
					</TooltipProvider>

					{/* Legend */}
					<div
						className="flex gap-4 mt-3 text-xs text-muted-foreground"
						style={{ marginLeft: 20 }}
					>
						<span className="flex items-center gap-1">
							<span className="size-2.5 rounded-full bg-green-500" /> Focused
						</span>
						<span className="flex items-center gap-1">
							<span className="size-2.5 rounded-full bg-yellow-500" /> Okay
						</span>
						<span className="flex items-center gap-1">
							<span className="size-2.5 rounded-full bg-red-500" /> Drained
						</span>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}
