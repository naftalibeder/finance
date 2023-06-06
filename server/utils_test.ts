import mocha from "mocha";
import { buildFiltersFromQuery, transactionMatchesFilters } from "./utils.js";
// TODO: Fix this error if possible.
// @ts-ignore
import { Transaction } from "shared";
import { randomUUID } from "crypto";

const { describe, it } = mocha;

let query = "";

const transaction: Transaction = {
  _id: randomUUID(),
  _createdAt: new Date().toISOString(),
  _updatedAt: new Date().toISOString(),
  accountId: "test-id",
  date: new Date().toISOString(),
  postDate: new Date().toISOString(),
  payee: "DAILYGRINDCOFFEE",
  description: "",
  type: "debit",
  price: {
    amount: 14.89,
    currency: "USD",
  },
};

const matchesQuery = (t: Transaction, q: string) => {
  return transactionMatchesFilters(t, buildFiltersFromQuery(q));
};

describe("filter transactions", () => {
  it("empty query", () => {
    query = "";
    if (!matchesQuery(transaction, query)) {
      throw new Error("did not correctly handle empty query");
    }
  });

  it("price comparison", () => {
    let query = "coffee <15";
    if (!matchesQuery(transaction, query)) {
      throw new Error(`did not find desired match for ${query}`);
    }

    query = "coffee >15";
    if (matchesQuery(transaction, query)) {
      throw new Error(`found illegal match for ${query}`);
    }

    query = "14.20-15";
    if (matchesQuery(transaction, query)) {
      throw new Error(`did not find desired match for ${query}`);
    }
  });
});
