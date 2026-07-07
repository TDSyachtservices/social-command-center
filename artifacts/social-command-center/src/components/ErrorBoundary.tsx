import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page failed to load. Try reloading — if the problem continues,
            the technical details below can help diagnose it.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reload page
          </button>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Show technical details
            </summary>
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs text-muted-foreground">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
