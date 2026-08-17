export type OrderStatus =
  | "awaiting_payment"
  | "pending"
  | "printing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  base_price_cents: number;
  plaque_count: number;
  image_url: string | null;
  active: boolean;
  sort_order: number;
};

export type ProductOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

export type ShippingAddress = {
  line1: string;
  line2?: string | null;
  postal_code: string;
  city: string;
  country: string;
};

export type Order = {
  id: string;
  order_number: string;
  public_token: string;
  customer_email: string;
  customer_name: string | null;
  business_name: string;
  phone: string | null;
  shipping_address: ShippingAddress | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_amount_cents: number;
  status: OrderStatus;
  google_business_link: string | null;
  logo_url: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  tracking_number: string | null;
  carrier: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  customizations: {
    options?: { slug: string; name: string; price_cents: number }[];
    plaque_count?: number;
  };
};

export type OrderEvent = {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  actor: string | null;
  created_at: string;
};

export type NfcLink = {
  id: string;
  slug: string;
  order_id: string | null;
  target_url: string;
  active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
};

/** Retour de la RPC publique `get_order_tracking`. */
export type OrderTracking = {
  order_number: string;
  business_name: string;
  status: OrderStatus;
  created_at: string;
  tracking_number: string | null;
  carrier: string | null;
  events: { to_status: OrderStatus; note: string | null; created_at: string }[];
};
