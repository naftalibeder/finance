import mocha from "mocha";
import { randomUUID } from "crypto";
import { Account, BankCreds } from "shared";
import { runAccount } from "./extractor.js";

const { describe, it } = mocha;

describe("extract account value and transactions", () => {
  it("extract", async () => {
    const account: Account = {
      _id: randomUUID(),
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
      bankId: "test-bank",
      bankHasCreds: true,
      display: "Test Account",
      number: "1111-2222-3333-4444",
      type: "liabilities",
      kind: "credit",
      preferredMfaOption: "sms",
      price: { amount: 0, currency: "USD" },
    };

    const bankCreds: BankCreds = {
      username: "TODO",
      password: "TODO",
    };

    try {
      await runAccount(account, bankCreds, {
        onStatusChange: (extraction) => {
          console.log({ extraction });
        },
        onReceiveAccountValue: (price) => {
          console.log({ price });
        },
        onReceiveTransactions: (transactions) => {
          console.log({ transactions });
        },
        onNeedMfaCode: () => {
          console.log({ needMfaCode: true });
        },
        onMfaUpdate: (mfaUpdate) => {
          console.log({ mfaUpdate });
        },
        onMfaFinish: () => {
          console.log({ mfaFinish: true });
        },
        onInfo: (msg: string, ...a: string[]) => {
          console.log(`${account.display} | ${account.bankId} | ${msg} ${a}`);
        },
      });
    } catch (e) {
      throw new Error(`${e}`);
    }
  }).timeout(0);
});
