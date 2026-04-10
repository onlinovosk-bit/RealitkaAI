"use client";
import { useEffect } from "react";

export default function ToastContainer() {
  useEffect(() => {
    console.log("✅ ToastContainer mounted");
  }, []);
  return <div id="toast-root" />;
}
