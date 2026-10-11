import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { demoRequest, demoStorageKey } from "../src/marketplaceDemo.js";
import { jsonBody, setupBrowserStorage } from "./demoStorage.js";

let localStorage;

beforeEach(() => {
  localStorage = setupBrowserStorage();
});

test("buy-now checkout records an order, drives affinity, and rejects auction-only items", async () => {
  const members = await demoRequest("/api/users");
  const products = await demoRequest("/api/products?buyNow=true");
  const product = products.find((item) => item.category === "Antique Furniture");
  const purchase = await demoRequest("/api/purchases", {
    method: "POST",
    ...jsonBody({ buyerId: members[1].id, productId: product.id }),
  });

  assert.equal(purchase.product.id, product.id);
  const orderHistory = await demoRequest(`/api/users/${members[1].id}/purchases`);
  assert.equal(orderHistory.length, 1);
  const picks = await demoRequest(`/api/recommendations?userId=${members[1].id}&limit=10`);
  assert.ok(picks.some((pick) => pick.categoryMatch));

  await assert.rejects(
    demoRequest("/api/purchases", {
      method: "POST",
      ...jsonBody({ buyerId: members[1].id, productId: 1 }),
    }),
    /not available for buy-it-now/,
  );
  assert.equal(JSON.parse(localStorage.getItem(demoStorageKey(false))).purchases.length, 1);
});
