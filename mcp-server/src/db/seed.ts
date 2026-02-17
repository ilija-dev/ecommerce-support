/**
 * Seed script — generates realistic e-commerce mock data.
 * Run with: npm run seed (or: npx tsx src/db/seed.ts)
 *
 * Generates:
 *   - 10 customers
 *   - 20 products across 6 categories
 *   - 50 orders with 1-3 line items each
 */

import { getDb, closeDb } from "./connection.js";
import type { CustomerRow, ProductRow, OrderRow, OrderItemRow } from "./models.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  return date.toISOString();
}

function futureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysFromNow));
  return date.toISOString().split("T")[0]!;
}

function padId(prefix: string, n: number, width = 3): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

// ─── Customer Data ───────────────────────────────────────────────────────────

const CUSTOMERS: CustomerRow[] = [
  { id: "CUST-001", name: "Alice Johnson", email: "alice.johnson@email.com", phone: "555-0101", address: "123 Oak St, Portland, OR 97201", created_at: randomDate(365) },
  { id: "CUST-002", name: "Bob Martinez", email: "bob.martinez@email.com", phone: "555-0102", address: "456 Pine Ave, Seattle, WA 98101", created_at: randomDate(365) },
  { id: "CUST-003", name: "Carol Chen", email: "carol.chen@email.com", phone: "555-0103", address: "789 Elm Blvd, San Francisco, CA 94102", created_at: randomDate(365) },
  { id: "CUST-004", name: "David Kim", email: "david.kim@email.com", phone: "555-0104", address: "321 Maple Dr, Austin, TX 78701", created_at: randomDate(365) },
  { id: "CUST-005", name: "Emma Wilson", email: "emma.wilson@email.com", phone: "555-0105", address: "654 Cedar Ln, Denver, CO 80201", created_at: randomDate(365) },
  { id: "CUST-006", name: "Frank Lopez", email: "frank.lopez@email.com", phone: "555-0106", address: "987 Birch Ct, Chicago, IL 60601", created_at: randomDate(365) },
  { id: "CUST-007", name: "Grace Patel", email: "grace.patel@email.com", phone: "555-0107", address: "147 Walnut Way, Boston, MA 02101", created_at: randomDate(365) },
  { id: "CUST-008", name: "Henry Nguyen", email: "henry.nguyen@email.com", phone: "555-0108", address: "258 Spruce Rd, Miami, FL 33101", created_at: randomDate(365) },
  { id: "CUST-009", name: "Isabelle Brown", email: "isabelle.brown@email.com", phone: "555-0109", address: "369 Ash Pl, Nashville, TN 37201", created_at: randomDate(365) },
  { id: "CUST-010", name: "James Taylor", email: "james.taylor@email.com", phone: "555-0110", address: "741 Willow St, Phoenix, AZ 85001", created_at: randomDate(365) },
];

// ─── Product Data ────────────────────────────────────────────────────────────

