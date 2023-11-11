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
import { extractAllPending } from "./extractor.js";

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
    const { query, page } = args;
    const payload: GetTransactionsApiPayload = await db.getTransactions(
      query,
      page
    );

    res.status(200).send(payload);
  });

  app.post("/extractAll", async (req, res) => {
    const accounts = await db.getAccounts();
    for (const account of accounts) {
      db.addExtractionPending(account._id);
    }

    try {
      extractAllPending();
    } catch (e) {
      console.log(`Error extracting account: ${e}`);
      res.status(401).send({ error: e });
    }

    res.status(200).send({ message: "ok" });
  });

  app.post("/extract", async (req, res) => {
    try {
      extractAllPending();
    } catch (e) {
      console.log(`Error extracting account: ${e}`);
      res.status(401).send({ error: e });
    }

    res.status(200).send({ message: "ok" });
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
