import express from "express";
import extractor from "./extractor";
import db from "./db";
import {
  CreateAccountApiPayload,
  ExtractApiArgs,
  GetAccountsApiPayload,
  GetTransactionsApiArgs,
  GetTransactionsApiPayload,
  UpdateAccountApiArgs,
  UpdateAccountApiPayload,
} from "shared";

const main = async () => {
  const port = process.env.SERVER_PORT;

  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.post("/extract", async (req, res) => {
    const args = req.body as ExtractApiArgs;
    const { accountIds } = args;
    await extractor.runAccounts(accountIds);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send("ok");
  });

  app.post("/accounts", async (req, res) => {
    const data = db.getAccounts();
    res.setHeader("Access-Control-Allow-Origin", "*");
    const payload: GetAccountsApiPayload = { data };
    res.send(payload);
  });

  app.post("/accounts/create", async (req, res) => {
    const data = db.createAccount();
    res.setHeader("Access-Control-Allow-Origin", "*");
    const payload: CreateAccountApiPayload = { data };
    res.send(payload);
  });

  app.post("/accounts/update", async (req, res) => {
    const args = req.body as UpdateAccountApiArgs;
    const account = args;
    const data = db.updateAccount(account._id, account);
    res.setHeader("Access-Control-Allow-Origin", "*");
    const payload: UpdateAccountApiPayload = { data };
    res.send(payload);
  });

  app.post("/transactions", async (req, res) => {
    const args = req.body as GetTransactionsApiArgs;
    const { query } = args;
    const data = db.getTransactions(query);
    res.setHeader("Access-Control-Allow-Origin", "*");
    const payload: GetTransactionsApiPayload = { data };
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
