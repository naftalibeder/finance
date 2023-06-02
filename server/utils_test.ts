import mocha from "mocha";
import { buildFiltersFromQuery, transactionMatchesFilters } from "./utils.js";
// TODO: Fix this error if possible.
// @ts-ignore
import { Transaction } from "shared";

const { describe, it } = mocha;

const transaction: Transaction = {
  accountId: "test-id",
  date: new Date().toISOString(),
  postDate: new Date().toISOString(),
  payee: "DAILYGRINDCOFFEE",
  description: "",
  type: "debit",
  price: { amount: 14.89, currency: "USD" },
};

const matchesQuery = (t: Transaction, q: string) => {
  return transactionMatchesFilters(t, buildFiltersFromQuery(q));
};

describe("filter transactions", () => {
  it("empty query", () => {
    if (!matchesQuery(transaction, "")) {
      throw new Error("did not correctly handle empty query");
    }
  });
  it("price comparison", () => {
    if (!matchesQuery(transaction, "coffee <15")) {
      throw new Error("did not find desired match");
    }
    if (matchesQuery(transaction, "coffee >15")) {
      throw new Error("found illegal match");
    }
  });
});
