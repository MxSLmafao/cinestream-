import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import MoviePage from "./pages/MoviePage";
import AuthPage from "./pages/AuthPage";

// Development mode logging
if (process.env.NODE_ENV === 'development') {
  console.log('Application starting in development mode', {
    version: process.env.npm_package_version,
    nodeEnv: process.env.NODE_ENV,
    buildTime: new Date().toISOString()
  });
}

// Configure error tracking
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', {
    message,
    source,
    lineno,
    colno,
    error,
    timestamp: new Date().toISOString()
  });
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    timestamp: new Date().toISOString()
  });
};

// HMR setup for development
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', (data: any) => {
    console.log('HMR update incoming:', data);
  });

  import.meta.hot.on('vite:afterUpdate', (data: any) => {
    console.log('HMR update applied:', data);
  });

  import.meta.hot.on('vite:error', (data: any) => {
    console.error('HMR error:', data);
  });
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Root error boundary caught error:', {
          error,
          errorInfo,
          timestamp: new Date().toISOString()
        });
      }}
    >
      <SWRConfig 
        value={{ 
          fetcher,
          onError: (error) => {
            console.error('Global SWR error:', {
              error,
              timestamp: new Date().toISOString()
            });
          },
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          shouldRetryOnError: (error) => {
            // Retry on network errors but not on 4xx client errors
            return !(error.status >= 400 && error.status < 500);
          },
          dedupingInterval: 2000,
          focusThrottleInterval: 5000
        }}
      >
        <Switch>
          <Route path="/" component={AuthPage} />
          <Route path="/browse" component={HomePage} />
          <Route path="/movie/:id" component={MoviePage} />
          <Route>
            <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
              404 Page Not Found
            </div>
          </Route>
        </Switch>
        <Toaster />
      </SWRConfig>
    </ErrorBoundary>
  </StrictMode>
);
