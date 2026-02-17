/**
 * Quick smoke test for database tools (order-lookup, inventory-check).
 * Run with: npx tsx tests/test-tools.ts
 */

import { orderLookup } from "../src/tools/order-lookup.js";
import { inventoryCheck } from "../src/tools/inventory-check.js";
import { closeDb } from "../src/db/connection.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

// ─── Order Lookup ────────────────────────────────────────────────────────────

console.log("\n=== Order Lookup ===");

const byId = orderLookup({ order_id: "ORD-1001" });
assert(byId.length === 1, "Finds order by ID");
assert(byId[0]!.id === "ORD-1001", "Correct order ID returned");
assert(byId[0]!.items.length > 0, "Order has line items");
assert(typeof byId[0]!.total_amount === "number", "Total amount is a number");

const byEmail = orderLookup({ email: "alice.johnson@email.com" });
assert(byEmail.length >= 0, "Email lookup returns array");
for (const o of byEmail) {
  assert(o.customer_email === "alice.johnson@email.com", `Order ${o.id} has correct email`);
}

const shipped = orderLookup({ status: "shipped" });
assert(shipped.length > 0, "Finds shipped orders");
for (const o of shipped) {
  assert(o.status === "shipped", `Order ${o.id} is shipped`);
  assert(o.tracking_number !== null, `Shipped order ${o.id} has tracking number`);
}

const noParams = orderLookup({});
assert(noParams.length === 0, "No params returns empty array");

const notFound = orderLookup({ order_id: "ORD-9999" });
assert(notFound.length === 0, "Non-existent order returns empty array");

// ─── Inventory Check ─────────────────────────────────────────────────────────

console.log("\n=== Inventory Check ===");

const prod007 = inventoryCheck({ product_id: "PROD-007" });
assert(prod007.length === 1, "Finds product by ID");
assert(prod007[0]!.name === "Running Shoes Ultra", "Correct product name");
assert(prod007[0]!.stock_quantity === 0, "PROD-007 is out of stock");
assert(prod007[0]!.in_stock === false, "in_stock flag is false for 0 quantity");

const headphones = inventoryCheck({ product_name: "Headphone" });
assert(headphones.length >= 1, "Partial name match finds headphones");
assert(headphones[0]!.name.toLowerCase().includes("headphone"), "Result contains 'headphone'");
assert(headphones[0]!.in_stock === true, "Headphones are in stock");

const electronics = inventoryCheck({ category: "electronics" });
assert(electronics.length === 4, "4 electronics products exist");
for (const p of electronics) {
  assert(p.category === "electronics", `${p.name} is in electronics category`);
}

const noParamsInv = inventoryCheck({});
assert(noParamsInv.length === 0, "No params returns empty array");

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

closeDb();

if (failed > 0) {
  process.exit(1);
}
