import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { demoRequest, demoStorageKey } from "../src/marketplaceDemo.js";
import { jsonBody, setupBrowserStorage } from "./demoStorage.js";

let localStorage;

beforeEach(() => {
  localStorage = setupBrowserStorage();
});

test("collector signup, bidding, rejected bidder, and read-back persist", async () => {
  const account = await demoRequest("/api/users", {
    method: "POST",
    ...jsonBody({ displayName: "Test Collector", email: "test@example.test" }),
  });
  const auction = (await demoRequest("/api/auctions?activeOnly=true"))[0];
  const bid = await demoRequest(`/api/auctions/${auction.id}/bids`, {
    method: "POST",
    ...jsonBody({ bidderId: account.id, amount: Number(auction.currentHighestPrice) + 10 }),
  });

  assert.equal(bid.bidder.id, account.id);
  await assert.rejects(
    demoRequest(`/api/auctions/${auction.id}/bids`, {
      method: "POST",
      ...jsonBody({ bidderId: -1, amount: Number(bid.amount) + 10 }),
    }),
    /Bidder not found/,
  );

  const savedData = JSON.parse(localStorage.getItem(demoStorageKey(false)));
  const restoredUsers = await demoRequest("/api/users");
  const restoredAuctions = await demoRequest("/api/auctions?activeOnly=true");
  assert.ok(restoredUsers.some((user) => user.email === account.email));
  assert.equal(savedData.bids.length, 1);
  assert.equal(restoredAuctions[0].currentHighestPrice, bid.amount);
});
