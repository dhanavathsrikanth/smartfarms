"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  errorMessage: string;
}

interface Props {
  children: React.ReactNode;
  title?: string;
  /** Optional fallback to render instead of the default error card */
  fallback?: React.ReactNode;
}

/**
 * AnalyticsErrorBoundary
 * Wraps analytics sections so a single failing chart/widget doesn't crash the
 * whole page. Shows a clean error card with an inline Retry button.
 *
 * Usage:
 *   <AnalyticsErrorBoundary title="Monthly P&L">
 *     <MonthlyPLChart ... />
 *   </AnalyticsErrorBoundary>
 */
export class AnalyticsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AnalyticsErrorBoundary]", error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50/40 px-6 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">
              {this.props.title
                ? `${this.props.title} failed to load`
                : "Chart failed to load"}
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-red-400 mt-1 max-w-xs mx-auto">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <button
            onClick={this.handleRetry}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
