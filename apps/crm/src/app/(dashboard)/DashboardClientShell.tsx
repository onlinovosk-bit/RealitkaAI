"use client";
import React, { Component, type ErrorInfo, type ReactNode } from "react";

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard client error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="mx-auto max-w-md text-center">
            <h2 className="text-lg font-bold text-gray-100">
              Niečo sa pokazilo
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Časť stránky sa nepodarila zobraziť. Skúste obnoviť.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#22d3ee",
              }}
            >
              Obnoviť
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function DashboardClientShell({ children }: { userId?: string, children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary>
      {children}
    </DashboardErrorBoundary>
  );
}