import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.tsx";
import "./styles/tokens.css";
import "./index.css";
import "@/lib/global-error-listeners";
import '@/lib/queryClient';

// Some wallet providers/libs still rely on a global Buffer in browser contexts.
if (!(globalThis as { Buffer?: typeof Buffer }).Buffer) {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(<App />);
