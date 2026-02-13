"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--card-foreground)",
        },
      }}
    />
  );
}
