import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/tokens.css";
import "./index.css";
import "@/lib/global-error-listeners";

createRoot(document.getElementById("root")!).render(<App />);
