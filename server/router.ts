import express from "express";
import got from "got";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import {
  CreateAccountApiPayload,
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
  GetExtractionsInProgressApiPayload,
  AddExtractionsApiArgs,
  GetMfaInfoApiPayload,
  ExtractApiArgs,
  ExtractApiPayloadChunk,
  Bank,
} from "shared";
import db from "./db.js";

const app = express();
const port = process.env.SERVER_PORT;

const start = () => {
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
      db.setUser({
        email: email,
        password: hash,
        devices: {},
      });
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
    process.env.USER_PASSWORD = password;

    const payload: SignInApiPayload = { name, token };
    res.status(200).send(payload);
  });

  app.post("/verifyDevice", async (req, res) => {
    const args = req.body as VerifyDeviceApiArgs;
    const { name, token } = args;

    const userPassword = process.env.USER_PASSWORD;
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

  app.post("/banks", async (req, res) => {
    let banks: Bank[];
    try {
      const url = `${process.env.EXTRACTOR_URL_LOCALHOST}/banks`;
      const res = await got.post(url).json<GetBanksApiPayload>();
      banks = res.data.banks;
    } catch (e) {
      console.log("Error getting banks:", e);
      res.status(501).send(e);
      return;
    }

    const payload: GetBanksApiPayload = { data: { banks } };
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

  app.post("/extract", async (req, res) => {
    const pendingExtractions = db.getExtractionsPending();
    if (pendingExtractions.length === 0) {
      res.status(401).send({ error: "No pending extractions found" });
      return;
    }

    const accountId = pendingExtractions[0].accountId;
    const account = db.getAccount(accountId);
    if (!account) {
      res.status(401).send({ error: `No account found with id ${accountId}` });
      return;
    }

    const bankCredsMap = db.getBankCredsMap();
    const bankCreds = bankCredsMap[account.bankId];
    const args: ExtractApiArgs = {
      account,
      bankCreds,
    };

    try {
      const url = `${process.env.EXTRACTOR_URL_LOCALHOST}/extract`;
      const stream = got.stream(url, { method: "POST", json: args });

      const decoder = new TextDecoder("utf8");
      stream.on("data", (data) => {
        const str = decoder.decode(data);
        const chunk = JSON.parse(str) as ExtractApiPayloadChunk;
        console.log("Received extraction chunk:", chunk);

        if (chunk.extraction) {
          db.updateExtractionInProgress(account._id, chunk.extraction);
        } else if (chunk.price) {
          db.updateAccount(account._id, { ...account, price: chunk.price });
        } else if (chunk.transactions) {
          db.addTransactions(chunk.transactions);
        } else {
          // TODO: mfa, etc.
        }
      });
      stream.on("end", () => {
        console.log("Extraction complete");
      });
      stream.on("close", () => {
        console.log("Extraction closed");
        stream.destroy();
      });
      stream.on("error", (e) => {
        console.log("Extraction error:", e);
        stream.destroy();
      });
    } catch (e) {
      console.log(`Error extracting ${account.display}`);
      res.status(401).send({ error: `Error extracting ${account.display}` });
      return;
    }

    res.status(200);
  });

  app.post("/extractions", async (req, res) => {
    const extractions = db.getExtractions();
    const payload: GetExtractionsApiPayload = { data: { extractions } };
    res.status(200).send(payload);
  });

  app.post("/extractions/current", async (req, res) => {
    const payload: GetExtractionsInProgressApiPayload = {
      data: {
        extractions: [],
      },
    };

    const accounts = db.getAccounts();
    for (const account of accounts.accounts) {
      const extraction = db.getExtractionInProgress(account._id);
      if (extraction) {
        payload.data.extractions.push(extraction);
      }
    }
  });

  app.post("/extractions/add", async (req, res) => {
    const args = req.body as AddExtractionsApiArgs;
    for (const accountId of args.accountIds) {
      db.getOrCreateExtractionInProgress(accountId);
    }
    res.status(200).send({ message: "ok" });
  });

  app.post("/mfa/current", async (req, res) => {
    const payload: GetMfaInfoApiPayload = {
      data: {
        mfaInfos: [],
      },
    };

    const mfaInfos = db.getMfaInfos();
    payload.data.mfaInfos = mfaInfos;

    res.status(200).send(payload);
  });

  app.post("/mfa/code", async (req, res) => {
    const args = req.body as { bankId: string; code: string };
    const { bankId, code } = args;
    db.setMfaInfo({ bankId, code });

    res.status(200).send({ message: "ok" });
  });
};

const stop = () => {
  const accounts = db.getAccounts();
  for (const account of accounts.accounts) {
    db.closeExtractionInProgress(account._id);
  }

  console.log("Stopping server");
  server.close();
  console.log("Server stopped");
};

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

export default {
  start,
  stop,
};
