import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { demoRequest, demoStorageKey } from "../src/marketplaceDemo.js";
import { jsonBody, setupBrowserStorage } from "./demoStorage.js";

let localStorage;

beforeEach(() => {
  localStorage = setupBrowserStorage();
});

test("theme inventories persist independently and unsupported calls fail clearly", async () => {
  const artProducts = await demoRequest("/api/products?buyNow=true", {}, false);
  const pixelProducts = await demoRequest("/api/products?buyNow=true", {}, true);
  const pixelUsers = await demoRequest("/api/users", {
    method: "POST",
    ...jsonBody({ displayName: "Pixel Collector", email: "pixel@example.test" }),
  }, true);

  assert.ok(artProducts.some((product) => product.category === "Ceramics"));
  assert.ok(pixelProducts.some((product) => product.category === "Retro Games"));
  assert.equal(pixelUsers.displayName, "Pixel Collector");
  assert.equal(JSON.parse(localStorage.getItem(demoStorageKey(false))).users.length, 2);
  assert.equal(JSON.parse(localStorage.getItem(demoStorageKey(true))).users.length, 3);
  await assert.rejects(demoRequest("/api/unknown"), /does not implement GET \/unknown/);
});
