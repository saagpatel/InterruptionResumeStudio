import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commands } from "@/lib/bindings";
import { unwrapResult } from "@/lib/result";

export function useResumeCard() {
	return useQuery({
		queryKey: ["resume-card"],
		queryFn: () => commands.getResumeCard().then(unwrapResult),
	});
}

export function useMarkResumed() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => commands.markResumed(id).then(unwrapResult),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["resume-card"] });
			queryClient.invalidateQueries({ queryKey: ["snapshots"] });
		},
	});
}
