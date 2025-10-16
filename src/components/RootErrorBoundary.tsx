import { Component, ErrorInfo, ReactNode } from "react";

export class RootErrorBoundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state = { err: undefined as Error | undefined };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    // Full details in console
    console.error("RootErrorBoundary", err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="p-6 text-red-500 text-sm">
          <div className="font-semibold mb-2">Something broke rendering this page.</div>
          <pre className="whitespace-pre-wrap text-xs">
            {String(this.state.err?.message || this.state.err)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
