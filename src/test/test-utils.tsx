import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import { useState } from "react";
import {
	type Theme,
	ThemeProviderContext,
	type ThemeProviderState,
} from "@/lib/theme-context";

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

function MockThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>("light");
	const value: ThemeProviderState = { theme, setTheme };

	return (
		<ThemeProviderContext.Provider value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
	const queryClient = createTestQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<MockThemeProvider>{children}</MockThemeProvider>
		</QueryClientProvider>
	);
};

const customRender = (
	ui: React.ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
