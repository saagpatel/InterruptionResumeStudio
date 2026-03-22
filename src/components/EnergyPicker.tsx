import { cn } from "@/lib/utils";
import type { EnergyState } from "@/types";

const ENERGY_OPTIONS: {
	value: EnergyState;
	label: string;
	color: string;
	ring: string;
}[] = [
	{
		value: "drained",
		label: "Drained",
		color: "bg-red-500",
		ring: "ring-red-500/30",
	},
	{
		value: "okay",
		label: "Okay",
		color: "bg-yellow-500",
		ring: "ring-yellow-500/30",
	},
	{
		value: "focused",
		label: "Focused",
		color: "bg-green-500",
		ring: "ring-green-500/30",
	},
];

interface EnergyPickerProps {
	value: EnergyState | null;
	onChange: (value: EnergyState) => void;
}

export function EnergyPicker({ value, onChange }: EnergyPickerProps) {
	return (
		<div className="flex gap-2">
			{ENERGY_OPTIONS.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					className={cn(
						"flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-all",
						"hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						value === option.value
							? `border-transparent ${option.ring} ring-4 bg-accent`
							: "border-input bg-background",
					)}
				>
					<span className={cn("size-3 rounded-full", option.color)} />
					{option.label}
				</button>
			))}
		</div>
	);
}
