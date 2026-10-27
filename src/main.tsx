import { createRoot } from "react-dom/client";
import App from "./App";
import { RenderErrorBoundary } from "./components/RenderErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<RenderErrorBoundary><App /></RenderErrorBoundary>);
