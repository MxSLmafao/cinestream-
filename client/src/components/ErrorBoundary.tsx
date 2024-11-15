import React from 'react';
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetCondition?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    console.error('Error caught by boundary:', {
      error,
      componentStack: errorInfo.componentStack
    });

    // Update state with error info and increment error count
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);

    // Attempt automatic recovery if within retry limit
    if (this.state.errorCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if resetCondition prop changes
    if (this.props.resetCondition !== prevProps.resetCondition) {
      this.handleReset();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.errorCount), 8000);
    this.retryTimeout = setTimeout(this.handleRetry, delay);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.errorCount < this.maxRetries;
      
      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <div className="text-sm">
              <p className="font-medium">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              {this.state.error?.stack && (
                <pre className="mt-2 max-h-32 overflow-auto text-xs opacity-70">
                  {this.state.error.stack}
                </pre>
              )}
              {this.state.errorCount > 0 && (
                <p className="mt-2 text-xs opacity-70">
                  Retry attempt {this.state.errorCount} of {this.maxRetries}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {canRetry && (
                <Button 
                  variant="outline" 
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={this.handleReload}
              >
                Reload page
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// HOC for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Custom hook for error reporting
export function useErrorBoundary() {
  const { toast } = useToast();
  
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Component error:', error);
    
    toast({
      title: "Error",
      description: error.message || "An unexpected error occurred",
      variant: "destructive",
    });
  }, [toast]);

  return { onError: handleError };
}
