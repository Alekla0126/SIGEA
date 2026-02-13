import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { recordStatusLabel } from "@/lib/labels";

type BadgeVariant = "default" | "draft" | "ready" | "changes" | "approved";

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-slate-200 text-slate-800",
  draft: "bg-slate-200 text-slate-800",
  ready: "bg-amber-100 text-amber-800",
  changes: "bg-rose-100 text-rose-800",
  approved: "bg-emerald-100 text-emerald-800",
};

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", variantClass.default, className)} {...props} />;
}

export function StatusBadge({ status }: { status: "DRAFT" | "READY" | "NEEDS_CHANGES" | "APPROVED" }) {
  const variant: BadgeVariant =
    status === "READY"
      ? "ready"
      : status === "NEEDS_CHANGES"
        ? "changes"
        : status === "APPROVED"
          ? "approved"
          : "draft";

  return <Badge className={variantClass[variant]}>{recordStatusLabel(status)}</Badge>;
}
