import type { OrderStatus } from "./types";

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatPrice(cents: number): string {
  return euroFormatter.format(cents / 100);
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Libellés destinés au client final (page de suivi, emails). */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "En attente de paiement",
  pending: "Commande reçue",
  printing: "En impression",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/** Libellés destinés à l'atelier (back office) : orientés action. */
export const ADMIN_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Paiement en attente",
  pending: "À produire",
  printing: "En impression",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/** Étapes affichées sur la timeline publique de suivi. */
export const TRACKING_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Commande reçue" },
  { status: "printing", label: "En impression" },
  { status: "shipped", label: "Expédiée" },
];
