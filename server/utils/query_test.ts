import mocha from "mocha";
import { buildFiltersFromQuery, transactionMatchesFilters } from "./query";
// TODO: Fix this error if possible.
// @ts-ignore
import { Transaction } from "shared";
import { randomUUID } from "crypto";

const { describe, it } = mocha;

let query = "";

const transaction: Transaction = {
  _id: randomUUID(),
  _createdAt: new Date(2011, 2, 3).toISOString(),
  _updatedAt: new Date(2012, 4, 5).toISOString(),
  accountId: randomUUID(),
  date: new Date(2011, 2, 3).toISOString(),
  postDate: new Date(2011, 2, 3).toISOString(),
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
    query = "coffee <15";
    if (!matchesQuery(transaction, query)) {
      throw new Error(`did not find desired match for ${query}`);
    }

    query = "coffee >15";
    if (matchesQuery(transaction, query)) {
      throw new Error(`found illegal match for ${query}`);
    }

    query = "14.10-15";
    if (!matchesQuery(transaction, query)) {
      throw new Error(`did not find desired match for ${query}`);
    }

    query = "14.90-15";
    if (matchesQuery(transaction, query)) {
      throw new Error(`found illegal match for ${query}`);
    }
  });

  it("date comparison", () => {
    query = "<2012/03";
    if (!matchesQuery(transaction, query)) {
      throw new Error(`did not find desired match for ${query}`);
    }

    query = ">2012/03";
    if (matchesQuery(transaction, query)) {
      throw new Error(`found illegal match for ${query}`);
    }
  });
});
