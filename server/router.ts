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
  GetExtractionsUnfinishedApiPayload,
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

    res.status(200).send({ message: "ok" });

    for (const pendingExtraction of pendingExtractions) {
      const promise = new Promise<void>((res, rej) => {
        const extractionId = pendingExtraction._id;
        const accountId = pendingExtraction.accountId;
        const account = db.getAccount(accountId);
        if (!account) {
          rej(`No account found with id ${accountId}`);
          return;
        }

        console.log(`Starting extraction for account ${account.display}`);

        db.updateExtraction(extractionId, {
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const bankCredsMap = db.getBankCredsMap();
        const bankCreds = bankCredsMap[account.bankId];
        const args: ExtractApiArgs = {
          account,
          bankCreds,
        };

        const url = `${process.env.EXTRACTOR_URL_LOCALHOST}/extract`;
        const stream = got.stream(url, { method: "POST", json: args });

        const decoder = new TextDecoder("utf8");
        let buffer = "";
        stream.on("data", (d) => {
          let chunk: ExtractApiPayloadChunk;
          try {
            buffer += decoder.decode(d);
            chunk = JSON.parse(buffer);
            buffer = "";
          } catch (e) {
            console.log("Error decoding progress chunk from extractor");
            return;
          }

          if (chunk.extraction) {
            console.log(
              "Received extraction update:",
              Object.keys(chunk.extraction)
            );
            db.updateExtraction(extractionId, chunk.extraction);
          }

          if (chunk.price) {
            console.log("Received account update:", Object.keys(chunk.price));
            db.updateAccount(account._id, {
              ...account,
              price: chunk.price,
            });
            db.updateExtraction(extractionId, {
              updatedAt: new Date().toISOString(),
            });
          }

          if (chunk.transactions) {
            const foundCt = chunk.transactions.length;
            const addCt = db.addTransactions(chunk.transactions);
            console.log(
              `Received transactions update: ${foundCt} total, ${addCt} new`
            );
            const extraction = db.getExtraction(extractionId);
            db.updateExtraction(extractionId, {
              foundCt: (extraction?.foundCt ?? 0) + foundCt,
              addCt: (extraction?.addCt ?? 0) + addCt,
              updatedAt: new Date().toISOString(),
            });
          }

          if (chunk.needMfaCode) {
            db.setMfaInfo({ bankId: account.bankId });
          }

          if (chunk.mfaFinish) {
            db.deleteMfaInfo(account.bankId);
          }
        });
        stream.on("end", () => {
          console.log("Extraction ended");
          db.updateExtraction(extractionId, {
            finishedAt: new Date().toISOString(),
          });
          res();
        });
        stream.on("close", () => {
          console.log("Extraction closed");
          db.abortAllUnfinishedExtractions();
          stream.destroy();
          rej("Extraction closed");
        });
        stream.on("error", (e) => {
          console.log("Extraction error:", e);
          db.abortAllUnfinishedExtractions();
          stream.destroy();
          rej("Extraction closed");
        });
      });

      try {
        await promise;
      } catch (e) {
        console.log(`Unrecoverable error extracting account: ${e}`);
        return;
      }
    }
  });

  app.post("/extractions", async (req, res) => {
    const extractions = db.getExtractions();
    const payload: GetExtractionsApiPayload = { data: { extractions } };
    res.status(200).send(payload);
  });

  app.post("/extractions/unfinished", async (req, res) => {
    const payload: GetExtractionsUnfinishedApiPayload = {
      data: {
        extractions: [],
      },
    };

    const unfinishedExtractions = db.getExtractionsUnfinished();
    payload.data.extractions = unfinishedExtractions;

    res.status(200).send(payload);
  });

  app.post("/extractions/add", async (req, res) => {
    const args = req.body as AddExtractionsApiArgs;
    for (const accountId of args.accountIds) {
      db.addExtractionPending(accountId);
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
  db.abortAllUnfinishedExtractions();
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
