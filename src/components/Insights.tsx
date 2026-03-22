import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWeeklyReport } from "@/hooks/use-reports";
import { formatDuration } from "@/lib/time";
import { useAppStore } from "@/store/app-store";

const ENERGY_COLORS: Record<string, string> = {
	focused: "bg-green-500",
	okay: "bg-yellow-500",
	drained: "bg-red-500",
};

const TYPE_COLORS: Record<string, string> = {
	meeting: "bg-blue-500",
	slack: "bg-purple-500",
	personal: "bg-orange-500",
	other: "bg-gray-500",
	unspecified: "bg-gray-400",
};

function Bar({
	value,
	max,
	color,
}: {
	value: number;
	max: number;
	color: string;
}) {
	const width = max > 0 ? Math.max((value / max) * 100, 2) : 0;
	return (
		<div className={`h-3 rounded-sm ${color}`} style={{ width: `${width}%` }} />
	);
}

export function Insights() {
	const [weekOffset, setWeekOffset] = useState(0);
	const { data: report, isLoading } = useWeeklyReport(weekOffset);
	const setActiveView = useAppStore((s) => s.setActiveView);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-2xl">
				<h2 className="text-xl font-bold mb-4">Weekly Insights</h2>
				<div className="grid grid-cols-2 gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
					))}
				</div>
			</div>
		);
	}

	if (!report || report.total_interruptions === 0) {
		return (
			<div className="mx-auto max-w-2xl">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">Weekly Insights</h2>
					<WeekNav
						weekOffset={weekOffset}
						weekStart={report?.week_start}
						weekEnd={report?.week_end}
						onPrev={() => setWeekOffset((w) => w - 1)}
						onNext={() => setWeekOffset((w) => w + 1)}
					/>
				</div>
				<div className="text-center py-16">
					<BarChart3 className="mx-auto size-12 text-muted-foreground mb-4" />
					<h3 className="text-lg font-bold mb-2">No data this week</h3>
					<p className="text-muted-foreground mb-6">
						Take some snapshots to see your interruption patterns.
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

	const maxDayCount = Math.max(...report.by_day.map((d) => d.count), 1);
	const maxTypeCount = Math.max(...report.by_type.map((t) => t.count), 1);
	const maxEnergyCount = Math.max(...report.by_energy.map((e) => e.count), 1);
	const maxHourCount = Math.max(...report.by_hour.map((h) => h.count), 1);

	return (
		<div className="mx-auto max-w-2xl">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-bold">Weekly Insights</h2>
				<WeekNav
					weekOffset={weekOffset}
					weekStart={report.week_start}
					weekEnd={report.week_end}
					onPrev={() => setWeekOffset((w) => w - 1)}
					onNext={() => setWeekOffset((w) => w + 1)}
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				{/* Summary */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Interruptions</span>
							<span className="font-medium">{report.total_interruptions}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Time lost</span>
							<span className="font-medium">
								{formatDuration(report.total_time_lost_seconds)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Avg gap</span>
							<span className="font-medium">
								{formatDuration(report.avg_gap_seconds)}
							</span>
						</div>
						{report.most_common_type && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Top source</span>
								<span className="font-medium capitalize">
									{report.most_common_type}
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				{/* By Day */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">By Day</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1.5">
						{report.by_day.map((day) => (
							<div key={day.day} className="flex items-center gap-2 text-xs">
								<span className="w-8 text-muted-foreground">
									{day.day_name}
								</span>
								<div className="flex-1">
									<Bar value={day.count} max={maxDayCount} color="bg-primary" />
								</div>
								<span className="w-4 text-right tabular-nums">{day.count}</span>
							</div>
						))}
					</CardContent>
				</Card>

				{/* By Type */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">By Source</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1.5">
						{report.by_type.map((type_) => (
							<div
								key={type_.interruption_type}
								className="flex items-center gap-2 text-xs"
							>
								<span className="w-20 capitalize text-muted-foreground truncate">
									{type_.interruption_type}
								</span>
								<div className="flex-1">
									<Bar
										value={type_.count}
										max={maxTypeCount}
										color={
											TYPE_COLORS[type_.interruption_type] ?? "bg-gray-400"
										}
									/>
								</div>
								<span className="w-4 text-right tabular-nums">
									{type_.count}
								</span>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Energy */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Energy</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1.5">
						{report.by_energy.map((energy) => (
							<div
								key={energy.energy_state}
								className="flex items-center gap-2 text-xs"
							>
								<span className="w-16 capitalize text-muted-foreground">
									{energy.energy_state}
								</span>
								<div className="flex-1">
									<Bar
										value={energy.count}
										max={maxEnergyCount}
										color={ENERGY_COLORS[energy.energy_state] ?? "bg-gray-400"}
									/>
								</div>
								<span className="w-4 text-right tabular-nums">
									{energy.count}
								</span>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			{/* Busiest Hours */}
			{report.by_hour.length > 0 && (
				<Card className="mt-4">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Busiest Hours</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-end gap-px h-16">
							{Array.from({ length: 24 }, (_, hour) => {
								const entry = report.by_hour.find((h) => h.hour === hour);
								const count = entry?.count ?? 0;
								const height =
									maxHourCount > 0 ? (count / maxHourCount) * 100 : 0;
								return (
									<div
										key={hour}
										className="flex-1 flex flex-col items-center gap-0.5"
									>
										<div
											className="w-full rounded-t-sm bg-primary/70"
											style={{
												height: `${Math.max(height, count > 0 ? 8 : 0)}%`,
											}}
										/>
									</div>
								);
							})}
						</div>
						<div className="flex text-[10px] text-muted-foreground mt-1">
							<span className="flex-1">12a</span>
							<span className="flex-1 text-center">6a</span>
							<span className="flex-1 text-center">12p</span>
							<span className="flex-1 text-center">6p</span>
							<span className="text-right">11p</span>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function WeekNav({
	weekOffset,
	weekStart,
	weekEnd,
	onPrev,
	onNext,
}: {
	weekOffset: number;
	weekStart?: string;
	weekEnd?: string;
	onPrev: () => void;
	onNext: () => void;
}) {
	const label =
		weekStart && weekEnd
			? `${weekStart} – ${weekEnd}`
			: weekOffset === 0
				? "This Week"
				: `${weekOffset > 0 ? "+" : ""}${weekOffset} weeks`;

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onPrev}
				className="cursor-pointer"
			>
				<ChevronLeft className="size-4" />
			</Button>
			<span className="text-sm text-muted-foreground min-w-[140px] text-center">
				{label}
			</span>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onNext}
				disabled={weekOffset >= 0}
				className="cursor-pointer"
			>
				<ChevronRight className="size-4" />
			</Button>
		</div>
	);
}
