import { useEffect, useState } from "react";
import { type Theme, ThemeProviderContext } from "@/lib/theme-context";

interface ThemeProviderProps {
	children: React.ReactNode;
	defaultTheme?: Theme;
}

export function ThemeProvider({
	children,
	defaultTheme = "system",
}: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(defaultTheme);

	useEffect(() => {
		const root = window.document.documentElement;
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const applyTheme = (isDark: boolean) => {
			root.classList.remove("light", "dark");
			root.classList.add(isDark ? "dark" : "light");
		};

		if (theme === "system") {
			applyTheme(mediaQuery.matches);
			const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches);
			mediaQuery.addEventListener("change", handleChange);
			return () => mediaQuery.removeEventListener("change", handleChange);
		}

		applyTheme(theme === "dark");
	}, [theme]);

	return (
		<ThemeProviderContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeProviderContext.Provider>
	);
}
