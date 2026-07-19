import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-card">
            <h1 className="font-display text-xl font-semibold text-red-600">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">
              Copy the error below and share it so we can fix it quickly.
            </p>
            <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-800">
              {this.state.error.toString()}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
