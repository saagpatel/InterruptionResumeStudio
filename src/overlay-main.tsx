import { QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { OverlayApp } from "./components/OverlayApp";
import { queryClient } from "./lib/query-client";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<QueryClientProvider client={queryClient}>
		<OverlayApp />
	</QueryClientProvider>,
);
