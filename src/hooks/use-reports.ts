import { useQuery } from "@tanstack/react-query";
import { commands } from "@/lib/bindings";
import { unwrapResult } from "@/lib/result";

export function useWeeklyReport(weekOffset = 0) {
	return useQuery({
		queryKey: ["weekly-report", weekOffset],
		queryFn: () => commands.getWeeklyReport(weekOffset).then(unwrapResult),
	});
}

export function useProjects() {
	return useQuery({
		queryKey: ["projects"],
		queryFn: () => commands.getProjects().then(unwrapResult),
	});
}
