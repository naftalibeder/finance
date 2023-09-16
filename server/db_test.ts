import os from "os";
import fs from "fs";
import path from "path";
import mocha from "mocha";
import db from "./db.js";

const USER_EMAIL = "test@example.com";
const USER_PASSWORD = "userPassword123";

const BANK_ID = "test-bank";
const BANK_USERNAME = "user123";
const BANK_PASSWORD = "bankPassword123";

const { describe, it, setup, teardown } = mocha;

describe("database", () => {
  let dbPath = "";

  setup(async () => {
    dbPath = path.join(os.tmpdir(), "db.sql");
    await db.connect(dbPath);
  });

  teardown(() => {
    fs.rmSync(dbPath);
  });

  it("accounts", async () => {
    let account1 = await db.addAccount();
    account1 = await db.updateAccount(account1._id, {
      display: "Acme Checking",
      price: { amount: 123.45, currency: "USD" },
    });
    const account2 = await db.getAccount(account1._id);
    if (account1.display !== account2.display) {
      throw new Error(
        `Account display names do not match; expected '${account1.display}', got '${account2.display}'`
      );
    }
  });

  it("transactions", async () => {
    const now = new Date().toISOString();

    let account = await db.addAccount();
    const addCt = await db.addTransactions(
      Array(5)
        .fill(0)
        .map((_, i) => {
          return {
            _createdAt: now,
            _updatedAt: now,
            date: now,
            postDate: now,
            accountId: account._id,
            payee: "Acme Corp",
            price: { amount: i * 10, currency: "USD" },
            type: "Sale",
            description: "",
          };
        })
    );
    if (addCt !== 5) {
      throw new Error(
        `Account display names do not match; expected 5, got ${addCt}`
      );
    }

    const addCt2 = await db.addTransactions([
      {
        _createdAt: now,
        _updatedAt: now,
        date: now,
        postDate: now,
        accountId: account._id,
        payee: "Acme Corp",
        price: { amount: 20, currency: "USD" },
        type: "Sale",
        description: "",
      },
    ]);
    if (addCt2 !== 0) {
      throw new Error(
        `Account display names do not match; expected 0, got ${addCt2}`
      );
    }
  });

  it("extractions", async () => {
    let account = await db.addAccount();
    let extraction = await db.addExtractionPending(account._id);
    if (extraction.accountId !== account._id) {
      throw new Error(
        `Invalid extraction account id; expected ${account._id}, got ${extraction.accountId}`
      );
    }

    const extractions = await db.getExtractions();
    extraction = extractions[0];
    if (!extraction || extraction._id !== extraction._id) {
      throw new Error(`Invalid extraction`);
    }

    extraction = await db.updateExtraction(extraction._id, {
      startedAt: new Date().toISOString(),
    });
    let unfinished = await db.getExtractionsUnfinished();
    if (unfinished.length !== 1) {
      throw new Error(
        `Invalid finished extractions count; expected 1, got ${unfinished.length}`
      );
    }

    extraction = await db.updateExtraction(extraction._id, {
      finishedAt: new Date().toISOString(),
    });
    unfinished = await db.getExtractionsUnfinished();
    if (unfinished.length !== 0) {
      throw new Error(
        `Invalid finished extractions count; expected 0, got ${unfinished.length}`
      );
    }
  });

  it("mfa", async () => {
    const info1 = await db.setMfaInfo({ bankId: BANK_ID, code: "ABCDEF" });
    const info2 = await db.getMfaInfo(info1.bankId);
    if (info2.bankId !== BANK_ID) {
      throw new Error(
        `Invalid mfa info bank id; expected 'test-bank', got '${info2.bankId}'`
      );
    }
  });

  it("user", async () => {
    const user1 = await db.addUser({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
    const user2 = await db.getUser();
    if (user1.email !== user2.email) {
      throw new Error(
        `Invalid user email; expected '${user1.email}', got '${user2.email}'`
      );
    }

    await db.setBankCreds(
      BANK_ID,
      {
        username: BANK_USERNAME,
        password: BANK_PASSWORD,
      },
      USER_PASSWORD
    );
    const bankCreds = await db.getBankCreds(BANK_ID, USER_PASSWORD);
    const bankCredsPassword = bankCreds.password;
    if (bankCredsPassword !== BANK_PASSWORD) {
      throw new Error(
        `Invalid credentials password; expected '${BANK_PASSWORD}', got '${bankCredsPassword}'`
      );
    }
  });
});
