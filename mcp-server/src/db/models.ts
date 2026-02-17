import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const OrderStatus = z.enum([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const ProductCategory = z.enum([
  "electronics",
  "clothing",
  "home_garden",
  "sports",
  "books",
  "toys",
]);
export type ProductCategory = z.infer<typeof ProductCategory>;

// ─── Customer ────────────────────────────────────────────────────────────────

export const CustomerSchema = z.object({
  id: z.string().describe("Customer ID like CUST-001"),
  name: z.string().describe("Full name"),
  email: z.string().email().describe("Customer email address"),
  phone: z.string().describe("Phone number"),
  address: z.string().describe("Shipping address"),
  created_at: z.string().describe("ISO 8601 timestamp"),
});
export type Customer = z.infer<typeof CustomerSchema>;

// ─── Product ─────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  id: z.string().describe("Product ID like PROD-001"),
  name: z.string().describe("Product name"),
  category: ProductCategory,
  price: z.number().positive().describe("Price in USD"),
  stock_quantity: z.number().int().min(0).describe("Units in stock"),
  description: z.string().describe("Product description"),
  warranty_months: z.number().int().min(0).describe("Warranty period in months"),
});
export type Product = z.infer<typeof ProductSchema>;

// ─── Order ───────────────────────────────────────────────────────────────────

export const OrderItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().describe("Order ID like ORD-1001"),
  customer_id: z.string().describe("Reference to customer"),
  customer_email: z.string().email(),
  status: OrderStatus,
  items: z.array(OrderItemSchema).describe("Line items in the order"),
  total_amount: z.number().positive().describe("Order total in USD"),
  shipping_address: z.string(),
  tracking_number: z.string().nullable().describe("Carrier tracking number"),
  estimated_delivery: z.string().nullable().describe("ISO 8601 date"),
  created_at: z.string().describe("ISO 8601 timestamp"),
  updated_at: z.string().describe("ISO 8601 timestamp"),
});
export type Order = z.infer<typeof OrderSchema>;

// ─── Tool Input Schemas (reused by MCP tool definitions) ────────────────────

export const OrderLookupInput = z.object({
  order_id: z.string().optional().describe("Order ID like ORD-1001"),
  email: z.string().email().optional().describe("Customer email address"),
  status: OrderStatus.optional().describe("Filter by order status"),
});
export type OrderLookupInput = z.infer<typeof OrderLookupInput>;

export const InventoryCheckInput = z.object({
  product_id: z.string().optional().describe("Product ID like PROD-001"),
  product_name: z.string().optional().describe("Product name (partial match)"),
  category: ProductCategory.optional().describe("Filter by product category"),
});
export type InventoryCheckInput = z.infer<typeof InventoryCheckInput>;

// ─── SQL Row Types (flat shape from SQLite, before joining) ──────────────────

export interface OrderRow {
  id: string;
  customer_id: string;
  customer_email: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  tracking_number: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: number;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  description: string;
  warranty_months: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}
