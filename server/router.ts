import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import extractor from "./extractor";
import db from "./db";
import {
  CreateAccountApiPayload,
  ExtractApiArgs,
  GetAccountsApiPayload,
  GetBanksApiPayload,
  GetTransactionsApiArgs,
  GetTransactionsApiPayload,
  UpdateBankCredsApiArgs,
  SignInApiArgs,
  SignInApiPayload,
  UpdateAccountApiArgs,
  UpdateAccountApiPayload,
  VerifyDeviceApiArgs,
  DeleteAccountApiArgs,
  GetExtractionsApiPayload,
  GetExtractionStatusApiPayload,
} from "shared";
import env from "./env";
import { randomUUID } from "crypto";

const start = async () => {
  const port = env.get("SERVER_PORT");

  const app = express();
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  app.post("/signIn", async (req, res) => {
    const args = req.body as SignInApiArgs;
    const { email, password } = args;
    const saltRounds = 10;

    if (email === "") {
      res.status(400).send({ error: "Missing email" });
      return;
    }
    if (password === "") {
      res.status(400).send({ error: "Missing password" });
      return;
    }

    const userCreds = db.getUser();
    if (userCreds.email === "") {
      const hash = await bcrypt.hash(password, saltRounds);
      db.setUser({ email: email, password: hash, devices: {} });
    } else {
      const emailMatches = email === userCreds.email;
      const passwordMatches = await bcrypt.compare(
        password,
        userCreds.password
      );
      if (!emailMatches || !passwordMatches) {
        res.status(401).send({ error: "Invalid email or password" });
        return;
      }
    }

    const name = randomUUID();
    const token = await bcrypt.hash(password, saltRounds);
    db.setDevice(name, token);
    env.set("USER_PASSWORD", password);

    const payload: SignInApiPayload = { name, token };
    res.status(200).send(payload);
  });

  app.post("/verifyDevice", async (req, res) => {
    const args = req.body as VerifyDeviceApiArgs;
    const { name, token } = args;

    const userPassword = env.get("USER_PASSWORD");
    if (!userPassword) {
      res.status(401).send({ error: "No password stored in memory" });
      return;
    }

    const userCreds = db.getUser();
    const storedDevice = userCreds.devices[name];
    const isValid = storedDevice && token === storedDevice.token;
    if (!isValid) {
      res.status(401).send({ error: "Invalid token" });
      return;
    }

    res.status(200).send({ message: "ok" });
  });

  app.post("/extract", async (req, res) => {
    const args = req.body as ExtractApiArgs;
    const { accountIds } = args;
    extractor.runAccounts(accountIds, () => {
      res.status(200).send({ message: "ok" });
    });
  });

  app.post("/banks", async (req, res) => {
    const data = extractor.getBanks();

    const payload: GetBanksApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/banks/updateCredentials", async (req, res) => {
    try {
      const args = req.body as UpdateBankCredsApiArgs;
      const { bankId, username, password } = args;

      db.setBankCreds(bankId, { username, password });
    } catch (e) {
      console.log("Error updating bank credentials:", e);
      res.status(501).send(e);
      return;
    }

    res.status(200).send({ message: "ok" });
  });

  app.post("/accounts", async (req, res) => {
    const data = db.getAccounts();

    const payload: GetAccountsApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/accounts/create", async (req, res) => {
    const data = db.createAccount();

    const payload: CreateAccountApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/accounts/update", async (req, res) => {
    const args = req.body as UpdateAccountApiArgs;
    const { account } = args;
    const data = db.updateAccount(account._id, account);

    const payload: UpdateAccountApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/accounts/delete", async (req, res) => {
    const args = req.body as DeleteAccountApiArgs;
    const { accountId } = args;
    const data = db.deleteAccount(accountId);

    res.status(200).send({ message: "ok" });
  });

  app.post("/transactions", async (req, res) => {
    const args = req.body as GetTransactionsApiArgs;
    const { query } = args;
    const data = db.getTransactions(query);

    const payload: GetTransactionsApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/extractions", async (req, res) => {
    const extractions = db.getExtractions();
    const payload: GetExtractionsApiPayload = { data: { extractions } };
    res.send(payload);
  });

  app.post("/status", async (req, res) => {
    const extractions = db.getExtractions();
    const extraction = extractions[extractions.length - 1];
    if (!extraction || extraction.finishedAt) {
      const payload: GetExtractionStatusApiPayload = {
        data: {
          extraction: undefined,
          mfaInfos: [],
        },
      };
      res.send(payload);
      return;
    }

    const mfaInfos = db.getMfaInfos();
    const payload: GetExtractionStatusApiPayload = {
      data: {
        extraction,
        mfaInfos,
      },
    };
    res.send(payload);
  });

  app.post("/mfa/option", async (req, res) => {
    const args = req.body as { bankId: string; option: number };
    const { bankId, option } = args;
    db.setMfaInfo({ bankId, option });

    res.status(200).send({ message: "ok" });
  });

  app.post("/mfa", async (req, res) => {
    const args = req.body as { bankId: string; code: string };
    const { bankId, code } = args;
    db.setMfaInfo({ bankId, code });

    res.status(200).send({ message: "ok" });
  });

  const stop = () => {
    db.closeExtraction();
    server.close();
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  db.closeExtraction();

  const server = app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

start();
