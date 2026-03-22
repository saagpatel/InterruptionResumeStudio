import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		logger.error("Application crashed", {
			error: error.message,
			stack: error.stack,
			componentStack: errorInfo.componentStack ?? undefined,
		});
	}

	override render() {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center p-8">
					<h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
					<p className="text-muted-foreground mb-4">
						The application encountered an unexpected error.
					</p>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
					>
						Reload
					</button>
					{import.meta.env.DEV && this.state.error && (
						<pre className="mt-4 p-3 bg-muted rounded-md text-xs font-mono max-w-lg overflow-auto">
							{this.state.error.stack}
						</pre>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}
