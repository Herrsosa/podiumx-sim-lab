import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./index.css";
import "@/lib/global-error-listeners";
import '@/lib/queryClient';

// Buffer polyfill removed as it causes Vite build issues when buffer is not installed/configured properly.
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const root = createRoot(rootElement);

function renderBootstrapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  console.error("App bootstrap failed", error);

  root.render(
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-destructive/30 bg-card p-6 shadow-xl">
        <h1 className="text-xl font-semibold">App failed to start</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the browser console for the full stack trace.
        </p>
        <pre className="mt-4 overflow-auto rounded-lg bg-muted p-4 text-xs text-destructive whitespace-pre-wrap">
          {message}
        </pre>
      </div>
    </div>,
  );
}

async function bootstrap() {
  try {
    const { default: App } = await import("./App.tsx");
    root.render(<App />);
  } catch (error) {
    renderBootstrapError(error);
  }
}

void bootstrap();
