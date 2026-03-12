import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/tokens.css";
import "./index.css";
import "@/lib/global-error-listeners";
import '@/lib/queryClient';

// Buffer polyfill removed as it causes Vite build issues when buffer is not installed/configured properly.
createRoot(document.getElementById("root")!).render(<App />);
