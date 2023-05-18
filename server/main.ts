import express from "express";
import { ProgressUpdate } from "shared";
import extractor from "./extractor";
import db from "./db";

const main = async () => {
  const port = process.env.SERVER_PORT;

  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.post("/extract", async (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Access-Control-Allow-Origin", "*");

    await extractor.runAllExtractors((chunk: ProgressUpdate) => {
      const chunkStr = JSON.stringify(chunk);
      res.write(chunkStr);
    });
    res.end();
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

  app.get("/mfa", async (req, res) => {
    const infos = db.getMfaInfos();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(infos);
  });

  app.post("/mfa", async (req, res) => {
    const { bankId, code } = req.body;
    console.log("Received code:", code);
    db.setMfaInfo(bankId, code);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send("ok");
  });

  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

main();
