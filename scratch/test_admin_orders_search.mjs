import assert from "assert";

function filterOrders(orders, searchQuery, statusFilter = "All") {
  let items = [...orders];

  if (statusFilter !== "All") {
    items = items.filter((o) => o.status === statusFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    const qClean = q.replace(/[^a-z0-9]/g, "");
    const qNoHash = q.replace(/^#/, "");

    items = items.filter((order) => {
      const id = String(order._id || "").toLowerCase();
      const shortId = id.slice(-6);
      const name = (order.customerName || order.userId?.name || "").toLowerCase();
      const phone = (order.customerPhone || order.address?.phone || order.userId?.phone || "").toLowerCase();
      const cleanPhone = phone.replace(/\D/g, "");

      return (
        id.includes(q) ||
        (qNoHash && id.includes(qNoHash)) ||
        shortId.includes(qNoHash) ||
        name.includes(q) ||
        phone.includes(q) ||
        (qClean && cleanPhone.includes(qClean))
      );
    });
  }

  return items;
}

const mockOrders = [
  {
    _id: "67b93ab89c7cacd7eb019490",
    customerName: "Rohan Pharswan",
    customerPhone: "+91 8077308953",
    status: "Confirmed",
    totalAmount: 950
  },
  {
    _id: "67b93ab89c7cacd7eb028881",
    customerName: "Pooja Sharma",
    customerPhone: "9411395022",
    status: "Pending",
    totalAmount: 420
  },
  {
    _id: "67b93ab89c7cacd7eb039999",
    customerName: "Amit Verma",
    customerPhone: "9876543210",
    status: "Delivered",
    totalAmount: 1200
  }
];

console.log("=== TESTING ADMIN ORDERS SEARCH LOGIC ===\n");

// 1. Search by short ID with hash
const r1 = filterOrders(mockOrders, "#eb019490");
assert.strictEqual(r1.length, 1, "Must find order by short ID with hash");
assert.strictEqual(r1[0].customerName, "Rohan Pharswan");
console.log("✓ 1. Search by short ID '#eb019490' passed");

// 2. Search by 6-char short ID without hash
const r2 = filterOrders(mockOrders, "eb028881");
assert.strictEqual(r2.length, 1, "Must find order by 6-char short ID");
assert.strictEqual(r2[0].customerName, "Pooja Sharma");
console.log("✓ 2. Search by 6-char short ID 'eb028881' passed");

// 3. Search by full MongoDB _id
const r3 = filterOrders(mockOrders, "67b93ab89c7cacd7eb039999");
assert.strictEqual(r3.length, 1, "Must find order by full _id");
assert.strictEqual(r3[0].customerName, "Amit Verma");
console.log("✓ 3. Search by full _id passed");

// 4. Search by customer name (case-insensitive & partial)
const r4 = filterOrders(mockOrders, "rohan");
assert.strictEqual(r4.length, 1, "Must find order by lowercase customer name");
assert.strictEqual(r4[0].customerName, "Rohan Pharswan");
console.log("✓ 4. Search by customer name 'rohan' passed");

// 5. Search by formatted phone number with spaces
const r5 = filterOrders(mockOrders, "8077 308 953");
assert.strictEqual(r5.length, 1, "Must find order by phone with spaces");
assert.strictEqual(r5[0].customerName, "Rohan Pharswan");
console.log("✓ 5. Search by spaced phone '8077 308 953' passed");

// 6. Search with status filter combined
const r6 = filterOrders(mockOrders, "verma", "Delivered");
assert.strictEqual(r6.length, 1, "Must match name and status filter");
const r6b = filterOrders(mockOrders, "verma", "Pending");
assert.strictEqual(r6b.length, 0, "Must not match when status filter differs");
console.log("✓ 6. Search combined with status filters passed");

// 7. Non-matching query
const r7 = filterOrders(mockOrders, "nonexistent12345");
assert.strictEqual(r7.length, 0, "Non-matching search must return 0 items");
console.log("✓ 7. Non-matching query correctly returns 0 results");

console.log("\n>>> ALL ADMIN ORDERS SEARCH TESTS PASSED! <<<");
