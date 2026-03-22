import { useQuery } from "@tanstack/react-query";
import { commands } from "@/lib/bindings";
import { unwrapResult } from "@/lib/result";

export function useInterruptionLog(
	date: string | null,
	project: string | null = null,
) {
	return useQuery({
		queryKey: ["interruption-log", date, project],
		queryFn: () =>
			commands.getInterruptionLog(date, project).then(unwrapResult),
	});
}

export function useDayTimeline(date: string, project: string | null = null) {
	return useQuery({
		queryKey: ["day-timeline", date, project],
		queryFn: () => commands.getDayTimeline(date, project).then(unwrapResult),
	});
}
