"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ChartErrorBoundary — wraps individual chart sections so a single failing
 * chart doesn't crash the entire analytics page.
 */
export class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; title?: string },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ChartErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50/40 px-6 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">
              {this.props.title ? `${this.props.title} failed to load` : "Chart failed to load"}
            </p>
            <p className="text-xs text-red-500 mt-1 max-w-xs mx-auto">
              {this.state.errorMessage || "An unexpected error occurred rendering this chart."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
