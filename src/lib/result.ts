import type { Result } from "./bindings";

export function unwrapResult<T>(result: Result<T, string>): T {
	if (result.status === "ok") return result.data;
	throw new Error(result.error);
}
