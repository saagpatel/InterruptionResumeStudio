import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EnergyPicker } from "@/components/EnergyPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSaveSnapshot } from "@/hooks/use-snapshot";
import type { EnergyState, InterruptionType } from "@/types";

interface SnapshotFormProps {
	onSaved?: () => void;
	compact?: boolean;
}

export function SnapshotForm({ onSaved, compact }: SnapshotFormProps) {
	const [currentTask, setCurrentTask] = useState("");
	const [progressNote, setProgressNote] = useState("");
	const [nextStep, setNextStep] = useState("");
	const [energyState, setEnergyState] = useState<EnergyState | null>(null);

	const [showOptional, setShowOptional] = useState(false);
	const [interruptionType, setInterruptionType] = useState<
		InterruptionType | undefined
	>();
	const [interruptionNote, setInterruptionNote] = useState("");
	const [linkedProject, setLinkedProject] = useState("");
	const [openQuestions, setOpenQuestions] = useState("");

	const saveSnapshot = useSaveSnapshot();

	const isValid =
		currentTask.trim() !== "" &&
		progressNote.trim() !== "" &&
		nextStep.trim() !== "" &&
		energyState !== null;

	const handleSubmit = () => {
		if (!isValid || !energyState) return;

		saveSnapshot.mutate(
			{
				current_task: currentTask.trim(),
				progress_note: progressNote.trim(),
				next_step: nextStep.trim(),
				energy_state: energyState,
				interruption_type: interruptionType,
				interruption_note: interruptionNote.trim() || undefined,
				linked_project: linkedProject.trim() || undefined,
				open_questions: openQuestions.trim() || undefined,
			},
			{
				onSuccess: () => {
					toast.success("Context saved");
					setCurrentTask("");
					setProgressNote("");
					setNextStep("");
					setEnergyState(null);
					setInterruptionType(undefined);
					setInterruptionNote("");
					setLinkedProject("");
					setOpenQuestions("");
					setShowOptional(false);
					onSaved?.();
				},
				onError: (err) => {
					toast.error(`Failed to save: ${err.message}`);
				},
			},
		);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (
			e.key === "Enter" &&
			!e.shiftKey &&
			!(e.target instanceof HTMLTextAreaElement)
		) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div
			className={compact ? "space-y-2" : "mx-auto max-w-lg space-y-6"}
			onKeyDown={handleKeyDown}
		>
			{!compact && (
				<div>
					<h2 className="text-xl font-bold">Capture Context</h2>
					<p className="text-sm text-muted-foreground">
						Save what you're working on before switching context.
					</p>
				</div>
			)}

			<div className={compact ? "space-y-2" : "space-y-4"}>
				<div className="space-y-2">
					<Label htmlFor="current-task">What are you working on?</Label>
					<Textarea
						id="current-task"
						placeholder="Implementing the snapshot form component..."
						value={currentTask}
						onChange={(e) => setCurrentTask(e.target.value)}
						autoFocus
						rows={compact ? 1 : 2}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="progress-note">Where did you leave off?</Label>
					<Textarea
						id="progress-note"
						placeholder="Got the layout working, still need validation..."
						value={progressNote}
						onChange={(e) => setProgressNote(e.target.value)}
						rows={compact ? 1 : 2}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="next-step">What's the next thing to do?</Label>
					<Textarea
						id="next-step"
						placeholder="Add error handling and write tests..."
						value={nextStep}
						onChange={(e) => setNextStep(e.target.value)}
						rows={compact ? 1 : 2}
					/>
				</div>

				<div className="space-y-2">
					<Label>How's your energy?</Label>
					<EnergyPicker value={energyState} onChange={setEnergyState} />
				</div>
			</div>

			{!compact && (
				<div>
					<Button
						variant="ghost"
						size="sm"
						className="cursor-pointer gap-1 text-muted-foreground"
						onClick={() => setShowOptional(!showOptional)}
						type="button"
					>
						{showOptional ? (
							<ChevronUp className="size-4" />
						) : (
							<ChevronDown className="size-4" />
						)}
						{showOptional ? "Hide details" : "Add interruption details"}
					</Button>

					{showOptional && (
						<div className="mt-3 space-y-4 border-l-2 border-muted pl-4">
							<div className="space-y-2">
								<Label>Interrupted by</Label>
								<Select
									value={interruptionType}
									onValueChange={(v) =>
										setInterruptionType(v as InterruptionType)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select type..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="meeting">Meeting</SelectItem>
										<SelectItem value="slack">Slack</SelectItem>
										<SelectItem value="personal">Personal</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="interruption-note">Interruption note</Label>
								<Textarea
									id="interruption-note"
									placeholder="Quick standup, should be back in 15..."
									value={interruptionNote}
									onChange={(e) => setInterruptionNote(e.target.value)}
									rows={2}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="linked-project">Project</Label>
								<Input
									id="linked-project"
									placeholder="e.g. interruption-resume-studio"
									value={linkedProject}
									onChange={(e) => setLinkedProject(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="open-questions">Open questions</Label>
								<Textarea
									id="open-questions"
									placeholder="Should the form auto-save on blur?"
									value={openQuestions}
									onChange={(e) => setOpenQuestions(e.target.value)}
									rows={2}
								/>
							</div>
						</div>
					)}
				</div>
			)}

			<Button
				onClick={handleSubmit}
				disabled={!isValid || saveSnapshot.isPending}
				className="w-full cursor-pointer"
				size={compact ? "default" : "lg"}
			>
				{saveSnapshot.isPending ? "Saving..." : "Save Context"}
			</Button>
		</div>
	);
}
