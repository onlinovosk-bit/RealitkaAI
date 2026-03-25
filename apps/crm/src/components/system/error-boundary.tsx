"use client";

import { Component, ReactNode } from "react";
import { logError } from "@/lib/logger";

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    logError("UI Error Boundary", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center text-sm text-red-500">
          Nastala chyba v aplikácii.
        </div>
      );
    }

    return this.props.children;
  }
}
