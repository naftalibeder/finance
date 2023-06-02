import express from "express";
import extractor from "./extractor";
import db from "./db";

const main = async () => {
  const port = process.env.SERVER_PORT;

  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.post("/extract", async (req, res) => {
    await extractor.runExtractors();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send("ok");
  });

  app.post("/accounts", async (req, res) => {
    const { accounts } = db.getAccounts();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send({ accounts });
  });

  app.post("/transactions", async (req, res) => {
    const { query } = req.body;
    const payload = db.getTransactions({ query });
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(payload);
  });

  app.post("/status", async (req, res) => {
    const status = db.getExtractionStatus();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(status);
  });

  app.post("/mfa", async (req, res) => {
    const { bankId, code } = req.body;
    console.log("Received code:", code);
    db.setMfaInfo(bankId, code);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send("ok");
  });

  process.on("SIGINT", () => {
    db.clearExtractionStatus();
    server.close();
  });

  const server = app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

main();
