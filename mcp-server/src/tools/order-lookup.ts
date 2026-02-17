/**
 * Order Lookup Tool
 *
 * Queries the SQLite database for orders by ID, customer email, or status.
 * Returns full order details including line items.
 *
 * This is the most common support tool — "where's my order?", "show me
 * orders for alice@email.com", "what orders are pending?"
 */

import { getDb } from "../db/connection.js";
import type { OrderRow, OrderItemRow, OrderLookupInput } from "../db/models.js";

export interface OrderResult {
  id: string;
  customer_id: string;
  customer_email: string;
  status: string;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
  total_amount: number;
  shipping_address: string;
  tracking_number: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Look up orders with optional filters.
 * Builds dynamic SQL based on which parameters are provided.
 * Returns orders with their line items joined.
 */
export function orderLookup(input: OrderLookupInput): OrderResult[] {
  const db = getDb();

  // Build WHERE clause dynamically
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (input.order_id) {
    conditions.push("o.id = ?");
    params.push(input.order_id);
  }

  if (input.email) {
    conditions.push("o.customer_email = ?");
    params.push(input.email);
  }

  if (input.status) {
    conditions.push("o.status = ?");
    params.push(input.status);
  }

  // If no filters provided, return a helpful message via empty result
  if (conditions.length === 0) {
    return [];
  }

  const whereClause = conditions.join(" AND ");

  // Query orders
  const orders = db
    .prepare(`SELECT * FROM orders o WHERE ${whereClause} ORDER BY o.created_at DESC LIMIT 20`)
    .all(...params) as OrderRow[];

  if (orders.length === 0) {
    return [];
  }

  // Query items for all matching orders
  const orderIds = orders.map((o) => o.id);
  const placeholders = orderIds.map(() => "?").join(", ");
  const items = db
    .prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`)
    .all(...orderIds) as OrderItemRow[];

  // Group items by order_id
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) {
    const existing = itemsByOrder.get(item.order_id) || [];
    existing.push(item);
    itemsByOrder.set(item.order_id, existing);
  }

  // Assemble results
  return orders.map((order) => ({
    id: order.id,
    customer_id: order.customer_id,
    customer_email: order.customer_email,
    status: order.status,
    items: (itemsByOrder.get(order.id) || []).map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    tracking_number: order.tracking_number,
    estimated_delivery: order.estimated_delivery,
    created_at: order.created_at,
    updated_at: order.updated_at,
  }));
}
