import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          color: '#333'
        }}>
          <h1 style={{ fontSize: '2em', marginBottom: '0.5em' }}>Oops! Something went wrong.</h1>
          <p style={{ fontSize: '1.2em' }}>We're sorry for the inconvenience. Please try refreshing the page.</p>
          <p style={{ fontSize: '0.9em', color: '#666' }}>If the problem persists, contact support.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
