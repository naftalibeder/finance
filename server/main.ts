import express from "express";
import extractor from "./extractor";
import db from "./db";

const main = async () => {
  const port = process.env.SERVER_PORT;

  const app = express();

  app.use(express.static("../client/dist"));

  app.post("/extract", async (req, res) => {
    await extractor.run();
    res.send("Extraction complete.");
  });

  app.post("/accounts", async (req, res) => {
    const accounts = db.getAccounts();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(accounts);
  });

  app.post("/transactions", async (req, res) => {
    const transactions = db.getTransactions();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(transactions);
  });

  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

main();
