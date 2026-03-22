import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commands } from "@/lib/bindings";
import { unwrapResult } from "@/lib/result";
import type { SnapshotFormData } from "@/types";

export function useSnapshots(
	limit = 30,
	offset = 0,
	project: string | null = null,
) {
	return useQuery({
		queryKey: ["snapshots", limit, offset, project],
		queryFn: () =>
			commands.getSnapshots(limit, offset, project).then(unwrapResult),
	});
}

export function useLatestSnapshot() {
	return useQuery({
		queryKey: ["snapshots", "latest"],
		queryFn: () => commands.getLatestSnapshot().then(unwrapResult),
	});
}

export function useSaveSnapshot() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: SnapshotFormData) =>
			commands
				.saveSnapshot({
					current_task: data.current_task,
					progress_note: data.progress_note,
					next_step: data.next_step,
					energy_state: data.energy_state,
					interruption_type: data.interruption_type ?? null,
					interruption_note: data.interruption_note ?? null,
					linked_project: data.linked_project ?? null,
					open_questions: data.open_questions ?? null,
				})
				.then(unwrapResult),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["snapshots"] });
			queryClient.invalidateQueries({ queryKey: ["resume-card"] });
		},
	});
}
