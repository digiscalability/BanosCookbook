'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  public static getDerivedStateFromError(error: Error): Omit<State, 'errorInfo'> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Application Error Boundary Caught:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    // Update state to include error info for detailed display
    this.setState({ errorInfo });
  }

  private handleRefresh = () => {
    // Clear error state first, then reload
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    // Clear error state first, then navigate home
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';
      const errorMessage = this.state.error?.message || 'An unknown error occurred';

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-red-50 to-orange-50 px-4 py-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 border border-red-200">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-center text-red-600 mb-2">
              Something Went Wrong
            </h1>

            {/* Error Message */}
            <p className="text-center text-gray-600 mb-4">
              We encountered an unexpected error. Don't worry, we're here to help!
            </p>

            {/* Error Details (Dev Only) */}
            {isDev && this.state.error && (
              <div className="mb-4 p-3 bg-gray-100 rounded border border-gray-300">
                <p className="text-xs font-mono text-gray-700 break-words">
                  <strong>Error:</strong> {errorMessage}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2 cursor-pointer">
                    <summary className="text-xs font-semibold text-gray-600 hover:text-gray-800">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-40 text-gray-600 whitespace-pre-wrap break-words">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRefresh}
                className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-semibold"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full px-4 py-2 text-blue-500 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-semibold"
              >
                Go to Home
              </button>
            </div>

            {/* Helpful Tips */}
            <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-900 font-semibold mb-2">Quick Tips:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Try refreshing the page</li>
                <li>• Check your internet connection</li>
                <li>• Clear your browser cache if the issue persists</li>
                <li>• Contact support if the problem continues</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
