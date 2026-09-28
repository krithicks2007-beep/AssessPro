import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error caught by global Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-red-500 mr-2">⚠️</span> Something went wrong.
            </h2>
            <p className="text-gray-600 mb-4">
              We're sorry, an unexpected error has occurred in the application.
            </p>
            <details className="bg-gray-100 p-4 rounded-md overflow-auto max-h-48 text-sm text-gray-700 mb-6">
              <summary className="font-semibold cursor-pointer mb-2">View Error Details</summary>
              <pre>{this.state.error && this.state.error.toString()}</pre>
              <br />
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
