import { useQuery } from "@tanstack/react-query";
import { commands } from "@/lib/bindings";
import { unwrapResult } from "@/lib/result";

export function usePreferences() {
	return useQuery({
		queryKey: ["preferences"],
		queryFn: () => commands.loadPreferences().then(unwrapResult),
	});
}
