import fs from "fs";
import path from "path";
import * as eta from "eta";
import db from "../db";
import { Price } from "../types";

const renderHome = () => {
  const template = fs.readFileSync(path.resolve(__dirname, "home.eta"), {
    encoding: "utf-8",
  });

  const accounts = db.getAccounts();
  const transactions = db.getTransactions();
  const data = {
    accounts,
    transactions,
    formatCurrency: (a: Price) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: a.currency,
      }).format(a.amount),
  };

  const home = eta.render(template, data);
  return home;
};

export { renderHome };
