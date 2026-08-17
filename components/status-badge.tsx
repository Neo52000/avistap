import { ADMIN_STATUS_LABELS } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const BADGE_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: "bg-canvas text-ink-muted",
  pending: "bg-accent-soft text-accent-strong",
  printing: "bg-info-soft text-info",
  shipped: "bg-success-soft text-success",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[status]}`}
    >
      {ADMIN_STATUS_LABELS[status]}
    </span>
  );
}
