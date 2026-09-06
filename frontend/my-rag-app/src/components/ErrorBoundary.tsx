import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <section className="nexora-page grid min-h-[50vh] place-items-center p-8" aria-labelledby="application-error-title">
          <div className="nexora-surface nexora-empty-state">
            <div className="grid size-12 place-items-center rounded-full bg-[var(--state-danger-soft)] text-[var(--status-danger)]">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="nexora-status nexora-status--danger">Application error</span>
            <h2 id="application-error-title" className="nexora-empty-state__title">Something went wrong</h2>
            <p className="nexora-empty-state__description">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="nexora-action nexora-action--primary"
            >
              Try again
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
