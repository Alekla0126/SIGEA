"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#0f172a",
        },
      }}
    />
  );
}
