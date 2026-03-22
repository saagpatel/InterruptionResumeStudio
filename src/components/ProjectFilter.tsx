import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/use-reports";

interface ProjectFilterProps {
	value: string | null;
	onChange: (project: string | null) => void;
}

export function ProjectFilter({ value, onChange }: ProjectFilterProps) {
	const { data: projects } = useProjects();

	if (!projects || projects.length === 0) return null;

	return (
		<Select
			value={value ?? "__all__"}
			onValueChange={(v) => onChange(v === "__all__" ? null : v)}
		>
			<SelectTrigger className="w-40">
				<SelectValue placeholder="All Projects" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="__all__">All Projects</SelectItem>
				{projects.map((project) => (
					<SelectItem key={project} value={project}>
						{project}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
