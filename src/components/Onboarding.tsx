import { useQuery } from "@tanstack/react-query";
import { Keyboard, PauseCircle, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { SnapshotForm } from "@/components/SnapshotForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useSetAppState } from "@/hooks/use-app-state";
import { commands } from "@/lib/bindings";

type OnboardingStep = "accessibility" | "first-snapshot" | "test-hotkey";

interface OnboardingProps {
	onComplete: () => void;
}

const STEPS: OnboardingStep[] = [
	"accessibility",
	"first-snapshot",
	"test-hotkey",
];

function StepIndicator({ current }: { current: OnboardingStep }) {
	return (
		<div className="flex justify-center gap-2 mb-8">
			{STEPS.map((step) => (
				<div
					key={step}
					className={`size-2 rounded-full transition-colors ${
						step === current ? "bg-primary" : "bg-muted-foreground/30"
					}`}
				/>
			))}
		</div>
	);
}

function AccessibilityStep({ onNext }: { onNext: () => void }) {
	const { data: hasAccess } = useQuery({
		queryKey: ["accessibility-check"],
		queryFn: () => commands.checkAccessibility(),
		refetchInterval: 2000,
	});

	useEffect(() => {
		if (hasAccess) onNext();
	}, [hasAccess, onNext]);

	return (
		<Card>
			<CardHeader className="text-center">
				<div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
					<Shield className="size-7 text-primary" />
				</div>
				<CardTitle className="text-xl">
					Grant Accessibility Permission
				</CardTitle>
				<CardDescription>
					IRS needs Accessibility permission to register the global hotkey (
					<kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
						Cmd+Shift+Space
					</kbd>
					) so you can capture context from any app.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-center">
				<Button
					className="cursor-pointer"
					onClick={() => commands.openAccessibilitySettings()}
				>
					Open System Settings
				</Button>
				{hasAccess && (
					<Badge variant="default" className="ml-2">
						Permission granted
					</Badge>
				)}
				<div>
					<button
						type="button"
						onClick={onNext}
						className="cursor-pointer text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
					>
						Skip for now
					</button>
				</div>
			</CardContent>
		</Card>
	);
}

function FirstSnapshotStep({ onNext }: { onNext: () => void }) {
	return (
		<Card>
			<CardHeader className="text-center">
				<div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
					<PauseCircle className="size-7 text-primary" />
				</div>
				<CardTitle className="text-xl">Take Your First Snapshot</CardTitle>
				<CardDescription>
					Try capturing your current context. Don't worry — this is just
					practice.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SnapshotForm onSaved={onNext} />
			</CardContent>
		</Card>
	);
}

function TestHotkeyStep({ onFinish }: { onFinish: () => void }) {
	return (
		<Card>
			<CardHeader className="text-center">
				<div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-500/10">
					<Keyboard className="size-7 text-green-600" />
				</div>
				<CardTitle className="text-xl">You're All Set</CardTitle>
				<CardDescription>
					Try pressing the hotkey from any app to open the quick capture
					overlay.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6 text-center">
				<div className="flex justify-center gap-1">
					<kbd className="rounded-md border bg-muted px-3 py-1.5 text-sm font-mono shadow-sm">
						Cmd
					</kbd>
					<span className="self-center text-muted-foreground">+</span>
					<kbd className="rounded-md border bg-muted px-3 py-1.5 text-sm font-mono shadow-sm">
						Shift
					</kbd>
					<span className="self-center text-muted-foreground">+</span>
					<kbd className="rounded-md border bg-muted px-3 py-1.5 text-sm font-mono shadow-sm">
						Space
					</kbd>
				</div>
				<Button className="cursor-pointer" size="lg" onClick={onFinish}>
					Start Using IRS
				</Button>
			</CardContent>
		</Card>
	);
}

export function Onboarding({ onComplete }: OnboardingProps) {
	const [step, setStep] = useState<OnboardingStep>("accessibility");
	const setAppState = useSetAppState();

	const handleFinish = () => {
		setAppState.mutate(
			{ key: "onboarding_complete", value: "1" },
			{ onSuccess: onComplete },
		);
	};

	return (
		<div className="flex h-screen items-center justify-center p-8">
			<div className="w-full max-w-md">
				<StepIndicator current={step} />
				{step === "accessibility" && (
					<AccessibilityStep onNext={() => setStep("first-snapshot")} />
				)}
				{step === "first-snapshot" && (
					<FirstSnapshotStep onNext={() => setStep("test-hotkey")} />
				)}
				{step === "test-hotkey" && <TestHotkeyStep onFinish={handleFinish} />}
			</div>
		</div>
	);
}
