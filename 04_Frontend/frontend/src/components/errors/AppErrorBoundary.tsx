import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-6">
          <div className="max-w-md text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Dhara Photography ERP</p>
            <h1 className="mt-4 font-serif text-3xl text-amber-50">Something went wrong</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              The studio workspace hit an unexpected error. Reload the page or retry this screen.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" className="btn-secondary" onClick={this.handleRetry}>
                Retry
              </button>
              <button type="button" className="btn-primary" onClick={this.handleReload}>
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
