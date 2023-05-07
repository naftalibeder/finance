import fs from "fs";
import path from "path";
import * as eta from "eta";
import db from "../db";

const renderHome = () => {
  const template = fs.readFileSync(path.resolve(__dirname, "home.eta"), {
    encoding: "utf-8",
  });

  const accounts = db.getAccounts();
  const transactions = db.getTransactions();
  const data = {
    accounts,
    transactions,
  };

  const home = eta.render(template, data);
  return home;
};

export { renderHome };
