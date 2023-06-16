import express from "express";
import bcrypt from "bcrypt";
import extractor from "./extractor";
import db from "./db";
import {
  CreateAccountApiPayload,
  ExtractApiArgs,
  GetAccountsApiPayload,
  GetTransactionsApiArgs,
  GetTransactionsApiPayload,
  SignInApiArgs,
  SignInApiPayload,
  UpdateAccountApiArgs,
  UpdateAccountApiPayload,
  VerifyTokenApiArgs,
} from "shared";

const main = async () => {
  const port = process.env.SERVER_PORT;

  const app = express();
  app.use(express.urlencoded({ extended: true }));

  app.post("/signIn", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const args = req.body as SignInApiArgs;
    const { email, password } = args;

    const userCreds = db.getUserCreds();
    const isValid =
      email === userCreds.email && password === userCreds.password;
    if (!isValid) {
      res.status(401).send({ error: "Unauthorized" });
      return;
    }

    // TODO: Generate a JWT instead.
    const token = await bcrypt.hash(password, 10);
    db.setUserToken(token);

    const payload: SignInApiPayload = { token };
    res.status(200).send(payload);
  });

  app.post("/verifyToken", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const args = req.body as VerifyTokenApiArgs;
    const { token } = args;

    const userCreds = db.getUserCreds();
    const isValid = token === userCreds.token;
    if (!isValid) {
      res.status(401).send({ error: "Unauthorized" });
      return;
    }

    res.status(200).send({ message: "ok" });
  });

  app.post("/extract", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const args = req.body as ExtractApiArgs;
    const { accountIds } = args;
    await extractor.runAccounts(accountIds);

    res.status(200).send({ message: "ok" });
  });

  app.post("/accounts", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const data = db.getAccounts();

    const payload: GetAccountsApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/accounts/create", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const data = db.createAccount();

    const payload: CreateAccountApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/accounts/update", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const args = req.body as UpdateAccountApiArgs;
    const account = args;
    const data = db.updateAccount(account._id, account);

    const payload: UpdateAccountApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/transactions", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const args = req.body as GetTransactionsApiArgs;
    const { query } = args;
    const data = db.getTransactions(query);

    const payload: GetTransactionsApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/status", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const status = db.getExtractionStatus();
    res.send(status);
  });

  app.post("/mfa", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const args = req.body as { bankId: string; code: string };
    const { bankId, code } = args;
    db.setMfaInfo(bankId, code);

    res.status(200).send({ message: "ok" });
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
