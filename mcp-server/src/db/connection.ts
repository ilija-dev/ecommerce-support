import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

let db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection.
 * Creates the data directory and tables on first call.
 */
export function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  const dbDir = path.dirname(config.db.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.db.path);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initTables(db);

  return db;
}

/**
 * Create tables if they don't exist.
 * Schema mirrors a simplified e-commerce ERP (like D365 Sales Orders).
 */
function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      phone       TEXT NOT NULL,
      address     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      category         TEXT NOT NULL,
      price            REAL NOT NULL CHECK (price > 0),
      stock_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      description      TEXT NOT NULL,
      warranty_months  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                 TEXT PRIMARY KEY,
      customer_id        TEXT NOT NULL REFERENCES customers(id),
      customer_email     TEXT NOT NULL,
      status             TEXT NOT NULL DEFAULT 'pending',
      total_amount       REAL NOT NULL CHECK (total_amount > 0),
      shipping_address   TEXT NOT NULL,
      tracking_number    TEXT,
      estimated_delivery TEXT,
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     TEXT NOT NULL REFERENCES orders(id),
      product_id   TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity     INTEGER NOT NULL CHECK (quantity > 0),
      unit_price   REAL NOT NULL CHECK (unit_price > 0)
    );

    -- Indexes for common query patterns (order lookup by email, status)
    CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  `);
}

/**
 * Close the database connection (for cleanup/testing).
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
