"use client";
import { useEffect, useState } from "react";
import { toastStore } from "./toastStore";

export function useToast() {
  const [toasts, setToasts] = useState(toastStore.get());

  useEffect(() => {
    return toastStore.subscribe(() => {
      setToasts([...toastStore.get()]);
    });
  }, []);

  return {
    toasts,
    success: (message: string) => toastStore.push({ message, type: "success" }),
    error: (message: string) => toastStore.push({ message, type: "error" }),
  };
}