const PRODUCTS: ProductRow[] = [
  // Electronics
  { id: "PROD-001", name: "Wireless Bluetooth Headphones", category: "electronics", price: 79.99, stock_quantity: 150, description: "Over-ear wireless headphones with noise cancellation and 30-hour battery life", warranty_months: 12 },
  { id: "PROD-002", name: "USB-C Fast Charger 65W", category: "electronics", price: 34.99, stock_quantity: 300, description: "GaN USB-C charger compatible with laptops, phones, and tablets", warranty_months: 24 },
  { id: "PROD-003", name: "4K Webcam Pro", category: "electronics", price: 129.99, stock_quantity: 75, description: "4K resolution webcam with auto-focus and built-in ring light", warranty_months: 12 },
  { id: "PROD-004", name: "Portable SSD 1TB", category: "electronics", price: 89.99, stock_quantity: 200, description: "USB 3.2 portable solid state drive with read speeds up to 1050 MB/s", warranty_months: 36 },

  // Clothing
  { id: "PROD-005", name: "Merino Wool Sweater", category: "clothing", price: 89.99, stock_quantity: 60, description: "Lightweight merino wool crew neck sweater, machine washable", warranty_months: 0 },
  { id: "PROD-006", name: "Waterproof Rain Jacket", category: "clothing", price: 149.99, stock_quantity: 45, description: "Breathable waterproof jacket with sealed seams and adjustable hood", warranty_months: 6 },
  { id: "PROD-007", name: "Running Shoes Ultra", category: "clothing", price: 119.99, stock_quantity: 0, description: "Carbon-plate running shoes with responsive foam cushioning", warranty_months: 6 },

  // Home & Garden
  { id: "PROD-008", name: "Smart LED Bulb Pack (4)", category: "home_garden", price: 39.99, stock_quantity: 500, description: "WiFi-enabled color-changing LED bulbs, compatible with Alexa and Google Home", warranty_months: 24 },
  { id: "PROD-009", name: "Ceramic Plant Pot Set", category: "home_garden", price: 44.99, stock_quantity: 120, description: "Set of 3 minimalist ceramic pots with drainage holes and bamboo saucers", warranty_months: 0 },
  { id: "PROD-010", name: "Robot Vacuum Cleaner", category: "home_garden", price: 299.99, stock_quantity: 30, description: "Smart robot vacuum with LiDAR navigation, auto-empty dock, and app control", warranty_months: 12 },
  { id: "PROD-011", name: "Stainless Steel Cookware Set", category: "home_garden", price: 199.99, stock_quantity: 40, description: "10-piece tri-ply stainless steel cookware set, oven-safe to 500°F", warranty_months: 60 },

  // Sports
  { id: "PROD-012", name: "Yoga Mat Premium", category: "sports", price: 49.99, stock_quantity: 200, description: "6mm thick non-slip yoga mat with alignment markers and carrying strap", warranty_months: 12 },
  { id: "PROD-013", name: "Adjustable Dumbbell Set", category: "sports", price: 249.99, stock_quantity: 15, description: "Adjustable dumbbells 5-50 lbs each with quick-change weight system", warranty_months: 24 },
  { id: "PROD-014", name: "Insulated Water Bottle 32oz", category: "sports", price: 29.99, stock_quantity: 350, description: "Double-wall vacuum insulated stainless steel bottle, keeps drinks cold 24hrs", warranty_months: 12 },

  // Books
  { id: "PROD-015", name: "The Art of Clean Code", category: "books", price: 34.99, stock_quantity: 100, description: "Comprehensive guide to writing maintainable, readable software", warranty_months: 0 },
  { id: "PROD-016", name: "Designing Data-Intensive Applications", category: "books", price: 44.99, stock_quantity: 80, description: "Deep dive into the architecture of modern data systems", warranty_months: 0 },
  { id: "PROD-017", name: "AI Engineering Handbook", category: "books", price: 54.99, stock_quantity: 60, description: "Practical guide to building production AI systems and ML pipelines", warranty_months: 0 },

  // Toys
  { id: "PROD-018", name: "Building Block Set (500 pcs)", category: "toys", price: 39.99, stock_quantity: 90, description: "Compatible building block set with 500 pieces and instruction booklet", warranty_months: 0 },
  { id: "PROD-019", name: "RC Racing Drone", category: "toys", price: 79.99, stock_quantity: 25, description: "FPV racing drone with 720p camera and 15-minute flight time", warranty_months: 6 },
  { id: "PROD-020", name: "Board Game Collection", category: "toys", price: 59.99, stock_quantity: 70, description: "Collection of 10 classic board games in a wooden storage box", warranty_months: 0 },
];

// ─── Order Generation ────────────────────────────────────────────────────────

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled", "returned"] as const;
const STATUS_WEIGHTS = [0.1, 0.15, 0.2, 0.35, 0.1, 0.1]; // Mostly delivered/shipped

function weightedStatus(): string {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    cumulative += STATUS_WEIGHTS[i]!;
    if (r <= cumulative) return STATUSES[i]!;
  }
  return "pending";
}

function generateTrackingNumber(): string {
  const carriers = ["1Z", "94", "JD"];
  const carrier = pick(carriers);
  const digits = Array.from({ length: 12 }, () => randomInt(0, 9)).join("");
  return `${carrier}${digits}`;
}

interface GeneratedOrder {
  order: OrderRow;
  items: Omit<OrderItemRow, "id">[];
}

