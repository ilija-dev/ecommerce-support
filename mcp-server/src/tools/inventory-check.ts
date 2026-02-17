/**
 * Inventory Check Tool
 *
 * Queries product stock levels by product ID, name (partial match), or category.
 * Returns product details including current stock, price, and warranty info.
 *
 * Common scenarios:
 *   - "Is the wireless headphones in stock?"
 *   - "What electronics do you have?"
 *   - "Do you have a replacement for PROD-007?"
 */

import { getDb } from "../db/connection.js";
import type { ProductRow, InventoryCheckInput } from "../db/models.js";

export interface InventoryResult {
  id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  in_stock: boolean;
  description: string;
  warranty_months: number;
}

/**
 * Check inventory with optional filters.
 * Supports exact ID lookup, partial name matching (LIKE), and category filtering.
 */
export function inventoryCheck(input: InventoryCheckInput): InventoryResult[] {
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (input.product_id) {
    conditions.push("id = ?");
    params.push(input.product_id);
  }

  if (input.product_name) {
    conditions.push("name LIKE ?");
    params.push(`%${input.product_name}%`);
  }

  if (input.category) {
    conditions.push("category = ?");
    params.push(input.category);
  }

  if (conditions.length === 0) {
    return [];
  }

  const whereClause = conditions.join(" AND ");

  const products = db
    .prepare(`SELECT * FROM products WHERE ${whereClause} ORDER BY name LIMIT 20`)
    .all(...params) as ProductRow[];

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    stock_quantity: product.stock_quantity,
    in_stock: product.stock_quantity > 0,
    description: product.description,
    warranty_months: product.warranty_months,
  }));
}
