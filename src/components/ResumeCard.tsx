import { Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkResumed, useResumeCard } from "@/hooks/use-resume";
import { formatAway } from "@/lib/time";
import { useAppStore } from "@/store/app-store";
import type { EnergyState } from "@/types";

const ENERGY_DISPLAY: Record<
	EnergyState,
	{
		emoji: string;
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	drained: { emoji: "🔴", label: "Drained", variant: "destructive" },
	okay: { emoji: "🟡", label: "Okay", variant: "secondary" },
	focused: { emoji: "🟢", label: "Focused", variant: "default" },
};

export function ResumeCard() {
	const { data: resumeCard, isLoading } = useResumeCard();
	const markResumed = useMarkResumed();
	const setActiveView = useAppStore((s) => s.setActiveView);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-lg space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!resumeCard) {
		return (
			<div className="mx-auto max-w-lg text-center py-16">
				<div className="mb-4 text-4xl">📋</div>
				<h2 className="text-xl font-bold mb-2">No active context</h2>
				<p className="text-muted-foreground mb-6">
					You don't have any unresumed snapshots.
				</p>
				<Button
					className="cursor-pointer"
					onClick={() => setActiveView("snapshot")}
				>
					Take a Snapshot
				</Button>
			</div>
		);
	}

	const { snapshot, away_duration_seconds, is_stale } = resumeCard;
	const energy =
		ENERGY_DISPLAY[snapshot.energy_state as EnergyState] ?? ENERGY_DISPLAY.okay;

	const handleResume = () => {
		markResumed.mutate(snapshot.id, {
			onSuccess: () => {
				toast.success("Resumed — welcome back");
				setActiveView("snapshot");
			},
			onError: (err) => {
				toast.error(`Failed to resume: ${err.message}`);
			},
		});
	};

	return (
		<div className="mx-auto max-w-lg">
			{is_stale && (
				<div className="mb-4 rounded-md bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
					You've been away for a while — here's where you left off.
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-xl">Welcome Back</CardTitle>
					<CardDescription>
						Away for {formatAway(away_duration_seconds)}
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					<div>
						<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
							Working On
						</div>
						<p className="text-base font-medium">{snapshot.current_task}</p>
					</div>

					<Separator />

					<div>
						<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
							Left Off At
						</div>
						<p className="text-sm">{snapshot.progress_note}</p>
					</div>

					<div className="rounded-md bg-primary/5 border border-primary/10 p-3">
						<div className="text-xs font-medium uppercase tracking-wider text-primary mb-1">
							Next Step
						</div>
						<p className="text-sm font-medium">{snapshot.next_step}</p>
					</div>

					<div className="flex items-center gap-2">
						<Badge variant={energy.variant}>
							{energy.emoji} {energy.label}
						</Badge>
						{snapshot.linked_project && (
							<Badge variant="outline">{snapshot.linked_project}</Badge>
						)}
					</div>

					{snapshot.open_questions && (
						<div>
							<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
								Open Questions
							</div>
							<p className="text-sm text-muted-foreground">
								{snapshot.open_questions}
							</p>
						</div>
					)}
				</CardContent>

				{!snapshot.resumed_at && (
					<CardFooter>
						<Button
							onClick={handleResume}
							disabled={markResumed.isPending}
							className="w-full cursor-pointer"
							size="lg"
						>
							<Play className="size-4" />
							{markResumed.isPending ? "Resuming..." : "Mark Resumed"}
						</Button>
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