function generateOrders(count: number): GeneratedOrder[] {
  const orders: GeneratedOrder[] = [];

  for (let i = 1; i <= count; i++) {
    const customer = pick(CUSTOMERS);
    const status = weightedStatus();
    const numItems = randomInt(1, 3);
    const createdAt = randomDate(90); // Orders from the last 90 days

    // Pick random products for line items
    const selectedProducts = new Set<number>();
    while (selectedProducts.size < numItems) {
      selectedProducts.add(randomInt(0, PRODUCTS.length - 1));
    }

    const items: Omit<OrderItemRow, "id">[] = [];
    let totalAmount = 0;
    const orderId = padId("ORD", 1000 + i, 4);

    for (const idx of selectedProducts) {
      const product = PRODUCTS[idx]!;
      const quantity = randomInt(1, 3);
      const unitPrice = product.price;
      totalAmount += unitPrice * quantity;
      items.push({
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
      });
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    const hasTracking = status === "shipped" || status === "delivered";
    const hasEstimatedDelivery = status === "shipped" || status === "processing";

    orders.push({
      order: {
        id: orderId,
        customer_id: customer.id,
        customer_email: customer.email,
        status,
        total_amount: totalAmount,
        shipping_address: customer.address,
        tracking_number: hasTracking ? generateTrackingNumber() : null,
        estimated_delivery: hasEstimatedDelivery ? futureDate(14) : null,
        created_at: createdAt,
        updated_at: createdAt,
      },
      items,
    });
  }

  return orders;
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

function seed(): void {
  const db = getDb();

  console.log("Seeding database...\n");

  // Clear existing data (order matters for foreign keys)
  db.exec("DELETE FROM order_items");
  db.exec("DELETE FROM orders");
  db.exec("DELETE FROM products");
  db.exec("DELETE FROM customers");

  // Insert customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, email, phone, address, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertCustomers = db.transaction(() => {
    for (const c of CUSTOMERS) {
      insertCustomer.run(c.id, c.name, c.email, c.phone, c.address, c.created_at);
    }
  });
  insertCustomers();
  console.log(`  Inserted ${CUSTOMERS.length} customers`);

  // Insert products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, category, price, stock_quantity, description, warranty_months)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProducts = db.transaction(() => {
    for (const p of PRODUCTS) {
      insertProduct.run(p.id, p.name, p.category, p.price, p.stock_quantity, p.description, p.warranty_months);
    }
  });
  insertProducts();
  console.log(`  Inserted ${PRODUCTS.length} products`);

  // Generate and insert orders
  const generatedOrders = generateOrders(50);

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, customer_id, customer_email, status, total_amount, shipping_address, tracking_number, estimated_delivery, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  let totalItems = 0;
  const insertAllOrders = db.transaction(() => {
    for (const { order, items } of generatedOrders) {
      insertOrder.run(
        order.id, order.customer_id, order.customer_email, order.status,
        order.total_amount, order.shipping_address, order.tracking_number,
        order.estimated_delivery, order.created_at, order.updated_at
      );
      for (const item of items) {
        insertItem.run(item.order_id, item.product_id, item.product_name, item.quantity, item.unit_price);
        totalItems++;
      }
    }
  });
  insertAllOrders();
  console.log(`  Inserted ${generatedOrders.length} orders with ${totalItems} line items`);

  // Print summary
  const counts = {
    customers: db.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number },
    products: db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number },
    orders: db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number },
    items: db.prepare("SELECT COUNT(*) as count FROM order_items").get() as { count: number },
  };

  console.log("\n── Database Summary ──");
  console.log(`  Customers:   ${counts.customers.count}`);
  console.log(`  Products:    ${counts.products.count}`);
  console.log(`  Orders:      ${counts.orders.count}`);
  console.log(`  Order Items: ${counts.items.count}`);

  // Show status distribution
  const statusDist = db.prepare(
    "SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC"
  ).all() as { status: string; count: number }[];
  console.log("\n── Order Status Distribution ──");
  for (const row of statusDist) {
    console.log(`  ${row.status.padEnd(12)} ${row.count}`);
  }

  // Show a sample order
  const sampleOrder = db.prepare("SELECT * FROM orders LIMIT 1").get() as OrderRow;
  const sampleItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(sampleOrder.id);
  console.log("\n── Sample Order ──");
  console.log(`  ${JSON.stringify(sampleOrder, null, 2)}`);
  console.log(`  Items: ${JSON.stringify(sampleItems, null, 2)}`);

  closeDb();
  console.log("\nDone! Database seeded successfully.");
}

seed();
