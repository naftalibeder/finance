import express from "express";
import got from "got";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
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
  GetExtractorBanksApiPayload,
  User,
  GetUserApiPayload,
  DeleteBankCredsApiArgs,
} from "shared";
import db from "./db.js";
import { accountsSumPrice } from "./utils/math.js";
import { Device } from "./types.js";

const app = express();
const port = process.env.SERVER_PORT;

const start = async () => {
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  app.post("/user", async (req, res) => {
    let user: User | undefined;
    try {
      user = await db.getUser();
    } catch (e) {
      res.status(400).send({ error: "User not found" });
      return;
    }

    const payload: GetUserApiPayload = {
      data: {
        user,
      },
    };
    res.status(200).send(payload);
  });

  app.post("/signIn", async (req, res) => {
    const args = req.body as SignInApiArgs;
    const { email, password } = args;

    if (email === "") {
      res.status(400).send({ error: "Missing email" });
      return;
    }

    if (password === "") {
      res.status(400).send({ error: "Missing password" });
      return;
    }

    let user: User | undefined;
    try {
      user = await db.getUser();
    } catch (e) {
      console.log("No existing user found; creating new user");
    }

    if (!user) {
      try {
        await db.addUser({ email, password });
      } catch (e) {
        res.status(401).send({ error: "Failed to create new user" });
        return;
      }
    } else {
      const emailMatches = email === user.email;
      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!emailMatches || !passwordMatches) {
        res.status(401).send({ error: "Invalid email or password" });
        return;
      }
    }

    process.env.USER_PASSWORD = password;

    let device: Device;
    try {
      device = await db.addDevice(password);
    } catch (e) {
      res.status(401).send({ error: "Failed to register device" });
      return;
    }

    const payload: SignInApiPayload = {
      deviceId: device._id,
      token: device.token,
    };
    res.status(200).send(payload);
  });

  app.post("/verifyDevice", async (req, res) => {
    const args = req.body as VerifyDeviceApiArgs;
    const { deviceId, token } = args;

    if (!process.env.USER_PASSWORD) {
      res.status(401).send({ error: "No password stored in memory" });
      return;
    }

    try {
      const device = await db.getDevice(deviceId);
      const isValid = device && token === device.token;
      if (!isValid) {
        throw "Token does not match one in database";
      }
    } catch (e) {
      res.status(401).send({ error: "Invalid token" });
      return;
    }

    res.status(200).send({ message: "ok" });
  });

  app.post("/banks", async (req, res) => {
    let banks: Bank[];
    try {
      const url = `${process.env.EXTRACTOR_URL_LOCALHOST}/banks`;
      const res = await got.post(url).json<GetExtractorBanksApiPayload>();
      banks = res.data.banks;
    } catch (e) {
      console.log("Error getting banks:", e);
      res.status(501).send(e);
      return;
    }

    const credsMap = await db.getBankCredsMap(process.env.USER_PASSWORD);
    const credsExistMap: Record<string, boolean> = {};
    for (const [bankId, creds] of Object.entries(credsMap)) {
      const { username, password } = creds;
      credsExistMap[bankId] = username.length > 0 && password.length > 0;
    }

    const payload: GetBanksApiPayload = {
      data: {
        banks,
        credsExistMap,
      },
    };
    res.status(200).send(payload);
  });

  app.post("/banks/updateCredentials", async (req, res) => {
    try {
      const args = req.body as UpdateBankCredsApiArgs;
      const { bankId, username, password } = args;

      await db.setBankCreds(
        bankId,
        { username, password },
        process.env.USER_PASSWORD
      );
    } catch (e) {
      console.log("Error updating bank credentials:", e);
      res.status(501).send(e);
      return;
    }

    res.status(200).send({ message: "ok" });
  });

  app.post("/banks/deleteCredentials", async (req, res) => {
    try {
      const args = req.body as DeleteBankCredsApiArgs;
      const { bankId } = args;

      await db.deleteBankCreds(bankId, process.env.USER_PASSWORD);
    } catch (e) {
      console.log("Error deleting bank credentials:", e);
      res.status(501).send(e);
      return;
    }

    res.status(200).send({ message: "ok" });
  });

  app.post("/accounts", async (req, res) => {
    const accounts = await db.getAccounts();
    const sum = accountsSumPrice(accounts);

    const payload: GetAccountsApiPayload = { data: { accounts, sum } };
    res.status(200).send(payload);
  });

  app.post("/accounts/create", async (req, res) => {
    const account = await db.addAccount();

    const payload: CreateAccountApiPayload = { data: { account } };
    res.status(200).send(payload);
  });

  app.post("/accounts/update", async (req, res) => {
    const args = req.body as UpdateAccountApiArgs;
    const { account } = args;
    const updated = await db.updateAccount(account._id, account);

    const payload: UpdateAccountApiPayload = { data: { account: updated } };
    res.status(200).send(payload);
  });

  app.post("/accounts/delete", async (req, res) => {
    const args = req.body as DeleteAccountApiArgs;
    const { accountId } = args;
    await db.deleteAccount(accountId);

    res.status(200).send({ message: "ok" });
  });

  app.post("/transactions", async (req, res) => {
    const args = req.body as GetTransactionsApiArgs;
    const { query, pagination } = args;
    const data = await db.getTransactions(
      query,
      pagination.start,
      pagination.limit
    );

    const payload: GetTransactionsApiPayload = { data };
    res.status(200).send(payload);
  });

  app.post("/extract", async (req, res) => {
    const pendingExtractions = await db.getExtractionsPending();
    if (pendingExtractions.length === 0) {
      res.status(401).send({ error: "No pending extractions found" });
      return;
    }

    res.status(200).send({ message: "ok" });

    for (const pendingExtraction of pendingExtractions) {
      const promise = new Promise<void>(async (res, rej) => {
        const extractionId = pendingExtraction._id;
        const accountId = pendingExtraction.accountId;
        const account = await db.getAccount(accountId);
        if (!account) {
          rej(`No account found with id ${accountId}`);
          return;
        }

        console.log(`Starting extraction for account ${account.display}`);

        await db.updateExtraction(extractionId, {
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const bankCreds = await db.getBankCreds(
          account.bankId,
          process.env.USER_PASSWORD
        );
        const args: ExtractApiArgs = {
          account,
          bankCreds,
        };

        const url = `${process.env.EXTRACTOR_URL_LOCALHOST}/extract`;
        const stream = got.stream(url, { method: "POST", json: args });

        const decoder = new TextDecoder("utf8");
        let buffer = "";
        stream.on("data", async (d) => {
          let chunk: ExtractApiPayloadChunk;
          try {
            buffer += decoder.decode(d);
            chunk = JSON.parse(buffer);
            buffer = "";
            console.log("Received chunk:", Object.keys(chunk));
          } catch (e) {
            console.log("Error decoding progress chunk from extractor");
            return;
          }

          if (chunk.extraction) {
            console.log(
              "Received extraction update:",
              Object.keys(chunk.extraction)
            );
            try {
              await db.updateExtraction(extractionId, chunk.extraction);
            } catch (e) {
              console.log(`Error updating extraction: ${e}`);
            }
          }

          if (chunk.price) {
            console.log("Received account update:", Object.keys(chunk.price));
            await db.updateAccount(account._id, {
              ...account,
              price: chunk.price,
            });
            await db.updateExtraction(extractionId, {
              updatedAt: new Date().toISOString(),
            });
          }

          if (chunk.transactions) {
            const foundCt = chunk.transactions.length;
            const addCt = await db.addTransactions(chunk.transactions);
            console.log(
              `Received transactions update: ${foundCt} total, ${addCt} new`
            );
            const extraction = await db.getExtraction(extractionId);
            await db.updateExtraction(extractionId, {
              foundCt: (extraction?.foundCt ?? 0) + foundCt,
              addCt: (extraction?.addCt ?? 0) + addCt,
              updatedAt: new Date().toISOString(),
            });
          }

          if (chunk.needMfaCode) {
            await db.setMfaInfo({ bankId: account.bankId });
          }

          if (chunk.mfaFinish) {
            await db.deleteMfaInfo(account.bankId);
          }
        });
        stream.on("end", async () => {
          console.log("Extraction ended");
          await db.updateExtraction(extractionId, {
            finishedAt: new Date().toISOString(),
          });
          res();
        });
        stream.on("close", async () => {
          console.log("Extraction closed");
          await db.abortAllUnfinishedExtractions();
          stream.destroy();
          rej("Extraction closed");
        });
        stream.on("error", async (e) => {
          console.log("Extraction error:", e);
          await db.abortAllUnfinishedExtractions();
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
    const extractions = await db.getExtractions();
    const payload: GetExtractionsApiPayload = { data: { extractions } };
    res.status(200).send(payload);
  });

  app.post("/extractions/unfinished", async (req, res) => {
    const payload: GetExtractionsUnfinishedApiPayload = {
      data: {
        extractions: [],
      },
    };

    const unfinishedExtractions = await db.getExtractionsUnfinished();
    payload.data.extractions = unfinishedExtractions;

    res.status(200).send(payload);
  });

  app.post("/extractions/add", async (req, res) => {
    const args = req.body as AddExtractionsApiArgs;
    for (const accountId of args.accountIds) {
      await db.addExtractionPending(accountId);
    }
    res.status(200).send({ message: "ok" });
  });

  app.post("/mfa/current", async (req, res) => {
    const payload: GetMfaInfoApiPayload = {
      data: {
        mfaInfos: [],
      },
    };

    const mfaInfos = await db.getMfaInfos();
    payload.data.mfaInfos = mfaInfos;

    res.status(200).send(payload);
  });

  app.post("/mfa/code", async (req, res) => {
    const args = req.body as { bankId: string; code: string };
    const { bankId, code } = args;
    await db.setMfaInfo({ bankId, code });

    res.status(200).send({ message: "ok" });
  });
};

const stop = async () => {
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
