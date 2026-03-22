import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commands } from "@/lib/bindings";
import { unwrapResult } from "@/lib/result";

export function useAppState(key: string) {
	return useQuery({
		queryKey: ["app-state", key],
		queryFn: () => commands.getAppState(key).then(unwrapResult),
	});
}

export function useSetAppState() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ key, value }: { key: string; value: string }) =>
			commands.setAppState(key, value).then(unwrapResult),
		onSuccess: (_, { key }) => {
			queryClient.invalidateQueries({ queryKey: ["app-state", key] });
		},
	});
}
