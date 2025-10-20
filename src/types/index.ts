// Core ecommerce types
export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  image?: string;
  status: "active" | "inactive" | "draft";
  created_at: Date;
  updated_at: Date;
}

export interface ProductMedia {
  id: string;
  product_id: string;
  blob_url: string;
  alt: string;
  sort: number;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  display_name: string;
  sort_order: number;
  created_at: Date;
  values?: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  is_default: boolean;
  is_sold_out: boolean;
  sort_order: number;
  created_at: Date;
}

export interface Price {
  id: string;
  product_id: string;
  currency: string;
  amount: number;
  compare_at_amount?: number;
  starts_at?: Date;
  ends_at?: Date;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  parent_id?: string;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  created_at: Date;
}

export interface Cart {
  id: string;
  customer_id?: string;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_amount: number;
  selected_options?: Record<string, string>; // option_name -> option_value mapping (e.g., "crystal_type" -> "rose_quartz")
  descriptive_title?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  status:
    | "created"
    | "paid"
    | "fulfilled"
    | "completed"
    | "cancelled"
    | "refunded";
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  payment_intent_id?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_amount: number;
  selected_options?: Record<string, string>; // option_name -> option_value mapping
  descriptive_title?: string;
}

export interface Promotion {
  id: string;
  code: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  starts_at?: Date;
  ends_at?: Date;
  usage_limit?: number;
  used: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
